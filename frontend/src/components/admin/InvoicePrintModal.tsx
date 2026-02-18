import { useEffect, useRef, useState } from 'react';
import apiClient from '@/services/api';
import { FaPrint, FaTimes, FaSpinner } from 'react-icons/fa';

interface PrinterSetting {
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyLogoUrl?: string | null;
  showLogo?: boolean;
  showBarcode?: boolean;
  invoiceHeader?: string | null;
  invoiceFooter?: string | null;
}

interface InvoiceItem {
  id: number;
  productName: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface InvoiceOrder {
  id: number;
  salesOrderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: string | null;
  orderDate: string;
  status: string;
  isPacked: boolean;
  totalAmount: number;
  discountAmount: number;
  courierNotes: string | null;
  riderInstructions: string | null;
  notes: string | null;
  courierCompany: string | null;
  courierOrderId: string | null;
  trackingId: string | null;
}

interface InvoiceData {
  type: string;
  order: InvoiceOrder;
  items: InvoiceItem[];
  error?: boolean;
  message?: string;
}

interface InvoicePrintModalProps {
  orderIds: number[];
  onClose: () => void;
}

export default function InvoicePrintModal({ orderIds, onClose }: InvoicePrintModalProps) {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [printerSettings, setPrinterSettings] = useState<PrinterSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load printer settings
        const settingsRes = await apiClient.get('/printer-settings/default');
        setPrinterSettings(settingsRes.data);
      } catch {
        // Use fallback defaults
        setPrinterSettings({
          companyName: 'TrustCart',
          showLogo: false,
          showBarcode: true,
          invoiceFooter: 'Thank you for your purchase!',
        });
      }

