import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import { wrapCustomerName } from '@/utils/wrapCustomerName';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import FormInput from '@/components/admin/FormInput';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import InvoicePrintModal from '@/components/admin/InvoicePrintModal';
import StickerPrintModal from '@/components/admin/StickerPrintModal';
import ProductAutocomplete from '@/components/admin/ProductAutocomplete';
import { useToast } from '@/contexts/ToastContext';
import { FaPrint, FaBoxOpen, FaFileInvoice, FaTag, FaExternalLinkAlt, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import apiClient from '@/services/api';
import { getOrderStatusLabel, getOrderStatusColor } from '@/utils/orderStatus';

function getTodayDateString() {
  const now = new Date();
  // Use Asia/Dhaka timezone
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

const INITIAL_FILTERS = {
  q: '',
  isPacked: '',
  invoicePrinted: '',
  stickerPrinted: 'false',
  courierId: '',
  date: getTodayDateString(),
  productName: '',
};

interface PrintingOrderItem {
  productName: string;
  productNameBn?: string | null;
  variantName?: string | null;
  quantity: number;
}

interface ActiveOrder {
  id: number;
  status: string;
  courierOrderId?: string | null;
  courierCompany?: string | null;
  totalAmount: number;
  createdAt: string;
  shippedAt?: string | null;
  items: PrintingOrderItem[];
}

interface PrintingOrder {
  id: number;
  salesOrderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount?: number;
  courierOrderId?: string;
  courierCompany?: string;
  trackingId?: string;
  orderDate?: string;
  createdAt?: string;
  shippedAt?: string;
  isPacked?: boolean;
  invoicePrinted?: boolean;
  stickerPrinted?: boolean;
  status?: string;
  items?: PrintingOrderItem[];
  hasActiveOrders?: boolean;
  activeOrders?: ActiveOrder[];
  isRejectedCustomer?: boolean;
}

function getCourierTrackingUrl(courierCompany: string | null | undefined, trackingId: string | null | undefined, courierOrderId?: string | null): string | null {
  const company = (courierCompany || '').toLowerCase().trim();
  if (company.includes('steadfast')) {
    if (!courierOrderId) return null;
    return `https://steadfast.com.bd/user/consignment/${courierOrderId}`;
  }
  if (!trackingId) return null;
  if (company.includes('pathao')) {
    return `https://merchant.pathao.com/tracking?consignment_id=${trackingId}`;
  }
  if (company.includes('redx')) {
    return `https://redx.com.bd/track-parcel/?trackingId=${trackingId}`;
  }
  return null;
}

export default function PrintingPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<PrintingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(50);



  // Selection
  const [selectedRowIds, setSelectedRowIds] = useState<Array<number | string>>([]);

  // Modals
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showInvoicePrint, setShowInvoicePrint] = useState(false);
  const [showStickerPrint, setShowStickerPrint] = useState(false);
  const [printOrderIds, setPrintOrderIds] = useState<number[]>([]);

  // Active-order gate modal (for repeat-phone sticker printing)
  const [showActiveOrderGate, setShowActiveOrderGate] = useState(false);
  const [gateOrder, setGateOrder] = useState<PrintingOrder | null>(null);
  const [gateNote, setGateNote] = useState('');
  const [gateSaving, setGateSaving] = useState(false);

  const loadOrders = useCallback(async (page?: number, pageSize?: number, filterOverrides?: typeof filters) => {
    setLoading(true);
    try {
      const p = page ?? currentPage;
      const ps = pageSize ?? itemsPerPage;
      const f = filterOverrides ?? filters;
      const params: Record<string, string> = {
        page: String(p),
        limit: String(ps),
      };
      if (f.q.trim()) params.q = f.q.trim();
      if (f.isPacked) params.isPacked = f.isPacked;
      if (f.invoicePrinted) params.invoicePrinted = f.invoicePrinted;
      if (f.stickerPrinted) params.stickerPrinted = f.stickerPrinted;
      if (f.courierId.trim()) params.courierId = f.courierId.trim();
      if (f.date) params.date = f.date;
      if (f.productName.trim()) params.productName = f.productName.trim();

      const response = await apiClient.get('/order-management/printing', { params });
      const body = response.data;
      if (body && Array.isArray(body.data)) {
        setOrders(body.data);
        setTotalPages(body.totalPages ?? 1);
        setTotalCount(body.total ?? 0);
      } else {
        setOrders([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Failed to load printing orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders(currentPage, itemsPerPage, filters);
    }, (filters.q.trim() || filters.courierId.trim()) ? 400 : 0);
    return () => clearTimeout(timer);
  }, [currentPage, itemsPerPage, filters]);

  // ==================== HANDLERS ====================

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const name = target.name;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
  };

  const activeFilterCount = Object.values(filters).filter((v) => {
    if (typeof v === 'boolean') return v;
    return String(v).trim() !== '';
  }).length;

  // ==================== PRINT HANDLERS ====================

  const handlePrintInvoice = (orderId?: number) => {
    if (orderId) {
      setPrintOrderIds([orderId]);
    } else {
      const ids = selectedRowIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
      if (ids.length === 0) { toast.warning('Select at least one order'); return; }
      setPrintOrderIds(ids);
    }
    setShowInvoicePrint(true);
  };

  const proceedWithStickerPrint = async (ids: number[]) => {
    setPrintOrderIds(ids);
    setShowStickerPrint(true);
    try {
      if (ids.length === 1) {
        await apiClient.post(`/order-management/${ids[0]}/mark-sticker-printed`);
      } else {
        await apiClient.post('/order-management/bulk-mark-sticker-printed', { orderIds: ids });
      }
    } catch {
      // silent — printing modal is already open
    }
  };

  const handlePrintSticker = async (orderId?: number) => {
    let ids: number[];
    if (orderId) {
      ids = [orderId];
    } else {
      ids = selectedRowIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
      if (ids.length === 0) { toast.warning('Select at least one order'); return; }
    }

    // Check for orders with active repeat-phone orders
    const flaggedOrders = orders.filter(o => ids.includes(o.id) && o.hasActiveOrders);

    if (flaggedOrders.length > 0) {
      if (ids.length === 1) {
        // Single order — show gate modal
        setGateOrder(flaggedOrders[0]);
        setGateNote('');
        setShowActiveOrderGate(true);
        return;
      }
      // Multiple selected — block and warn
      const flaggedDetails = flaggedOrders.map(o => `#${o.id} (${o.customerName || 'Unknown'} - ${o.customerPhone || 'N/A'})`).join(', ');
      toast.error(`Order(s) ${flaggedDetails} have repeat customers with active orders. Please print their stickers individually to add required notes.`);
      return;
    }

    await proceedWithStickerPrint(ids);
  };

  const handleGateProceed = async () => {
    if (!gateOrder) return;
    if (!gateNote.trim()) {
      toast.warning('Please add a note/reason before proceeding');
      return;
    }
    setGateSaving(true);
    try {
      await apiClient.put(`/order-management/${gateOrder.id}/notes`, {
        internalNotes: gateNote.trim(),
      });
    } catch {
      // non-blocking
    }
    setShowActiveOrderGate(false);
    setGateSaving(false);
    await proceedWithStickerPrint([gateOrder.id]);
    setGateOrder(null);
    setGateNote('');
  };

  // ==================== MARK AS PRINTED HANDLERS ====================

  const handleMarkInvoicePrinted = async (orderId: number) => {
    try {
      await apiClient.post(`/order-management/${orderId}/mark-invoice-printed`);
      toast.success('Invoice marked as printed');
      loadOrders();
    } catch {
      toast.error('Failed to mark invoice as printed');
    }
  };

  const handleMarkStickerPrinted = async (orderId: number) => {
    try {
      await apiClient.post(`/order-management/${orderId}/mark-sticker-printed`);
      toast.success('Sticker marked as printed');
      loadOrders();
    } catch {
      toast.error('Failed to mark sticker as printed');
    }
  };

  const handleBulkMarkInvoicePrinted = async () => {
    const ids = selectedRowIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
    if (ids.length === 0) { toast.warning('Select at least one order'); return; }
    if (!confirm(`Mark invoice as printed for ${ids.length} order(s)?`)) return;
    try {
      const res = await apiClient.post('/order-management/bulk-mark-invoice-printed', { orderIds: ids });
      const data = res.data;
      if (data.failed === 0) {
        toast.success(`${data.success} invoice(s) marked as printed`);
      } else {
        toast.warning(`Printed: ${data.success}, Failed: ${data.failed}`);
      }
      setSelectedRowIds([]);
      loadOrders();
    } catch {
      toast.error('Failed to bulk mark invoices as printed');
    }
  };

  const handleBulkMarkStickerPrinted = async () => {
    const ids = selectedRowIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
    if (ids.length === 0) { toast.warning('Select at least one order'); return; }
    if (!confirm(`Mark sticker as printed for ${ids.length} order(s)?`)) return;
    try {
      const res = await apiClient.post('/order-management/bulk-mark-sticker-printed', { orderIds: ids });
      const data = res.data;
      if (data.failed === 0) {
        toast.success(`${data.success} sticker(s) marked as printed`);
      } else {
        toast.warning(`Printed: ${data.success}, Failed: ${data.failed}`);
      }
      setSelectedRowIds([]);
      loadOrders();
    } catch {
      toast.error('Failed to bulk mark stickers as printed');
    }
  };

  // ==================== MARK AS PACKED HANDLERS ====================

  const handleMarkPacked = async (orderId: number) => {
    try {
      await apiClient.post(`/order-management/${orderId}/mark-packed`);
      toast.success('Order marked as packed');
      loadOrders();
    } catch {
      toast.error('Failed to mark as packed');
    }
  };

  const handleUnmarkPacked = async (orderId: number) => {
    try {
      await apiClient.post(`/order-management/${orderId}/unmark-packed`);
      toast.success('Order unmarked as packed');
      loadOrders();
    } catch {
      toast.error('Failed to unmark packed');
    }
  };

  const handleBulkMarkPacked = async () => {
    const ids = selectedRowIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
    if (ids.length === 0) { toast.warning('Select at least one order'); return; }
    if (!confirm(`Mark ${ids.length} order(s) as packed?`)) return;
    try {
      const res = await apiClient.post('/order-management/bulk-mark-packed', { orderIds: ids });
      const data = res.data;
      if (data.failed === 0) {
        toast.success(`${data.success} order(s) marked as packed`);
      } else {
        toast.warning(`Packed: ${data.success}, Failed: ${data.failed}`);
      }
      setSelectedRowIds([]);
      loadOrders();
    } catch {
      toast.error('Failed to bulk mark as packed');
    }
  };

  const handleViewDetails = (order: PrintingOrder) => {
    setSelectedOrderId(order.id);
    setShowOrderDetails(true);
  };

  // ==================== CHECKBOX HANDLERS (print + mark) ====================

  const handleStickerCheckbox = async (orderId: number) => {
    // Check if order has active orders — show gate modal
    const order = orders.find(o => o.id === orderId);
    if (order?.hasActiveOrders) {
      setGateOrder(order);
      setGateNote('');
      setShowActiveOrderGate(true);
      return;
    }
    // Open sticker print modal AND mark as printed
    await proceedWithStickerPrint([orderId]);
  };

  const handlePackedCheckbox = async (orderId: number, currentlyPacked: boolean) => {
    if (currentlyPacked) {
      await handleUnmarkPacked(orderId);
    } else {
      await handleMarkPacked(orderId);
    }
  };

  // ==================== COLUMNS ====================

  const columns = [
    {
      key: 'serial',
      label: '#',
      render: (_: any, row: PrintingOrder) => {
        const idx = orders.findIndex((o) => o.id === row.id);
        return (currentPage - 1) * itemsPerPage + idx + 1;
      },
    },
    {
      key: 'shippedAt',
      label: 'Sent At',
      render: (_: any, row: PrintingOrder) => {
        const raw = row.shippedAt ?? row.createdAt ?? row.orderDate;
        if (!raw) return '-';
        const d = new Date(raw);
        if (isNaN(d.getTime())) return '-';
        const date = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });
        return (
          <div>
            <div>{date}</div>
            <div className="text-xs text-gray-500">{time}</div>
          </div>
        );
      },
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (_: any, row: PrintingOrder) => (
        <div>
          <div className="font-medium">{wrapCustomerName(row.customerName)}</div>
          <div className="text-xs text-gray-500">{row.customerPhone || '-'}</div>
          {row.isRejectedCustomer && (
            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
              ⚠ Rejected
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      label: 'Products',
      className: 'min-w-[280px]',
      render: (_: any, row: PrintingOrder) => {
        const items = row.items || [];
        if (items.length === 0) return <span className="text-gray-400 text-xs">No items</span>;
        return (
          <div className="text-xs max-h-28 overflow-y-auto" style={{ whiteSpace: 'pre-line' }}>
            {items.map((item, idx) => (
              <span key={idx}>
                {item.productNameBn || item.productName}{item.variantName ? ` - ${item.variantName}` : ''} <span className="text-gray-500">({item.quantity})</span>
                {idx < items.length - 1 && <br />}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      render: (_: any, row: PrintingOrder) => {
        const amt = row.totalAmount ?? 0;
        const n = Number(amt);
        return `৳${Number.isFinite(n) ? n.toFixed(2) : '0.00'}`;
      },
    },
    {
      key: 'courierOrderId',
      label: 'Courier ID',
      render: (_: any, row: PrintingOrder) => {
        const cid = row.courierOrderId;
        if (!cid) return <span className="text-gray-400">-</span>;
        const trackingUrl = getCourierTrackingUrl(row.courierCompany, row.trackingId, row.courierOrderId);
        if (trackingUrl) {
          return (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {cid}
              <FaExternalLinkAlt className="text-[10px]" />
            </a>
          );
        }
        return <span>{cid}</span>;
      },
    },
    {
      key: 'courierCompany',
      label: 'Courier',
      render: (_: any, row: PrintingOrder) => {
        const company = row.courierCompany;
        if (!company) return <span className="text-gray-400">-</span>;
        const colorMap: Record<string, string> = {
          steadfast: 'bg-blue-100 text-blue-800',
          pathao: 'bg-red-100 text-red-800',
          redx: 'bg-orange-100 text-orange-800',
        };
        const key = company.toLowerCase().trim();
        const cls = Object.entries(colorMap).find(([k]) => key.includes(k))?.[1] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
            {company}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, row: PrintingOrder) => {
        const status = row.status || '-';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getOrderStatusColor(status)}`}>
            {getOrderStatusLabel(status)}
          </span>
        );
      },
    },
    {
      key: 'stickerPrinted',
      label: 'Sticker Print',
      render: (_: any, row: PrintingOrder) => {
        const printed = row.stickerPrinted ?? false;
        return (
          <div className="flex justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              printed
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {printed ? 'Printed' : 'Not Printed'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'isPacked',
      label: 'Packed',
      render: (_: any, row: PrintingOrder) => {
        const packed = row.isPacked ?? false;
        return (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={packed}
              onChange={(e) => { e.stopPropagation(); handlePackedCheckbox(row.id, packed); }}
              onClick={(e) => e.stopPropagation()}
              className="w-6 h-6 accent-purple-600 cursor-pointer"
              title={packed ? 'Click to unmark packed' : 'Click to mark as packed'}
            />
          </div>
        );
      },
    },
  ];

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              <FaPrint className="inline-block mr-2 text-indigo-600" />
              Printing
            </h1>
            <p className="text-gray-600 mt-1">Manage invoice printing, sticker printing &amp; packing for orders</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              Total: <span className="font-semibold text-gray-800">{totalCount}</span> orders
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Printing Count ({filters.date || 'All'}): <span className="font-bold text-indigo-700 text-base">{totalCount}</span>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <div className="mb-4 bg-white rounded-lg shadow p-4 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            Selected: <span className="font-semibold">{selectedRowIds.length}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handlePrintInvoice()}
              disabled={selectedRowIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-indigo-700 transition-all flex items-center gap-1.5"
              title="Print Invoice for selected orders"
            >
              <FaFileInvoice /> Print Invoice
            </button>

            <button
              type="button"
              onClick={handleBulkMarkInvoicePrinted}
              disabled={selectedRowIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-1.5"
              title="Mark Invoice Printed for selected orders"
            >
              <FaFileInvoice /> Mark Invoice Printed
            </button>

            <div className="border-l border-gray-300 h-8 mx-1" />

            <button
              type="button"
              onClick={() => handlePrintSticker()}
              disabled={selectedRowIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-1.5"
              title="Print Sticker & Mark as Printed for selected orders"
            >
              <FaTag /> Print Sticker
            </button>

            <div className="border-l border-gray-300 h-8 mx-1" />

            <button
              type="button"
              onClick={handleBulkMarkPacked}
              disabled={selectedRowIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-purple-700 transition-all flex items-center gap-1.5"
              title="Mark selected orders as packed"
            >
              <FaBoxOpen /> Mark Packed
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
              <div className="text-sm text-gray-600">Active: <span className="font-semibold">{activeFilterCount}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {/* Row 1: Search + Date + Courier ID */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="md:col-span-3">
                <FormInput
                  label="Customer Name / Phone"
                  name="q"
                  value={filters.q}
                  onChange={handleFilterChange}
                  placeholder="Search by customer name or phone number"
                />
              </div>

              <div className="md:col-span-1">
                <FormInput
                  label="Date"
                  name="date"
                  type="date"
                  value={filters.date}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="md:col-span-1">
                <FormInput
                  label="Courier ID"
                  name="courierId"
                  value={filters.courierId}
                  onChange={handleFilterChange}
                  placeholder="Courier ID"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <ProductAutocomplete
                  value={filters.productName}
                  onChange={(val) => setFilters((prev) => ({ ...prev, productName: val }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Row 2: Packed, Invoice Printed, Sticker Printed */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <FormInput
                label="Packed"
                name="isPacked"
                type="select"
                value={filters.isPacked}
                onChange={handleFilterChange}
                selectPlaceholder="All"
                options={[
                  { value: 'true', label: 'Packed' },
                  { value: 'false', label: 'Not Packed' },
                ]}
              />

              <FormInput
                label="Invoice Printed"
                name="invoicePrinted"
                type="select"
                value={filters.invoicePrinted}
                onChange={handleFilterChange}
                selectPlaceholder="All"
                options={[
                  { value: 'true', label: 'Printed' },
                  { value: 'false', label: 'Not Printed' },
                ]}
              />

              <FormInput
                label="Sticker Printed"
                name="stickerPrinted"
                type="select"
                value={filters.stickerPrinted}
                onChange={handleFilterChange}
                selectPlaceholder="All"
                options={[
                  { value: 'true', label: 'Printed' },
                  { value: 'false', label: 'Not Printed' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Page Size */}
        <div className="mb-4 flex justify-end">
          <PageSizeSelector
            value={itemsPerPage}
            onChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          selection={{
            selectedRowIds,
            onChange: setSelectedRowIds,
            getRowId: (row: PrintingOrder) => row.id,
          }}
          onView={handleViewDetails}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          rowClassName={(row: PrintingOrder) => row.hasActiveOrders ? 'bg-red-50 border-l-4 border-l-red-400' : ''}
        />

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrderId && (
          <AdminOrderDetailsModal
            orderId={selectedOrderId}
            onClose={() => {
              setShowOrderDetails(false);
              setSelectedOrderId(null);
            }}
            onUpdate={() => loadOrders()}
          />
        )}

        {/* Invoice Print Modal */}
        {showInvoicePrint && printOrderIds.length > 0 && (
          <InvoicePrintModal
            orderIds={printOrderIds}
            onClose={() => {
              setShowInvoicePrint(false);
              setPrintOrderIds([]);
              loadOrders(); // Refresh to reflect any print status changes
            }}
          />
        )}

        {/* Sticker Print Modal */}
        {showStickerPrint && printOrderIds.length > 0 && (
          <StickerPrintModal
            orderIds={printOrderIds}
            onClose={() => {
              setShowStickerPrint(false);
              setPrintOrderIds([]);
              loadOrders(); // Refresh to reflect any print status changes
            }}
          />
        )}

        {/* Active Order Gate Modal */}
        {showActiveOrderGate && gateOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <FaExclamationTriangle className="text-red-500" size={22} />
                  <div>
                    <h2 className="text-lg font-bold text-red-800">Repeat Order Detected</h2>
                    <p className="text-sm text-red-600">This customer has other active order(s) in progress</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowActiveOrderGate(false); setGateOrder(null); setGateNote(''); }}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <FaTimes className="text-gray-500" />
                </button>
              </div>

              {/* Current Order Info */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Order</h3>
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-medium">Order #{gateOrder.id}</span>
                    <span>{gateOrder.customerName || '-'}</span>
                    <span>{gateOrder.customerPhone || '-'}</span>
                    <span className="font-semibold">৳{Number(gateOrder.totalAmount || 0).toFixed(2)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getOrderStatusColor(gateOrder.status)}`}>
                      {getOrderStatusLabel(gateOrder.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Previous Active Orders Table */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Previous Active Order(s) <span className="text-xs text-gray-500 font-normal">({gateOrder.activeOrders?.length || 0})</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Order ID</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Courier</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Amount</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Products</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(gateOrder.activeOrders || []).map((ao) => (
                        <tr key={ao.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">#{ao.id}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getOrderStatusColor(ao.status)}`}>
                              {getOrderStatusLabel(ao.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {ao.courierCompany || '-'}
                            {ao.courierOrderId && <div className="text-gray-500">{ao.courierOrderId}</div>}
                          </td>
                          <td className="px-3 py-2 font-medium">৳{Number(ao.totalAmount || 0).toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <div className="max-w-[200px]">
                              {ao.items.slice(0, 3).map((item, i) => (
                                <div key={i} className="text-xs text-gray-700 truncate">
                                  {item.quantity}x {item.productNameBn || item.productName}{item.variantName ? ` - ${item.variantName}` : ''}
                                </div>
                              ))}
                              {ao.items.length > 3 && <div className="text-xs text-blue-600">+{ao.items.length - 3} more</div>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {ao.createdAt ? new Date(ao.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes Input */}
              <div className="px-6 py-4 border-b border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Reason / Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={gateNote}
                  onChange={(e) => setGateNote(e.target.value)}
                  placeholder="Enter the reason for this repeat order or any other notes..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-y"
                  rows={3}
                  disabled={gateSaving}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 px-6 py-4">
                <button
                  onClick={() => { setShowActiveOrderGate(false); setGateOrder(null); setGateNote(''); }}
                  disabled={gateSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGateProceed}
                  disabled={gateSaving || !gateNote.trim()}
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FaTag size={12} />
                  {gateSaving ? 'Saving...' : 'Proceed to Print Sticker'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
