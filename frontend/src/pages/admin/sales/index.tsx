import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import InvoicePrintModal from '@/components/admin/InvoicePrintModal';
import StickerPrintModal from '@/components/admin/StickerPrintModal';
import ProductAutocomplete from '@/components/admin/ProductAutocomplete';
import { useToast } from '@/contexts/ToastContext';
import { FaPlus, FaPrint, FaBoxOpen, FaFileInvoice, FaTag } from 'react-icons/fa';
import apiClient from '@/services/api';

const INITIAL_FILTERS = {
  q: '',
  todayOnly: false,
  status: '',
  courierStatus: '',
  startDate: '',
  endDate: '',
  productName: '',
};

interface SalesOrder {
  id: number;
  salesOrderNumber?: string;
  sales_order_number?: string;
  order_number?: string;

  createdBy?: number | null;
  created_by?: number | null;

  customerId?: number | null;
  customer_id?: number | null;
  customer_name?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customer_email?: string | null;
  customerPhone?: string | null;
  customer_phone?: string | null;

  totalAmount?: number;
  total_amount?: number;

  status: string;
  orderDate?: string;
  order_date?: string;

  createdAt?: string;
  created_at?: string;
  shippedAt?: string | null;
  shipped_at?: string | null;
  deliveredAt?: string | null;
  delivered_at?: string | null;

  shippingAddress?: string | null;
  shipping_address?: string | null;
  courierNotes?: string | null;
  courier_notes?: string | null;
  riderInstructions?: string | null;
  rider_instructions?: string | null;
  internalNotes?: string | null;
  internal_notes?: string | null;

  cancelReason?: string | null;
  cancel_reason?: string | null;
  approvedBy?: number | null;
  approved_by?: number | null;
  approvedAt?: string | null;
  approved_at?: string | null;
  cancelledBy?: number | null;
  cancelled_by?: number | null;
  cancelledAt?: string | null;
  cancelled_at?: string | null;

  userIp?: string | null;
  user_ip?: string | null;
  geoLocation?: any;
  geo_location?: any;
  browserInfo?: string | null;
  browser_info?: string | null;
  deviceType?: string | null;
  device_type?: string | null;
  operatingSystem?: string | null;
  operating_system?: string | null;
  trafficSource?: string | null;
  traffic_source?: string | null;
  referrerUrl?: string | null;
  referrer_url?: string | null;
  utmSource?: string | null;
  utm_source?: string | null;
  utmMedium?: string | null;
  utm_medium?: string | null;
  utmCampaign?: string | null;
  utm_campaign?: string | null;

  courierCompany?: string | null;
  courier_company?: string | null;
  courierOrderId?: string | null;
  courier_order_id?: string | null;
  trackingId?: string | null;
  tracking_id?: string | null;
  courierStatus?: string | null;
  courier_status?: string | null;
  thankYouOfferAccepted?: boolean;
  thank_you_offer_accepted?: boolean;

  isPacked?: boolean;
  is_packed?: boolean;
  packedAt?: string | null;
  packed_at?: string | null;

  order_source?: string | null;
  order_source_display?: string | null;

  notes?: string | null;
}

