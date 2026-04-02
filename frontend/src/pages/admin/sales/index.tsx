import { useEffect, useState, useRef, useCallback } from 'react';
import { FaTrash } from 'react-icons/fa';
import AdminLayout from '@/layouts/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { wrapCustomerName } from '@/utils/wrapCustomerName';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
import PhoneInput from '@/components/PhoneInput';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import InvoicePrintModal from '@/components/admin/InvoicePrintModal';
import StickerPrintModal from '@/components/admin/StickerPrintModal';
import ProductAutocomplete from '@/components/admin/ProductAutocomplete';
import { useToast } from '@/contexts/ToastContext';
import { FaPlus, FaPrint, FaBoxOpen, FaFileInvoice, FaTag, FaCheck, FaTimes, FaSync, FaPhone } from 'react-icons/fa';
import apiClient from '@/services/api';
import { getOrderStatusLabel, getOrderStatusColor } from '@/utils/orderStatus';

const INITIAL_FILTERS = {
  q: '',
  todayOnly: false,
  status: '',
  startDate: '',
  endDate: '',
  productName: '',
  source: '',
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
  thankYouOfferAccepted?: boolean;
  thank_you_offer_accepted?: boolean;

  isPacked?: boolean;
  is_packed?: boolean;
  packedAt?: string | null;
  packed_at?: string | null;

  order_source?: string | null;
  order_source_display?: string | null;

  isRejectedCustomer?: boolean;
  activeCouponCodes?: string[];
  customerTags?: { name: string; color: string | null }[];

  items?: { productName: string; productNameBn?: string | null; variantName?: string | null; quantity: number; customProductName?: string | null; itemId?: number; source?: string }[];

  notes?: string | null;
}

