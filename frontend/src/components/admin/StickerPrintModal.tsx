import { useEffect, useRef, useState } from 'react';
import apiClient from '@/services/api';
import { FaPrint, FaTimes, FaSpinner } from 'react-icons/fa';

interface PrinterSetting {
  companyName?: string | null;
  companyPhone?: string | null;
  companyLogoUrl?: string | null;
  showLogo?: boolean;
  showBarcode?: boolean;
  stickerWidth?: number;
  stickerHeight?: number;
}

interface StickerOrder {
  id: number;
  salesOrderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  shippingAddress: string | null;
  isPacked: boolean;
  totalAmount: number;
  courierCompany: string | null;
  courierOrderId: string | null;
  trackingId: string | null;
}

interface StickerItem {
  productName: string;
  quantity: number;
}

interface StickerData {
  type: string;
  order: StickerOrder;
  items: StickerItem[];
  itemCount: number;
  totalQuantity: number;
  error?: boolean;
  orderId?: number;
  message?: string;
}

interface StickerPrintModalProps {
  orderIds: number[];
  onClose: () => void;
}

export default function StickerPrintModal({ orderIds, onClose }: StickerPrintModalProps) {
  const [stickers, setStickers] = useState<StickerData[]>([]);
  const [printerSettings, setPrinterSettings] = useState<PrinterSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const settingsRes = await apiClient.get('/printer-settings/default');
        setPrinterSettings(settingsRes.data);
      } catch {
        setPrinterSettings({
          companyName: 'TrustCart',
          showLogo: false,
          showBarcode: true,
          stickerWidth: 51,
          stickerHeight: 102,
        });
      }

      try {
        if (orderIds.length === 1) {
          const res = await apiClient.post(`/order-management/${orderIds[0]}/print/sticker`);
          setStickers([res.data]);
        } else {
          const res = await apiClient.post('/order-management/bulk-print/sticker', { orderIds });
          setStickers(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        setStickers([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orderIds]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const sW = printerSettings?.stickerWidth || 51;
    const sH = printerSettings?.stickerHeight || 102;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sticker Print</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; }
          .sticker-page {
            width: ${sW}mm;
            height: ${sH}mm;
            padding: 3mm;
            page-break-after: always;
            margin: 0 auto;
            border: 1px dashed #ccc;
            overflow: hidden;
            position: relative;
          }
          .sticker-page:last-child { page-break-after: auto; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-lg { font-size: 14px; }
          .text-sm { font-size: 10px; }
          .text-xs { font-size: 9px; }
          .mt-1 { margin-top: 2px; }
          .mt-2 { margin-top: 4px; }
          .mb-1 { margin-bottom: 2px; }
          .mb-2 { margin-bottom: 4px; }
          .border-t { border-top: 1px solid #000; }
          .border-b { border-bottom: 1px solid #000; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .logo-img { max-width: 30mm; max-height: 10mm; display: block; margin: 0 auto 2px; }
          .packed-stamp {
            display: inline-block;
            padding: 1px 8px;
            border: 2px solid #000;
            font-weight: bold;
            font-size: 11px;
            letter-spacing: 1px;
          }
          .info-row { display: flex; justify-content: space-between; padding: 1px 0; }
          .info-label { font-weight: bold; font-size: 9px; }
          .info-value { font-size: 10px; }
          .address-box {
            border: 1px solid #000;
            padding: 2mm;
            margin-top: 2mm;
            font-size: 10px;
            min-height: 15mm;
          }
          .amount-box {
            border: 2px solid #000;
            padding: 2mm;
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-top: 2mm;
          }
          @media print {
            body { margin: 0; }
            .sticker-page { border: none; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const sW = printerSettings?.stickerWidth || 51;
  const sH = printerSettings?.stickerHeight || 102;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Sticker Preview ({orderIds.length} order{orderIds.length > 1 ? 's' : ''})
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={loading || stickers.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
            >
              <FaPrint /> Print Stickers
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FaSpinner className="animate-spin text-3xl text-green-600 mb-3" />
              <p className="text-gray-500">Loading sticker data...</p>
            </div>
          ) : stickers.length === 0 ? (
            <p className="text-center text-gray-500 py-16">No sticker data available</p>
          ) : (
            <div ref={printRef}>
              {stickers.map((st, idx) => {
                if (st.error) {
                  return (
                    <div key={idx} className="bg-white mb-4 p-4 shadow">
                      <p className="text-red-600">Error loading order #{st.orderId}: {st.message}</p>
                    </div>
                  );
                }

                const { order } = st;

                return (
                  <div
                    key={idx}
                    className="sticker-page bg-white mb-4 shadow"
                    style={{
                      width: `${sW}mm`,
                      minHeight: `${sH}mm`,
                      padding: '3mm',
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: '11px',
                      margin: '0 auto 16px',
                      border: '1px dashed #ccc',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Company Header */}
                    {printerSettings?.showLogo && printerSettings?.companyLogoUrl && (
                      <div className="text-center mb-1">
                        <img
                          src={printerSettings.companyLogoUrl}
                          alt="Logo"
                          style={{ maxWidth: '30mm', maxHeight: '10mm', margin: '0 auto' }}
                        />
                      </div>
                    )}

                    <div className="text-center font-bold text-lg mb-1">
                      {printerSettings?.companyName || 'TrustCart'}
                    </div>

                    {printerSettings?.companyPhone && (
                      <div className="text-center text-xs mb-1">Ph: {printerSettings.companyPhone}</div>
                    )}

                    <div style={{ borderTop: '2px solid #000', margin: '2mm 0' }} />

                    {/* Order Number - prominent */}
                    <div className="text-center font-bold text-lg mb-1">
                      {order.salesOrderNumber}
                    </div>

                    {/* Customer Info */}
                    <div style={{ fontSize: '10px' }}>
                      <div className="flex justify-between" style={{ padding: '1px 0' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '9px' }}>To:</span>
                        <span style={{ fontWeight: 'bold' }}>{order.customerName || '-'}</span>
                      </div>
                      <div className="flex justify-between" style={{ padding: '1px 0' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Ph:</span>
                        <span style={{ fontWeight: 'bold', fontSize: '11px' }}>{order.customerPhone || '-'}</span>
                      </div>
                    </div>

                    {/* Address Box */}
                    {order.shippingAddress && (
                      <div
                        style={{
                          border: '1px solid #000',
                          padding: '2mm',
                          marginTop: '2mm',
                          fontSize: '10px',
                          minHeight: '15mm',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '1px' }}>Delivery Address:</div>
                        {order.shippingAddress}
                      </div>
                    )}

                    {/* Amount Box */}
                    <div
                      style={{
                        border: '2px solid #000',
                        padding: '2mm',
                        textAlign: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        marginTop: '2mm',
                      }}
                    >
                      COD: ৳{Number(order.totalAmount).toFixed(2)}
                    </div>

                    {/* Items List */}
                    {st.items && st.items.length > 0 && (
                      <div style={{ marginTop: '2mm' }}>
                        <div style={{ borderTop: '1px solid #000', marginBottom: '1mm' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '1px' }}>Items:</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #000' }}>
                              <th style={{ textAlign: 'left', fontSize: '8px', padding: '1px 0' }}>Product</th>
                              <th style={{ textAlign: 'right', fontSize: '8px', padding: '1px 0', width: '30px' }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {st.items.map((item: any, i: number) => (
                              <tr key={i}>
                                <td style={{ fontSize: '9px', padding: '1px 0' }}>{item.productName}</td>
                                <td style={{ fontSize: '9px', padding: '1px 0', textAlign: 'right' }}>{item.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ fontSize: '8px', textAlign: 'right', marginTop: '1px', fontWeight: 'bold' }}>Total Qty: {st.totalQuantity}</div>
                      </div>
                    )}

                    {/* Courier Info */}
                    {(order.courierCompany || order.trackingId) && (
                      <>
                        <div style={{ borderTop: '1px solid #000', margin: '2mm 0' }} />
                        <div style={{ fontSize: '9px' }}>
                          {order.courierCompany && (
                            <div className="flex justify-between" style={{ padding: '1px 0' }}>
                              <span style={{ fontWeight: 'bold' }}>Courier:</span>
                              <span>{order.courierCompany}</span>
                            </div>
                          )}
                          {order.courierOrderId && (
                            <div className="text-center" style={{ border: '2px solid #000', padding: '3px 4px', marginTop: '2mm' }}>
                              <div style={{ fontSize: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>CONSIGNMENT</div>
                              <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', lineHeight: '1.2' }}>{order.courierOrderId}</div>
                            </div>
                          )}
                          {order.trackingId && (
                            <div className="flex justify-between" style={{ padding: '1px 0' }}>
                              <span style={{ fontWeight: 'bold' }}>Track:</span>
                              <span>{order.trackingId}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Packed Badge */}
                    {order.isPacked && (
                      <div className="text-center mt-2">
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 8px',
                            border: '2px solid #000',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            letterSpacing: '1px',
                          }}
                        >
                          PACKED
                        </span>
                      </div>
                    )}


                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
