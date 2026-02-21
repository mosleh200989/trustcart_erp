import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import FormInput from '@/components/admin/FormInput';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import InvoicePrintModal from '@/components/admin/InvoicePrintModal';
import StickerPrintModal from '@/components/admin/StickerPrintModal';
import ProductAutocomplete from '@/components/admin/ProductAutocomplete';
import { useToast } from '@/contexts/ToastContext';
import { FaPrint, FaBoxOpen, FaFileInvoice, FaTag, FaExternalLinkAlt } from 'react-icons/fa';
import apiClient from '@/services/api';

const INITIAL_FILTERS = {
  q: '',
  todayOnly: false,
  isPacked: '',
  invoicePrinted: 'false',
  stickerPrinted: '',
  courierId: '',
  startDate: '',
  endDate: '',
  productName: '',
};

interface PrintingOrderItem {
  productName: string;
  quantity: number;
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
  courierStatus?: string;
  orderDate?: string;
  createdAt?: string;
  isPacked?: boolean;
  invoicePrinted?: boolean;
  stickerPrinted?: boolean;
  status?: string;
  items?: PrintingOrderItem[];
}

function getCourierTrackingUrl(courierCompany: string | null | undefined, trackingId: string | null | undefined): string | null {
  if (!trackingId) return null;
  const company = (courierCompany || '').toLowerCase().trim();
  if (company.includes('steadfast')) {
    return `https://steadfast.com.bd/t/${trackingId}`;
  }
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
  const [itemsPerPage, setItemsPerPage] = useState(20);



  // Selection
  const [selectedRowIds, setSelectedRowIds] = useState<Array<number | string>>([]);

  // Modals
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showInvoicePrint, setShowInvoicePrint] = useState(false);
  const [showStickerPrint, setShowStickerPrint] = useState(false);
  const [printOrderIds, setPrintOrderIds] = useState<number[]>([]);

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
      if (f.todayOnly) params.todayOnly = 'true';
      if (f.isPacked) params.isPacked = f.isPacked;
      if (f.invoicePrinted) params.invoicePrinted = f.invoicePrinted;
      if (f.stickerPrinted) params.stickerPrinted = f.stickerPrinted;
      if (f.courierId.trim()) params.courierId = f.courierId.trim();
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;
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

  const handlePrintSticker = (orderId?: number) => {
    if (orderId) {
      setPrintOrderIds([orderId]);
    } else {
      const ids = selectedRowIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
      if (ids.length === 0) { toast.warning('Select at least one order'); return; }
      setPrintOrderIds(ids);
    }
    setShowStickerPrint(true);
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
      key: 'customerName',
      label: 'Customer Name',
      render: (_: any, row: PrintingOrder) => row.customerName || '-',
    },
    {
      key: 'customerPhone',
      label: 'Phone',
      render: (_: any, row: PrintingOrder) => row.customerPhone || '-',
    },
    {
      key: 'items',
      label: 'Products',
      render: (_: any, row: PrintingOrder) => {
        const items = row.items || [];
        if (items.length === 0) return <span className="text-gray-400 text-xs">No items</span>;
        return (
          <div className="text-xs max-h-28 overflow-y-auto" style={{ whiteSpace: 'pre-line' }}>
            {items.map((item, idx) => (
              <span key={idx}>
                {item.productName} <span className="text-gray-500">({item.quantity})</span>
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
        const trackingUrl = getCourierTrackingUrl(row.courierCompany, row.trackingId);
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
        const statusColors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-800',
          approved: 'bg-blue-100 text-blue-800',
          processing: 'bg-indigo-100 text-indigo-800',
          shipped: 'bg-purple-100 text-purple-800',
          delivered: 'bg-green-100 text-green-800',
          completed: 'bg-green-100 text-green-800',
          hold: 'bg-orange-100 text-orange-800',
          cancelled: 'bg-red-100 text-red-800',
          returned: 'bg-gray-100 text-gray-800',
        };
        const status = row.status || '-';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
          </span>
        );
      },
    },
    {
      key: 'orderDate',
      label: 'Date',
      render: (_: any, row: PrintingOrder) => {
        const raw = row.createdAt ?? row.orderDate;
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
      key: 'invoicePrinted',
      label: 'Invoice Print',
      render: (_: any, row: PrintingOrder) => {
        const printed = row.invoicePrinted ?? false;
        return printed ? (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Printed</span>
        ) : (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Not Printed</span>
        );
      },
    },
    {
      key: 'stickerPrinted',
      label: 'Sticker Print',
      render: (_: any, row: PrintingOrder) => {
        const printed = row.stickerPrinted ?? false;
        return printed ? (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Printed</span>
        ) : (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Not Printed</span>
        );
      },
    },
    {
      key: 'isPacked',
      label: 'Packed',
      render: (_: any, row: PrintingOrder) => {
        const packed = row.isPacked ?? false;
        return packed ? (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Packed</span>
        ) : (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Not Packed</span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: PrintingOrder) => {
        const packed = row.isPacked ?? false;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); handlePrintInvoice(row.id); }}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Print Invoice"
            >
              <FaFileInvoice className="text-sm" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrintSticker(row.id); }}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Print Sticker"
            >
              <FaTag className="text-sm" />
            </button>
            {packed ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleUnmarkPacked(row.id); }}
                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                title="Unmark Packed"
              >
                <FaBoxOpen className="text-sm" />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleMarkPacked(row.id); }}
                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                title="Mark as Packed"
              >
                <FaBoxOpen className="text-sm" />
              </button>
            )}
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
          <div className="text-sm text-gray-500">
            Total: <span className="font-semibold text-gray-800">{totalCount}</span> orders
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
              title="Print Sticker for selected orders"
            >
              <FaTag /> Print Sticker
            </button>

            <button
              type="button"
              onClick={handleBulkMarkStickerPrinted}
              disabled={selectedRowIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-teal-600 hover:to-teal-700 transition-all flex items-center gap-1.5"
              title="Mark Sticker Printed for selected orders"
            >
              <FaTag /> Mark Sticker Printed
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
            {/* Row 1: Search + Today */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="md:col-span-4">
                <FormInput
                  label="Customer Name / Phone"
                  name="q"
                  value={filters.q}
                  onChange={handleFilterChange}
                  placeholder="Search by customer name or phone number"
                />
              </div>

              <div className="md:col-span-1">
                <label htmlFor="todayOnly" className="block text-sm font-medium text-gray-700">
                  Today&apos;s Orders
                </label>
                <div className="mt-1 flex h-10 w-full items-center rounded-md border border-gray-300 bg-white px-3 shadow-sm">
                  <label className="flex items-center gap-2 text-sm text-gray-700 select-none" htmlFor="todayOnly">
                    <input
                      id="todayOnly"
                      type="checkbox"
                      name="todayOnly"
                      checked={(filters as any).todayOnly}
                      onChange={handleFilterChange}
                      className="h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                    />
                    Today
                  </label>
                </div>
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
            </div>

            {/* Row 2: Packed, Invoice Printed, Sticker Printed, Date Range */}
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

              <FormInput
                label="Start Date"
                name="startDate"
                type="date"
                value={filters.startDate}
                onChange={handleFilterChange}
              />

              <FormInput
                label="End Date"
                name="endDate"
                type="date"
                value={filters.endDate}
                onChange={handleFilterChange}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <ProductAutocomplete
                  value={filters.productName}
                  onChange={(val) => setFilters((prev) => ({ ...prev, productName: val }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
      </div>
    </AdminLayout>
  );
}