export default function AdminSales() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Array<number | string>>([]);
  const [bulkAction, setBulkAction] = useState<'delete' | 'processing' | 'completed' | 'cancelled' | 'admin_cancelled' | ''>('');
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Print & Pack state
  const [showInvoicePrint, setShowInvoicePrint] = useState(false);
  const [showStickerPrint, setShowStickerPrint] = useState(false);
  const [printOrderIds, setPrintOrderIds] = useState<number[]>([]);

  // Product search state for create order
  const [orderItems, setOrderItems] = useState<Array<{ productId: number; productName: string; productNameBn?: string | null; variantName: string; quantity: number; unitPrice: number }>>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Source filter options
  const [sourceOptions, setSourceOptions] = useState<{ value: string; label: string }[]>([]);

  // Inline product name editing state
  const [editingProductName, setEditingProductName] = useState<{ orderId: number; itemIndex: number } | null>(null);
  const [editProductNameValue, setEditProductNameValue] = useState('');
  const [savingProductName, setSavingProductName] = useState(false);

  const startEditProductName = useCallback((orderId: number, itemIndex: number, currentName: string) => {
    setEditingProductName({ orderId, itemIndex });
    setEditProductNameValue(currentName);
  }, []);

  const cancelEditProductName = useCallback(() => {
    setEditingProductName(null);
    setEditProductNameValue('');
  }, []);

  const saveProductName = useCallback(async () => {
    if (!editingProductName) return;
    const { orderId, itemIndex } = editingProductName;
    const order = orders.find((o) => o.id === orderId);
    if (!order || !order.items) return;
    const item = order.items[itemIndex];

    setSavingProductName(true);
    try {
      let targetItemId = item?.itemId;

      // If we don't have an itemId, fetch from order-management to get real IDs
      if (!targetItemId) {
        const res = await apiClient.get(`/order-management/${orderId}/items`);
        const realItems: any[] = res.data || [];
        const realItem = realItems[itemIndex];
        if (!realItem) {
          toast.error('Could not find item to update');
          setSavingProductName(false);
          return;
        }
        targetItemId = realItem.id;
      }

      await apiClient.put(`/order-management/items/${targetItemId}`, {
        customProductName: editProductNameValue.trim() || null,
      });

      // Update local state immediately — custom name overrides everything
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const newItems = [...(o.items || [])];
          if (newItems[itemIndex]) {
            const trimmed = editProductNameValue.trim();
            newItems[itemIndex] = {
              ...newItems[itemIndex],
              customProductName: trimmed || null,
            };
          }
          return { ...o, items: newItems };
        })
      );

      toast.success('Product name updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update product name');
    } finally {
      setEditingProductName(null);
      setEditProductNameValue('');
      setSavingProductName(false);
    }
  }, [editingProductName, editProductNameValue, orders, toast]);

  const [formData, setFormData] = useState({
    order_number: '',
    order_date: new Date().toISOString().split('T')[0],
    status: 'processing',

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
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;
      if (f.todayOnly) params.todayOnly = 'true';
      if (f.productName.trim()) params.productName = f.productName.trim();
      if (f.source) params.source = f.source;

      const response = await apiClient.get('/sales', { params });
      const body = response.data;
      if (body && Array.isArray(body.data)) {
        setOrders(body.data);
        setTotalPages(body.totalPages ?? 1);
        setTotalCount(body.total ?? 0);
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

  // Load source filter options on mount
  useEffect(() => {
    apiClient.get('/sales/source-options')
      .then((res) => setSourceOptions(res.data))
      .catch(() => {});
  }, []);

  // Product search for create order
  const searchProducts = async (query: string) => {
    setProductSearchQuery(query);
    if (!query.trim()) {
      setProductSearchResults([]);
      setShowProductDropdown(false);
      return;
    }
    setSearchingProducts(true);
    try {
      const response = await apiClient.get(`/products/search?q=${encodeURIComponent(query)}`);
      setProductSearchResults(response.data || []);
      setShowProductDropdown(true);
    } catch (error) {
      console.error('Product search failed:', error);
      setProductSearchResults([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  const addProductToOrder = (product: any, variant?: { name: string; price: number }) => {
    const variantName = variant?.name || '';
    const price = variant ? Number(variant.price) : Number(product.sale_price || product.base_price || product.price || 0);
    const displayName = variantName ? `${product.name_en || product.name} - ${variantName}` : (product.name_en || product.name);
    // Use a composite key: productId + variantName to allow same product with different variants
    const itemKey = `${product.id}-${variantName}`;
    const existing = orderItems.find(item => `${item.productId}-${item.variantName}` === itemKey);
    if (existing) {
      setOrderItems(orderItems.map(item =>
        `${item.productId}-${item.variantName}` === itemKey ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setOrderItems([...orderItems, {
        productId: product.id,
        productName: displayName,
        productNameBn: product.name_bn || null,
        variantName,
        quantity: 1,
        unitPrice: price,
      }]);
    }
    setProductSearchQuery('');
    setProductSearchResults([]);
    setShowProductDropdown(false);
    setExpandedProductId(null);
  };

  const removeProductFromOrder = (productId: number, variantName: string) => {
    setOrderItems(orderItems.filter(item => !(item.productId === productId && item.variantName === variantName)));
  };

  const updateOrderItemQty = (productId: number, variantName: string, quantity: number) => {
    if (quantity < 1) return;
    setOrderItems(orderItems.map(item =>
      (item.productId === productId && item.variantName === variantName) ? { ...item, quantity } : item
    ));
  };

  const handleAdd = () => {
    setModalMode('add');
    setFormData({
      order_number: '',
      order_date: new Date().toISOString().split('T')[0],
      status: 'processing',

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
    setOrderItems([]);
    setProductSearchQuery('');
    setProductSearchResults([]);
    setDeliveryCharge(0);
    setExpandedProductId(null);
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
    } catch (error: any) {
      const msg = error.response?.data?.message;
      if (error.response?.status === 403) {
        toast.error(msg || 'You do not have permission to delete orders');
      } else {
        toast.error(msg || 'Failed to delete order');
      }
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
      } catch (e: any) {
        const msg = e.response?.data?.message;
        if (e.response?.status === 403) {
          toast.error(msg || 'You do not have permission to delete orders');
        } else {
          toast.error(msg || 'Failed to delete selected orders');
        }
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

  const [syncingSteadfast, setSyncingSteadfast] = useState(false);

  const syncAllSteadfast = async () => {
    if (!confirm('Sync all Steadfast order statuses? This may take a while.')) return;
    setSyncingSteadfast(true);
    try {
      const res = await apiClient.post('/order-management/steadfast/sync-all');
      const data = res.data;
      toast.success(`Synced ${data.synced} of ${data.total} orders. Failed: ${data.failed}.`);
      await loadOrders();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to sync Steadfast statuses');
    } finally {
      setSyncingSteadfast(false);
    }
  };

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
      if (modalMode === 'add') {
        // Simplified create: Name, Phone, Products, Shipping Address. Status = processing.
        if (orderItems.length === 0) {
          toast.error('Please add at least one product');
          return;
        }
        const itemsTotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const totalAmount = itemsTotal + (deliveryCharge || 0);
        const payload: any = {
          customerName: formData.customer_name ? String(formData.customer_name).trim() : null,
          customerPhone: formData.customer_phone ? String(formData.customer_phone).trim() : null,
          shippingAddress: formData.shipping_address ? String(formData.shipping_address) : null,
          courierNotes: formData.courier_notes ? String(formData.courier_notes) : null,
          internalNotes: formData.internal_notes ? String(formData.internal_notes) : null,
          deliveryCharge: deliveryCharge || 0,
          status: 'processing',
          orderDate: new Date().toISOString(),
          totalAmount,
          order_source: 'admin_panel',
        };
        const response = await apiClient.post('/sales', payload);
        const newOrderId = response.data?.id;

        // Add each product as an order item
        if (newOrderId && orderItems.length > 0) {
          try {
            await Promise.all(
              orderItems.map(item =>
                apiClient.post(`/order-management/${newOrderId}/items`, {
                  productId: item.productId,
                  productName: item.productName,
                  variantName: item.variantName || null,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                })
              )
            );
          } catch (itemError) {
            console.error('Failed to add products to order:', itemError);
            toast.warning('Order created but some products failed to add');
          }
        }
        toast.success('Order created successfully');
      } else if (modalMode === 'edit' && selectedOrder) {
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
        };
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
    setSelectedRowIds([]);
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
    setSelectedRowIds([]);
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
        // Use order_date for the date, createdAt for the time (order_date is DATE-only, no time)
        const dateRaw = row.order_date ?? row.orderDate ?? row.created_at ?? row.createdAt;
        const timeRaw = row.created_at ?? row.createdAt;
        if (!dateRaw) return '-';
        const dd = new Date(dateRaw);
        if (isNaN(dd.getTime())) return '-';
        const date = dd.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' });
        // Only show time from createdAt (which has actual timestamp)
        let time = '';
        if (timeRaw) {
          const td = new Date(timeRaw);
          if (!isNaN(td.getTime())) {
            time = td.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });
          }
        }
        return (
          <div>
            <div>{date}</div>
            {time && <div className="text-xs text-gray-500">{time}</div>}
          </div>
        );
      }
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (_: any, row: SalesOrder) => {
        const name = row.customerName ?? row.customer_name ?? '-';
        const phone = row.customerPhone ?? row.customer_phone ?? '';
        return (
          <div>
            <div>{wrapCustomerName(name)}</div>
            {row.isRejectedCustomer && (
              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                ⚠ Rejected
              </span>
            )}
            {(row.activeCouponCodes ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(row.activeCouponCodes ?? []).map((code) => (
                  <span key={code} className="inline-flex items-center px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded tracking-wide" title="Active unused coupon">
                    🎟 {code}
                  </span>
                ))}
              </div>
            )}
            {(row.customerTags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(row.customerTags ?? []).map((tag) => (
                  <span
                    key={tag.name}
                    className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded tracking-wide"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}20` : '#e0e7ff',
                      color: tag.color || '#4338ca',
                    }}
                    title="Customer tag"
                  >
                    🏷 {tag.name}
                  </span>
                ))}
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                <FaPhone className="text-[10px]" />
                <a
                  href={`tel:${phone}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                  title="Call via microSIP"
                  onClick={(e) => e.stopPropagation()}
                >
                  {phone}
                </a>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 p-0.5"
                  title="Copy number"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(phone);
                    toast.success('Phone number copied');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                </button>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'customerTotalOrders',
      label: 'Total Orders',
      render: (_: any, row: SalesOrder) => {
        const count = (row as any).customerTotalOrders ?? 0;
        return (
          <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
            {count}
          </span>
        );
      }
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
      key: 'items',
      label: 'Products',
      className: 'min-w-[200px] !whitespace-normal',
      render: (_: any, row: SalesOrder) => {
        const items = row.items || [];
        if (items.length === 0) return <span className="text-gray-400 text-xs">No items</span>;
        return (
          <div className="text-xs max-h-32 overflow-y-auto" style={{ whiteSpace: 'normal' }}>
            {items.map((item, idx) => {
              const isEditing = editingProductName?.orderId === row.id && editingProductName?.itemIndex === idx;
              if (isEditing) {
                return (
                  <div key={idx} className="my-1">
                    <textarea
                      value={editProductNameValue}
                      onChange={(e) => setEditProductNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveProductName(); }
                        if (e.key === 'Escape') cancelEditProductName();
                      }}
                      className="border border-blue-400 rounded px-2 py-1.5 text-xs w-full min-h-[60px] resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                      disabled={savingProductName}
                      rows={3}
                    />
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        onClick={saveProductName}
                        disabled={savingProductName}
                        className="text-green-600 hover:text-green-800 p-0.5 flex-shrink-0"
                        title="Save (Enter)"
                      >
                        <FaCheck size={12} />
                      </button>
                      <button
                        onClick={cancelEditProductName}
                        disabled={savingProductName}
                        className="text-red-500 hover:text-red-700 p-0.5 flex-shrink-0"
                        title="Cancel (Esc)"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={idx} className="flex items-center gap-1 my-0.5">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      const displayedName = (item.customProductName || item.productNameBn || item.productName || '') + (item.variantName ? ` - ${item.variantName}` : '');
                      startEditProductName(row.id, idx, displayedName);
                    }}
                    className="cursor-pointer hover:text-blue-600 hover:underline border-b border-dashed border-gray-300"
                    title="Click to edit product name"
                  >
                    {item.customProductName || item.productNameBn || item.productName}{item.variantName ? ` - ${item.variantName}` : ''}
                  </span>
                  {item.customProductName && (
                    <span className="text-[9px] text-orange-500 flex-shrink-0" title="Custom name (original product unchanged)">✎</span>
                  )}
                  <span className="text-gray-500 flex-shrink-0">(x{item.quantity})</span>
                </div>
              );
            })}
          </div>
        );
      },
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
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getOrderStatusColor(value)}`}>
            {getOrderStatusLabel(value)}
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

            {hasPermission('sync-steadfast') && (
              <button
                type="button"
                onClick={syncAllSteadfast}
                disabled={syncingSteadfast}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center gap-1.5"
              >
                <FaSync className={syncingSteadfast ? 'animate-spin' : ''} />
                {syncingSteadfast ? 'Syncing...' : 'Sync Steadfast'}
              </button>
            )}

            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Bulk Actions</option>
              <option value="delete">Delete Selected</option>
              <option value="processing">Mark as Processing</option>
              <option value="completed">Mark as Completed</option>
              <option value="admin_cancelled">Mark as Order Rejected</option>
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
                    { value: 'processing', label: 'Processing' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'sent', label: 'Sent' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'in_review', label: 'In Review' },
                    { value: 'in_transit', label: 'In Transit' },
                    { value: 'picked', label: 'Picked' },
                    { value: 'hold', label: 'Hold' },
                    { value: 'shipped', label: 'Shipped' },
                    { value: 'delivered', label: 'Delivered' },
                    { value: 'partial_delivered', label: 'Partial Delivered' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'admin_cancelled', label: 'Order Rejected' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'returned', label: 'Returned' },
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
              </div>

              {/* 3rd line: Product filter + Source filter */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <ProductAutocomplete
                    value={filters.productName}
                    onChange={(val) => { setFilters((prev) => ({ ...prev, productName: val })); setSelectedRowIds([]); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <FormInput
                  label="Source"
                  name="source"
                  type="select"
                  value={filters.source}
                  onChange={handleFilterChange}
                  selectPlaceholder="All Sources"
                  options={sourceOptions}
                />
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
          onDelete={handleDelete}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          rowClassName={(row: SalesOrder) => row.isRejectedCustomer ? 'bg-red-50 border-l-4 border-l-red-400' : ''}
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
          ) : modalMode === 'add' ? (
            /* ===== SIMPLIFIED CREATE ORDER FORM ===== */
            <form id="order-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Customer Name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Customer name"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                  <PhoneInput
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={(value) => setFormData((prev: any) => ({ ...prev, customer_phone: value }))}
                    required
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>

              {/* Product Search & Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Products <span className="text-red-500">*</span></label>
                <div className="relative" ref={productDropdownRef}>
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => searchProducts(e.target.value)}
                    onFocus={() => productSearchResults.length > 0 && setShowProductDropdown(true)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search products to add..."
                  />
                  {searchingProducts && (
                    <span className="absolute right-3 top-2.5 text-gray-400 text-sm">Searching...</span>
                  )}
                  {showProductDropdown && productSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                      {productSearchResults.map((product) => {
                        const salePrice = Number(product.sale_price || product.base_price || product.price || 0);
                        const basePrice = Number(product.base_price || product.price || 0);
                        const hasDiscount = product.sale_price && salePrice < basePrice;
                        const rawVariants = (() => {
                          let sv = product.size_variants;
                          if (!sv) return [];
                          if (typeof sv === 'string') { try { sv = JSON.parse(sv); } catch { return []; } }
                          if (!Array.isArray(sv)) return [];
                          return sv;
                        })();
                        const variants: Array<{ name: string; price: number; stock?: number; sku_suffix?: string }> = rawVariants.filter((v: any) => v && typeof v.name === 'string' && v.name.trim().length > 0 && v.price != null && Number(v.price) > 0);
                        const isExpanded = expandedProductId === product.id;
                        return (
                          <div key={product.id} className="border-b last:border-b-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (variants.length > 0) {
                                  setExpandedProductId(isExpanded ? null : product.id);
                                } else {
                                  addProductToOrder(product);
                                }
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                            >
                              {(product.image_url || product.image) && (
                                <img
                                  src={product.image_url || product.image}
                                  alt=""
                                  className="w-10 h-10 object-contain rounded border flex-shrink-0"
                                  crossOrigin="anonymous"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate flex items-center gap-1">
                                  {variants.length > 0 && (
                                    <span className={`text-xs transition-transform inline-block ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                  )}
                                  {product.name_en || product.name}
                                </div>
                                {product.name_bn && <div className="text-xs text-gray-500 truncate">{product.name_bn}</div>}
                                {variants.length > 0 && (
                                  <div className="text-xs text-blue-500 mt-0.5">{variants.length} variant{variants.length > 1 ? 's' : ''} available</div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                {variants.length === 0 && (
                                  <>
                                    <div className="text-sm font-semibold text-blue-600">৳{salePrice.toFixed(2)}</div>
                                    {hasDiscount && (
                                      <div className="text-xs text-gray-400 line-through">৳{basePrice.toFixed(2)}</div>
                                    )}
                                  </>
                                )}
                              </div>
                            </button>
                            {/* Variant sub-items */}
                            {variants.length > 0 && isExpanded && (
                              <div className="bg-gray-50 border-t">
                                {variants.map((v, vi) => (
                                  <button
                                    key={vi}
                                    type="button"
                                    onClick={() => addProductToOrder(product, v)}
                                    className="w-full text-left pl-10 pr-3 py-2 hover:bg-blue-100 flex items-center gap-3 transition-colors border-b last:border-b-0 border-gray-100"
                                  >
                                    <span className="text-gray-400 text-xs">├─</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm text-gray-800">{v.name}</div>
                                      {v.sku_suffix && <div className="text-xs text-gray-400">SKU: {v.sku_suffix}</div>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <div className="text-sm font-semibold text-green-600">৳{Number(v.price).toFixed(2)}</div>
                                      {v.stock !== undefined && v.stock !== null && (
                                        <div className="text-xs text-gray-400">Stock: {v.stock}</div>
                                      )}
                                    </div>
                                  </button>
                                ))}
                                {/* Option to select base product without variant */}
                                <button
                                  type="button"
                                  onClick={() => addProductToOrder(product)}
                                  className="w-full text-left pl-10 pr-3 py-2 hover:bg-yellow-50 flex items-center gap-3 transition-colors border-t border-gray-200"
                                >
                                  <span className="text-gray-400 text-xs">└─</span>
                                  <div className="flex-1 text-sm text-gray-500 italic">Base product (no variant)</div>
                                  <div className="text-sm font-semibold text-blue-600">৳{salePrice.toFixed(2)}</div>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Products List */}
                {orderItems.length > 0 && (
                  <div className="mt-3 border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Product</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-600 w-24">Qty</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Price</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Subtotal</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {orderItems.map((item) => (
                          <tr key={`${item.productId}-${item.variantName}`} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{item.productNameBn || item.productName}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateOrderItemQty(item.productId, item.variantName, parseInt(e.target.value) || 1)}
                                className="w-16 text-center border rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">৳{item.unitPrice.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-medium">৳{(item.quantity * item.unitPrice).toFixed(2)}</td>
                            <td className="px-1 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeProductFromOrder(item.productId, item.variantName)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Remove"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="bg-gray-50 px-3 py-2 space-y-1 border-t">
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>Subtotal:</span>
                        <span>৳{orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>Delivery Charge:</span>
                        <span>৳{(deliveryCharge || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-1">
                        <span className="font-semibold text-gray-700">Total:</span>
                        <span className="font-bold text-lg text-blue-600">
                          ৳{(orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) + (deliveryCharge || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Charge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charge (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
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
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Courier Notes"
                  name="courier_notes"
                  type="textarea"
                  value={formData.courier_notes}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Notes for courier"
                />
                <FormInput
                  label="Internal Notes"
                  name="internal_notes"
                  type="textarea"
                  value={formData.internal_notes}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Internal notes (not visible to customer)"
                />
              </div>
            </form>
          ) : (
            /* ===== EDIT ORDER FORM (full fields) ===== */
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
                    { value: 'processing', label: 'Processing' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'admin_cancelled', label: 'Order Rejected' }
                  ]}
                />
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