      try {
        if (orderIds.length === 1) {
          const res = await apiClient.post(`/order-management/${orderIds[0]}/print/invoice`);
          setInvoices([res.data]);
        } else {
          const res = await apiClient.post('/order-management/bulk-print/invoice', { orderIds });
          setInvoices(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orderIds]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice Print</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
          .invoice-page {
            width: 80mm;
            padding: 4mm;
            page-break-after: always;
            margin: 0 auto;
          }
          .invoice-page:last-child { page-break-after: auto; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .text-lg { font-size: 14px; }
          .text-sm { font-size: 10px; }
          .text-xs { font-size: 9px; }
          .mt-2 { margin-top: 4px; }
          .mt-4 { margin-top: 8px; }
          .mb-2 { margin-bottom: 4px; }
          .mb-4 { margin-bottom: 8px; }
          .py-1 { padding-top: 2px; padding-bottom: 2px; }
          .border-t { border-top: 1px dashed #000; }
          .border-b { border-bottom: 1px dashed #000; }
          .border-double { border-top: 3px double #000; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .logo-img { max-width: 50mm; max-height: 15mm; display: block; margin: 0 auto 4px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 2px 0; text-align: left; vertical-align: top; }
          th { border-bottom: 1px solid #000; font-size: 10px; }
          td { font-size: 10px; }
          .qty-col { width: 30px; text-align: center; }
          .price-col { width: 50px; text-align: right; }
          .total-col { width: 55px; text-align: right; }
          .packed-badge { display: inline-block; padding: 1px 6px; border: 1px solid #000; font-size: 9px; font-weight: bold; }
          @media print {
            body { margin: 0; }
            .invoice-page { width: 80mm; }
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    const n = Number(amount);
    return `${Number.isFinite(n) ? n.toFixed(2) : '0.00'}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Invoice Preview ({orderIds.length} order{orderIds.length > 1 ? 's' : ''})
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={loading || invoices.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
            >
              <FaPrint /> Print
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
              <FaSpinner className="animate-spin text-3xl text-blue-600 mb-3" />
              <p className="text-gray-500">Loading invoice data...</p>
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-center text-gray-500 py-16">No invoice data available</p>
          ) : (
            <div ref={printRef}>
              {invoices.map((inv, idx) => {
                if (inv.error) {
                  return (
                    <div key={idx} className="invoice-page bg-white mb-4 p-4 shadow">
                      <p className="text-red-600">Error loading order: {inv.message}</p>
                    </div>
                  );
                }

                const { order, items } = inv;
                const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
                const discount = Number(order.discountAmount) || 0;

                return (
                  <div key={idx} className="invoice-page bg-white mb-4 p-4 shadow" style={{ fontFamily: "'Courier New', monospace", fontSize: '12px' }}>
                    {/* Logo / Company */}
                    {printerSettings?.showLogo && printerSettings?.companyLogoUrl && (
                      <div className="text-center mb-2">
                        <img src={printerSettings.companyLogoUrl} alt="Logo" className="logo-img" style={{ maxWidth: '50mm', maxHeight: '15mm', margin: '0 auto' }} />
                      </div>
                    )}

                    <div className="text-center mb-2">
                      <div className="font-bold text-lg">{printerSettings?.companyName || 'TrustCart'}</div>
                      {printerSettings?.companyAddress && <div className="text-xs">{printerSettings.companyAddress}</div>}
                      {printerSettings?.companyPhone && <div className="text-xs">Phone: {printerSettings.companyPhone}</div>}
                      {printerSettings?.companyEmail && <div className="text-xs">{printerSettings.companyEmail}</div>}
                    </div>

                    {printerSettings?.invoiceHeader && (
                      <div className="text-center text-xs mb-2">{printerSettings.invoiceHeader}</div>
                    )}

                    <div className="border-double mt-2 mb-2" />

                    <div className="text-center font-bold mb-2">INVOICE</div>

                    {/* Order Info */}
                    <div className="text-xs space-y-0.5">
                      <div className="flex justify-between">
                        <span>Order #:</span>
                        <span className="font-bold">{order.salesOrderNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{formatDate(order.orderDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-bold uppercase">{order.status}</span>
                      </div>
                      {order.isPacked && (
                        <div className="flex justify-between">
                          <span>Packed:</span>
                          <span className="packed-badge" style={{ border: '1px solid #000', padding: '0 4px', fontWeight: 'bold' }}>PACKED</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t mt-2 mb-2" />

                    {/* Customer */}
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold">Customer:</div>
                      <div>{order.customerName || '-'}</div>
                      <div>Ph: {order.customerPhone || '-'}</div>
                      {order.shippingAddress && <div>Addr: {order.shippingAddress}</div>}
                    </div>

                    <div className="border-t mt-2 mb-2" />

                    {/* Items Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #000' }}>
                          <th style={{ textAlign: 'left', fontSize: '10px', padding: '2px 0' }}>Item</th>
                          <th style={{ textAlign: 'center', fontSize: '10px', padding: '2px 0', width: '30px' }}>Qty</th>
                          <th style={{ textAlign: 'right', fontSize: '10px', padding: '2px 0', width: '50px' }}>Price</th>
                          <th style={{ textAlign: 'right', fontSize: '10px', padding: '2px 0', width: '55px' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td style={{ fontSize: '10px', padding: '2px 0' }}>{item.productName}</td>
                            <td style={{ fontSize: '10px', padding: '2px 0', textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ fontSize: '10px', padding: '2px 0', textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                            <td style={{ fontSize: '10px', padding: '2px 0', textAlign: 'right' }}>{formatCurrency(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="border-t mt-2 mb-1" />

                    {/* Totals */}
                    <div className="text-xs space-y-0.5">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>৳{formatCurrency(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between">
                          <span>Discount:</span>
                          <span>-৳{formatCurrency(discount)}</span>
                        </div>
                      )}
                      <div className="border-t mt-1 pt-1 flex justify-between font-bold">
                        <span>TOTAL:</span>
                        <span>৳{formatCurrency(Number(order.totalAmount))}</span>
                      </div>
                    </div>

                    {/* Courier Info */}
                    {(order.courierCompany || order.trackingId) && (
                      <>
                        <div className="border-t mt-2 mb-1" />
                        <div className="text-xs space-y-0.5">
                          {order.courierCompany && (
                            <div className="flex justify-between">
                              <span>Courier:</span>
                              <span>{order.courierCompany}</span>
                            </div>
                          )}
                          {order.courierOrderId && (
                            <div className="text-center mt-2 mb-1" style={{ border: '2px solid #000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px' }}>CONSIGNMENT</div>
                              <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '2px', lineHeight: '1.2' }}>{order.courierOrderId}</div>
                            </div>
                          )}
                          {order.trackingId && (
                            <div className="flex justify-between">
                              <span>Tracking:</span>
                              <span>{order.trackingId}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Notes */}
                    {(order.courierNotes || order.riderInstructions || order.notes) && (
                      <>
                        <div className="border-t mt-2 mb-1" />
                        <div className="text-xs space-y-0.5">
                          {order.notes && <div><span className="font-bold">Notes:</span> {order.notes}</div>}
                          {order.courierNotes && <div><span className="font-bold">Courier Notes:</span> {order.courierNotes}</div>}
                          {order.riderInstructions && <div><span className="font-bold">Rider:</span> {order.riderInstructions}</div>}
                        </div>
                      </>
                    )}



                    {/* Footer */}
                    {printerSettings?.invoiceFooter && (
                      <>
                        <div className="border-t mt-2 mb-1" />
                        <div className="text-center text-xs mt-1">{printerSettings.invoiceFooter}</div>
                      </>
                    )}

                    <div className="text-center text-xs mt-2" style={{ color: '#999' }}>
                      Printed: {new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                    </div>
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