export default function AdminSales() {
  const toast = useToast();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [courierStatusOptions, setCourierStatusOptions] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Array<number | string>>([]);
  const [bulkAction, setBulkAction] = useState<'delete' | 'pending' | 'completed' | 'cancelled' | ''>('');
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Print & Pack state
  const [showInvoicePrint, setShowInvoicePrint] = useState(false);
  const [showStickerPrint, setShowStickerPrint] = useState(false);
  const [printOrderIds, setPrintOrderIds] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    order_number: '',
    order_date: new Date().toISOString().split('T')[0],
    status: 'pending',

    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',

    shipping_address: '',
    courier_notes: '',
    rider_instructions: '',
    internal_notes: '',
    notes: '',

    total_amount: '',

    user_ip: '',
    browser_info: '',
    device_type: '',
    operating_system: '',
    traffic_source: '',
    referrer_url: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: ''
  });

  const loadOrders = async (page?: number, pageSize?: number, filterOverrides?: typeof filters) => {
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
      if (f.status) params.status = f.status;
      if (f.courierStatus) params.courierStatus = f.courierStatus;
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;
      if (f.todayOnly) params.todayOnly = 'true';
      if (f.productName.trim()) params.productName = f.productName.trim();

      const response = await apiClient.get('/sales', { params });
      const body = response.data;
      if (body && Array.isArray(body.data)) {
        setOrders(body.data);
        setTotalPages(body.totalPages ?? 1);
        setTotalCount(body.total ?? 0);
        if (Array.isArray(body.courierStatuses)) {
          setCourierStatusOptions(body.courierStatuses);
        }
      } else if (Array.isArray(body)) {
        // Fallback for non-paginated response
        setOrders(body);
        setTotalPages(Math.ceil(body.length / ps));
        setTotalCount(body.length);
      } else {
        setOrders([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrders([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load orders whenever page, pageSize, or filters change (debounced for text search)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders(currentPage, itemsPerPage, filters);
    }, filters.q.trim() ? 400 : 0);
    return () => clearTimeout(timer);
  }, [currentPage, itemsPerPage, filters]);

  const handleAdd = () => {
    setModalMode('add');
    setFormData({
      order_number: '',
      order_date: new Date().toISOString().split('T')[0],
      status: 'pending',

      customer_id: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',

      shipping_address: '',
      courier_notes: '',
      rider_instructions: '',
      internal_notes: '',
      notes: '',

      total_amount: '',

      user_ip: '',
      browser_info: '',
      device_type: '',
      operating_system: '',
      traffic_source: '',
      referrer_url: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (order: SalesOrder) => {
    setModalMode('edit');
    setSelectedOrder(order);

    const orderNumber = order.salesOrderNumber ?? order.sales_order_number ?? order.order_number ?? '';
    const customerName = order.customerName ?? order.customer_name ?? '';
    const totalAmount =
      order.totalAmount != null
        ? String(order.totalAmount)
        : order.total_amount != null
          ? String(order.total_amount)
          : '';
    const orderDate = order.orderDate ?? order.order_date ?? new Date().toISOString().split('T')[0];

    setFormData({
      order_number: orderNumber,
      order_date: String(orderDate).slice(0, 10),
      status: order.status,

      customer_id: order.customerId != null ? String(order.customerId) : '',
      customer_name: customerName,
      customer_email: order.customerEmail ?? '',
      customer_phone: order.customerPhone ?? '',

      shipping_address: order.shippingAddress ?? '',
      courier_notes: order.courierNotes ?? '',
      rider_instructions: order.riderInstructions ?? '',
      internal_notes: order.internalNotes ?? '',
      notes: order.notes ?? '',

      total_amount: totalAmount,

      user_ip: '',
      browser_info: '',
      device_type: '',
      operating_system: '',
      traffic_source: '',
      referrer_url: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: ''
    });
    setIsModalOpen(true);
  };

  const handleView = (order: SalesOrder) => {
    setSelectedOrderId(order.id);
    setShowOrderDetails(true);
  };

  const handleDelete = async (order: SalesOrder) => {
    const orderNumber = order.salesOrderNumber ?? order.order_number ?? String(order.id);
    if (!confirm(`Are you sure you want to delete order "${orderNumber}"?`)) return;

    try {
      await apiClient.delete(`/sales/${order.id}`);
      toast.success('Order deleted successfully');
      loadOrders();
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  const applyBulkAction = async () => {
    const ids = selectedRowIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    if (!bulkAction) {
      toast.warning('Select a bulk action first');
      return;
    }
    if (ids.length === 0) {
      toast.warning('Select at least one order');
      return;
    }

    if (bulkAction === 'delete') {
      if (!confirm(`Delete ${ids.length} selected order(s)?`)) return;
      try {
        await Promise.all(ids.map((id) => apiClient.delete(`/sales/${id}`)));
        setSelectedRowIds([]);
        setBulkAction('');
        await loadOrders();
        toast.success('Selected orders deleted');
      } catch (e) {
        toast.error('Failed to delete selected orders');
      }
      return;
    }

    // Status updates
    try {
      await Promise.all(ids.map((id) => apiClient.put(`/sales/${id}`, { status: bulkAction })));
      setSelectedRowIds([]);
      setBulkAction('');
      await loadOrders();
      toast.success('Selected orders updated');
    } catch (e) {
      toast.error('Failed to update selected orders');
    }
  };

  const bulkSendToSteadfast = async () => {
    const ids = selectedRowIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    if (ids.length === 0) {
      toast.warning('Select at least one order');
      return;
    }

    if (!confirm(`Send ${ids.length} selected order(s) to Steadfast?`)) return;

    const results = await Promise.allSettled(
      ids.map((id) => apiClient.post(`/order-management/${id}/steadfast/send`)),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.length - successCount;

    if (failedCount === 0) {
      toast.success(`Sent ${successCount} order(s) to Steadfast.`);
    } else {
      toast.warning(`Sent ${successCount} order(s) to Steadfast. Failed: ${failedCount}.`);
    }

    setSelectedRowIds([]);
    await loadOrders();
  };

  const bulkSendToPathao = async () => {
    const ids = selectedRowIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    if (ids.length === 0) {
      toast.warning('Select at least one order');
      return;
    }

    if (!confirm(`Send ${ids.length} selected order(s) to Pathao?`)) return;

    const results = await Promise.allSettled(
      ids.map((id) =>
        apiClient.post(`/order-management/${id}/ship`, {
          courierCompany: 'Pathao',
          courierOrderId: '',
          trackingId: `PATHAO-${id}`,
        }),
      ),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.length - successCount;

    if (failedCount === 0) {
      toast.success(`Sent ${successCount} order(s) to Pathao.`);
    } else {
      toast.warning(`Sent ${successCount} order(s) to Pathao. Failed: ${failedCount}.`);
    }

    setSelectedRowIds([]);
    await loadOrders();
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        salesOrderNumber: formData.order_number ? String(formData.order_number).trim() : undefined,
        orderDate: formData.order_date ? new Date(formData.order_date).toISOString() : undefined,

        status: formData.status,

        customerId:
          formData.customer_id != null && String(formData.customer_id).trim() !== ''
            ? Number(formData.customer_id)
            : null,
        customerName: formData.customer_name ? String(formData.customer_name).trim() : null,
        customerEmail: formData.customer_email ? String(formData.customer_email).trim() : null,
        customerPhone: formData.customer_phone ? String(formData.customer_phone).trim() : null,

        shippingAddress: formData.shipping_address ? String(formData.shipping_address) : null,
        courierNotes: formData.courier_notes ? String(formData.courier_notes) : null,
        riderInstructions: formData.rider_instructions ? String(formData.rider_instructions) : null,
        internalNotes: formData.internal_notes ? String(formData.internal_notes) : null,
        notes: formData.notes ? String(formData.notes) : null,

        totalAmount: formData.total_amount != null && String(formData.total_amount).trim() !== ''
          ? Number(formData.total_amount)
          : undefined,

        userIp: formData.user_ip ? String(formData.user_ip) : null,
        browserInfo: formData.browser_info ? String(formData.browser_info) : null,
        deviceType: formData.device_type ? String(formData.device_type) : null,
        operatingSystem: formData.operating_system ? String(formData.operating_system) : null,
        trafficSource: formData.traffic_source ? String(formData.traffic_source) : null,
        referrerUrl: formData.referrer_url ? String(formData.referrer_url) : null,
        utmSource: formData.utm_source ? String(formData.utm_source) : null,
        utmMedium: formData.utm_medium ? String(formData.utm_medium) : null,
        utmCampaign: formData.utm_campaign ? String(formData.utm_campaign) : null,
      };

      if (modalMode === 'add') {
        payload.order_source = 'admin_panel';
        const response = await apiClient.post('/sales', payload);
        setOrders([...orders, response.data]);
        toast.success('Order added successfully');
      } else if (modalMode === 'edit' && selectedOrder) {
        const response = await apiClient.put(`/sales/${selectedOrder.id}`, payload);
        setOrders(orders.map(o => o.id === selectedOrder.id ? response.data : o));
        toast.success('Order updated successfully');
      }
      setIsModalOpen(false);
      loadOrders();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

  // Server-side pagination: orders already contains only the current page's data

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'orderDate',
      label: 'Date',
      render: (_: any, row: SalesOrder) => {
        // Use createdAt as the single source of truth (orderDate may only store the date portion without time)
        const raw = row.createdAt ?? row.created_at ?? row.orderDate ?? row.order_date;
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
      }
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (_: any, row: SalesOrder) => row.customerName ?? row.customer_name ?? '-'
    },
    {
      key: 'customerPhone',
      label: 'Customer Phone',
      render: (_: any, row: SalesOrder) => row.customerPhone ?? row.customer_phone ?? '-'
    },
    { 
      key: 'totalAmount', 
      label: 'Amount',
      render: (_: any, row: SalesOrder) => {
        const amt = row.totalAmount ?? row.total_amount ?? 0;
        const n = Number(amt);
        return `৳${Number.isFinite(n) ? n.toFixed(2) : '0.00'}`;
      }
    },
    {
      key: 'courierOrderId',
      label: 'Courier ID',
      render: (_: any, row: SalesOrder) => row.courierOrderId ?? row.courier_order_id ?? '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => {
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
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[value] || 'bg-gray-100 text-gray-800'}`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'shippingAddress',
      label: 'Address',
      render: (_: any, row: SalesOrder) => {
        const addr = row.shippingAddress ?? row.shipping_address ?? '-';
        return (
          <span className="text-xs leading-snug block max-w-[220px] whitespace-normal break-words">
            {addr}
          </span>
        );
      }
    },
    {
      key: 'order_source_display',
      label: 'Source',
      render: (_: any, row: SalesOrder) => {
        const display = row.order_source_display || '-';
        const source = row.order_source || '';
        const isAdmin = source === 'admin_panel' || source === 'agent_dashboard';
        const colorClass = isAdmin
          ? 'bg-purple-100 text-purple-800'
          : source === 'landing_page'
            ? 'bg-orange-100 text-orange-800'
            : 'bg-green-100 text-green-800';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {display}
          </span>
        );
      }
    },
  ];

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Sales Management</h1>
            <p className="text-gray-600 mt-1">Manage your sales orders</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
          >
            <FaPlus />
            Add New Order
          </button>
        </div>

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
              onClick={() => handlePrintSticker()}
              disabled={selectedRowIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-1.5"
              title="Print Sticker for selected orders"
            >
              <FaTag /> Print Sticker
            </button>

            <button
              type="button"
              onClick={handleBulkMarkPacked}
              disabled={selectedRowIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-purple-700 transition-all flex items-center gap-1.5"
              title="Mark selected orders as packed"
            >
              <FaBoxOpen /> Mark Packed
            </button>

            <div className="border-l border-gray-300 h-8 mx-1" />

            <button
              type="button"
              onClick={bulkSendToSteadfast}
              disabled={selectedRowIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              Send to Steadfast
            </button>

            <button
              type="button"
              onClick={bulkSendToPathao}
              disabled={selectedRowIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              Send to Pathao
            </button>

            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Bulk Actions</option>
              <option value="delete">Delete Selected</option>
              <option value="pending">Mark as Pending</option>
              <option value="completed">Mark as Completed</option>
              <option value="cancelled">Mark as Cancelled</option>
            </select>
            <button
              type="button"
              onClick={applyBulkAction}
              disabled={!bulkAction || selectedRowIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              Apply
            </button>
          </div>
        </div>

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

          <div className="mt-4">
            <div className="space-y-4">
              {/* 1st line: Search + Today orders */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div className="md:col-span-5">
                  <FormInput
                    label="Search"
                    name="q"
                    value={filters.q}
                    onChange={handleFilterChange}
                    placeholder="Search by customer phone/name, order id, courier id/company, district, thana"
                  />
                </div>

                <div className="md:col-span-1">
                  <label htmlFor="todayOnly" className="block text-sm font-medium text-gray-700">
                    Today Orders
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
              </div>

              {/* 2nd line: Status + date range (single row on desktop) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <FormInput
                  label="Order Status"
                  name="status"
                  type="select"
                  value={filters.status}
                  onChange={handleFilterChange}
                  selectPlaceholder="All"
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'processing', label: 'Processing' },
                    { value: 'hold', label: 'Hold' },
                    { value: 'shipped', label: 'Shipped' },
                    { value: 'delivered', label: 'Delivered' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'returned', label: 'Returned' },
                  ]}
                />

                <FormInput
                  label="Courier Status"
                  name="courierStatus"
                  type="select"
                  value={filters.courierStatus}
                  onChange={handleFilterChange}
                  selectPlaceholder="All"
                  options={courierStatusOptions.map((s) => ({ value: s, label: s }))}
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
              </div>

              {/* 3rd line: Product filter */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <ProductAutocomplete
                    value={filters.productName}
                    onChange={(val) => setFilters((prev) => ({ ...prev, productName: val }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 flex justify-end">
          <PageSizeSelector
            value={itemsPerPage}
            onChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
        </div>

        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          selection={{
            selectedRowIds,
            onChange: setSelectedRowIds,
            getRowId: (row: SalesOrder) => row.id
          }}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'add' ? 'Add New Order' : modalMode === 'edit' ? 'Edit Order' : 'View Order'}
          size="lg"
          footer={
            modalMode !== 'view' ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="order-form"
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                >
                  {modalMode === 'add' ? 'Create' : 'Update'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            )
          }
        >
          {modalMode === 'view' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Order Number</label>
                <p className="mt-1 text-gray-900">{selectedOrder?.order_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <p className="mt-1 text-gray-900">{selectedOrder?.customer_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <p className="mt-1 text-gray-900">৳{(selectedOrder?.total_amount ?? selectedOrder?.totalAmount ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="mt-1 text-gray-900">{selectedOrder?.order_date}</p>
              </div>
            </div>
          ) : (
            <form id="order-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Order Number (optional)"
                  name="order_number"
                  value={formData.order_number}
                  onChange={handleInputChange}
                  placeholder="Leave empty to auto-generate"
                />
                <FormInput
                  label="Order Date"
                  name="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Customer ID (optional)"
                  name="customer_id"
                  type="number"
                  value={formData.customer_id}
                  onChange={handleInputChange}
                  placeholder="Existing customer id"
                />
                <FormInput
                  label="Customer Name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Customer Email"
                  name="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                />
                <FormInput
                  label="Customer Phone"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleInputChange}
                />
              </div>

              <FormInput
                label="Shipping Address"
                name="shipping_address"
                type="textarea"
                value={formData.shipping_address}
                onChange={handleInputChange}
                rows={3}
                placeholder="Full delivery address"
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Courier Notes"
                  name="courier_notes"
                  type="textarea"
                  value={formData.courier_notes}
                  onChange={handleInputChange}
                  rows={3}
                />
                <FormInput
                  label="Rider Instructions"
                  name="rider_instructions"
                  type="textarea"
                  value={formData.rider_instructions}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <FormInput
                label="Internal Notes"
                name="internal_notes"
                type="textarea"
                value={formData.internal_notes}
                onChange={handleInputChange}
                rows={3}
              />

              <FormInput
                label="Order Notes"
                name="notes"
                type="textarea"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Total Amount"
                  name="total_amount"
                  type="number"
                  value={formData.total_amount}
                  onChange={handleInputChange}
                  required
                />
                <FormInput
                  label="Status"
                  name="status"
                  type="select"
                  value={formData.status}
                  onChange={handleInputChange}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                />
              </div>

              <div className="border-t pt-4">
              </div>
            </form>
          )}
        </Modal>

        {/* Advanced Order Details Modal */}
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
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
