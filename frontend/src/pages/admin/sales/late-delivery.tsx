import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import FormInput from '@/components/admin/FormInput';
import Modal from '@/components/admin/Modal';
import ProductAutocomplete from '@/components/admin/ProductAutocomplete';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import { getOrderStatusLabel, getOrderStatusColor } from '@/utils/orderStatus';
import { FaSearch, FaFilter, FaTimes, FaEye, FaStickyNote, FaExternalLinkAlt, FaCheck, FaUserCheck, FaUserEdit, FaUserSlash } from 'react-icons/fa';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDhakaDateString } from '@/utils/dhakaDate';
import { ORDER_REJECTION_REASON_OPTIONS } from '@/constants/adminOptions';

interface SalesOrder {
  id: number;
  salesOrderNumber?: string;
  sales_order_number?: string;
  order_number?: string;

  customerName?: string | null;
  customer_name?: string | null;
  customerPhone?: string | null;
  customer_phone?: string | null;

  status?: string;

  shippedAt?: string | null;
  shipped_at?: string | null;
  deliveredAt?: string | null;
  delivered_at?: string | null;
  cancelledAt?: string | null;
  cancelled_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;

  courierCompany?: string | null;
  courier_company?: string | null;
  courierOrderId?: string | null;
  courier_order_id?: string | null;
  trackingId?: string | null;
  tracking_id?: string | null;

  notes?: string | null;
  courier_notes?: string | null;
  internal_notes?: string | null;
  late_delivery_note?: string | null;
  cancelled_order_note?: string | null;
  rider_instructions?: string | null;

  order_source?: string | null;
  order_source_display?: string | null;
  orderSource?: string | null;
  created_by?: number | null;
  createdBy?: number | null;
  created_by_name?: string | null;
  createdByName?: string | null;
  assigned_to?: number | null;
  assignedTo?: number | null;
  assigned_to_name?: string | null;
  assignedToName?: string | null;
  assigned_at?: string | null;
  assignedAt?: string | null;
  telephony_called_at?: string | null;
  telephony_outcome?: string | null;
  cancel_reason?: string | null;
  cancelReason?: string | null;

  items?: { productName: string | null; productNameBn?: string | null; variantName?: string | null; quantity: number }[];

  createdAt?: string;
  created_at?: string;
  order_date?: string;
  orderDate?: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
];

const CANCELLED_STATUS_OPTIONS = [
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'pickup_failed', label: 'Pickup Failed' },
  { value: 'returned', label: 'Returned' },
];

const COURIER_COMPANY_OPTIONS = [
  { value: 'steadfast', label: 'Steadfast' },
  { value: 'pathao', label: 'Pathao' },
  { value: 'redx', label: 'RedX' },
  { value: 'paperfly', label: 'Paperfly' },
];

const MANUAL_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'partial_delivered', label: 'Partial Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'admin_cancelled', label: 'Order Rejected' },
  { value: 'pickup_failed', label: 'Pickup Failed' },
];

const CANCELLED_MANUAL_STATUS_OPTIONS = [
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'pickup_failed', label: 'Pickup Failed' },
  { value: 'returned', label: 'Returned' },
];

const REJECTED_STATUS_OPTIONS = [
  { value: 'admin_cancelled', label: 'Order Rejected' },
];

const INITIAL_FILTERS = {
  q: '',
  courierCompany: '',
  shippedFrom: '',
  shippedTo: '',
  status: '',
  source: '',
  cancelReason: '',
  productName: '',
  totalCancelledOrders: '',
};

type SalesFollowupMode = 'late-delivery' | 'cancelled-orders' | 'rejected-orders';

const MODE_CONFIG = {
  'late-delivery': {
    title: 'Late Delivery',
    description: 'Orders not delivered within the SLA',
    endpoint: '/sales/late-deliveries',
    dateColumnLabel: 'Order Date',
    dateFromLabel: 'Order Date From',
    dateToLabel: 'Order Date To',
    emptyLoadMessage: 'Failed to load late deliveries:',
    notePayloadKey: 'courierNotes',
    noteField: (row: SalesOrder) => row.courier_notes || row.late_delivery_note || row.internal_notes || '',
    dateField: (row: SalesOrder) => row.orderDate ?? row.order_date ?? row.createdAt ?? row.created_at ?? row.shippedAt ?? row.shipped_at ?? null,
    filterDateField: (row: SalesOrder) => row.orderDate ?? row.order_date ?? row.createdAt ?? row.created_at ?? null,
    statusOptions: STATUS_OPTIONS,
    manualStatusOptions: MANUAL_STATUS_OPTIONS,
    allowStatusUpdate: true,
  },
  'cancelled-orders': {
    title: 'Cancelled Orders',
    description: 'Cancelled and returned sales orders that need follow-up notes',
    endpoint: '/sales/cancelled-orders',
    dateColumnLabel: 'Cancelled At',
    dateFromLabel: 'Cancelled From',
    dateToLabel: 'Cancelled To',
    emptyLoadMessage: 'Failed to load cancelled orders:',
    notePayloadKey: 'cancelledOrderNote',
    noteField: (row: SalesOrder) => row.cancelled_order_note || '',
    dateField: (row: SalesOrder) => row.cancelledAt ?? row.cancelled_at ?? row.updatedAt ?? row.updated_at ?? row.createdAt ?? row.created_at ?? row.order_date ?? row.orderDate ?? null,
    statusOptions: CANCELLED_STATUS_OPTIONS,
    manualStatusOptions: CANCELLED_MANUAL_STATUS_OPTIONS,
    allowStatusUpdate: false,
  },
  'rejected-orders': {
    title: 'Rejected Orders',
    description: 'Rejected sales orders that need follow-up notes',
    endpoint: '/sales/rejected-orders',
    dateColumnLabel: 'Rejected At',
    dateFromLabel: 'Rejected From',
    dateToLabel: 'Rejected To',
    emptyLoadMessage: 'Failed to load rejected orders:',
    notePayloadKey: 'cancelledOrderNote',
    noteField: (row: SalesOrder) => row.cancelled_order_note || '',
    dateField: (row: SalesOrder) => row.cancelledAt ?? row.cancelled_at ?? row.updatedAt ?? row.updated_at ?? row.createdAt ?? row.created_at ?? row.order_date ?? row.orderDate ?? null,
    statusOptions: REJECTED_STATUS_OPTIONS,
    manualStatusOptions: REJECTED_STATUS_OPTIONS,
    allowStatusUpdate: false,
  },
} as const;

function formatDateTime(raw: any) {
  if (!raw) return { date: '-', time: '' };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { date: '-', time: '' };
  const date = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

function getDaysSinceShipped(shippedAt: any): number | null {
  if (!shippedAt) return null;
  const d = new Date(shippedAt);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getCourierTrackingUrl(courierCompany: string | null | undefined, trackingId: string | null | undefined, courierOrderId?: string | null): string | null {
  const company = (courierCompany || '').toLowerCase().trim();
  if (company.includes('steadfast')) {
    if (!courierOrderId) return null;
    return `https://steadfast.com.bd/user/consignment/${courierOrderId}`;
  }
  if (!trackingId) return null;
  if (company.includes('pathao')) {
    return `https://merchant.pathao.com/courier/orders/${encodeURIComponent(trackingId)}?isShowingActive=1`;
  }
  if (company.includes('redx')) {
    return `https://redx.com.bd/track-parcel/?trackingId=${trackingId}`;
  }
  return null;
}

// Format note with timestamp and agent name
function formatNoteWithMeta(noteText: string, agentName: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });
  return `[${dateStr} ${timeStr} - ${agentName}]\n${noteText.trim()}`;
}

// Parse note to extract just the text content (without meta header)
function parseNoteContent(fullNote: string | null | undefined): string {
  if (!fullNote) return '';
  const match = fullNote.match(/^\[.*?\]\n([\s\S]*)$/);
  return match ? match[1].trim() : fullNote.trim();
}

// Parse note meta (date/agent) from the header
function parseNoteMeta(fullNote: string | null | undefined): { date: string; agent: string } | null {
  if (!fullNote) return null;
  const match = fullNote.match(/^\[(.*?)\s*-\s*(.*?)\]\n/);
  if (!match) return null;
  return { date: match[1].trim(), agent: match[2].trim() };
}

export function SalesFollowupOrdersPage({ mode = 'late-delivery' }: { mode?: SalesFollowupMode }) {
  const config = MODE_CONFIG[mode];
  const toast = useToast();
  const { user: authUser, hasPermission } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Array<number | string>>([]);
  const [assignmentAgents, setAssignmentAgents] = useState<{ id: number; name: string; inMyTeam?: boolean }[]>([]);
  const [assignmentOrder, setAssignmentOrder] = useState<SalesOrder | null>(null);
  const [isBulkAssignmentOpen, setIsBulkAssignmentOpen] = useState(false);
  const [selectedAssignAgentId, setSelectedAssignAgentId] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkUpdatingStatus, setBulkUpdatingStatus] = useState(false);
  const canManageOrderAssignment = hasPermission('manage-order-assignment') || hasPermission('manage-assigned-orders');
  const isCancelledOrdersMode = mode === 'cancelled-orders';
  const isRejectedOrdersMode = mode === 'rejected-orders';
  const hasAssignmentSystem = isCancelledOrdersMode || isRejectedOrdersMode;
  const hasBulkSelection = hasAssignmentSystem || mode === 'late-delivery';

  // Dedicated search state with debounce
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(val);
      setCurrentPage(1);
    }, 280);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Notes editing state
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<number, boolean>>({});
  // Status editing
  const [savingStatus, setSavingStatus] = useState<Record<number, boolean>>({});
  const [sourceOptions, setSourceOptions] = useState<{ value: string; label: string }[]>([]);
  const courierHighlightStorageKey = `sales-followup-courier-highlight:${mode}`;
  const [highlightedCourierRowId, setHighlightedCourierRowId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = window.sessionStorage.getItem(`sales-followup-courier-highlight:${mode}`);
    if (!saved) return null;
    const parsed = Number(saved);
    return Number.isFinite(parsed) ? parsed : null;
  });

  useEffect(() => {
    load();
    apiClient.get('/sales/source-options')
      .then((res) => setSourceOptions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSourceOptions([]));
    if (hasAssignmentSystem) {
      apiClient.get('/sales/order-assignment-agents')
        .then((res) => setAssignmentAgents(Array.isArray(res.data) ? res.data : []))
        .catch(() => setAssignmentAgents([]));
    }
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(config.endpoint);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(config.emptyLoadMessage, e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  // Save internal note for an order
  const handleSaveNote = useCallback(async (orderId: number) => {
    const noteText = editingNotes[orderId];
    if (noteText === undefined) return;

    setSavingNotes((prev) => ({ ...prev, [orderId]: true }));
    try {
      const agentName = authUser?.name || 'Agent';
      const formattedNote = noteText.trim() ? formatNoteWithMeta(noteText, agentName) : '';
      await apiClient.put(`/order-management/${orderId}/notes`, {
        [config.notePayloadKey]: formattedNote || null,
      });

      const noteField =
        String(config.notePayloadKey) === 'courierNotes'
          ? 'courier_notes'
          : String(config.notePayloadKey) === 'lateDeliveryNote'
            ? 'late_delivery_note'
            : 'cancelled_order_note';
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, [noteField]: formattedNote || null } : o,
        ),
      );
      setEditingNotes((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      toast.success('Note saved');
    } catch (e) {
      console.error('Failed to save note:', e);
      toast.error('Failed to save note');
    } finally {
      setSavingNotes((prev) => ({ ...prev, [orderId]: false }));
    }
  }, [editingNotes, toast, authUser, config.notePayloadKey]);

  // Handle status change
  const handleStatusChange = useCallback(async (orderId: number, newStatus: string) => {
    setSavingStatus((prev) => ({ ...prev, [orderId]: true }));
    try {
      await apiClient.put(`/sales/${orderId}`, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
      toast.success(`Status updated to ${getOrderStatusLabel(newStatus)}`);
    } catch (e) {
      console.error('Failed to update status:', e);
      toast.error('Failed to update status');
    } finally {
      setSavingStatus((prev) => ({ ...prev, [orderId]: false }));
    }
  }, [toast]);

  const cancelledOrderCountByCustomer = useMemo(() => {
    const normalizePhone = (value: any) => String(value || '').replace(/^\+88/, '').trim();
    const getCustomerKey = (order: SalesOrder) => {
      const customerId = Number((order as any).customer_id ?? (order as any).customerId);
      if (Number.isFinite(customerId) && customerId > 0) return `customer:${customerId}`;
      const phone = normalizePhone(order.customerPhone ?? order.customer_phone);
      return phone ? `phone:${phone}` : `order:${order.id}`;
    };

    const counts = new Map<string, number>();
    for (const order of orders) {
      const key = getCustomerKey(order);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return { counts, getCustomerKey };
  }, [orders]);

  const cancelReasonOptions = useMemo(() => {
    const knownReasons = new Set<string>(ORDER_REJECTION_REASON_OPTIONS.map((option) => option.value));
    const extraReasons = new Set<string>();
    for (const order of orders) {
      const reason = String(order.cancelReason ?? order.cancel_reason ?? '').trim();
      if (reason && !knownReasons.has(reason)) extraReasons.add(reason);
    }
    return [
      ...ORDER_REJECTION_REASON_OPTIONS,
      ...Array.from(extraReasons)
        .sort((a, b) => a.localeCompare(b))
        .map((reason) => ({ value: reason, label: reason })),
    ];
  }, [orders]);

  const filtered = useMemo(() => {
    const normalize = (v: any) => (v ?? '').toString().toLowerCase().trim();
    const includes = (field: any, needle: string) => {
      const n = normalize(needle);
      if (!n) return true;
      return normalize(field).includes(n);
    };
    const matchesSourceFilter = (order: SalesOrder, sourceFilter: string) => {
      const filterValue = sourceFilter.trim();
      if (!filterValue) return true;

      const source = (order.orderSource ?? order.order_source ?? '').trim();
      if (filterValue.startsWith('agent:')) {
        const selectedAgentId = Number(filterValue.slice('agent:'.length));
        const createdBy = Number(order.createdBy ?? order.created_by);

        return (
          Number.isFinite(selectedAgentId) &&
          Number.isFinite(createdBy) &&
          createdBy === selectedAgentId &&
          (source === 'admin_panel' || source === 'agent_dashboard')
        );
      }

      return normalize(source) === normalize(filterValue);
    };

    const dateKey = (v: any): string => {
      if (!v) return '';
      if (v instanceof Date && !Number.isNaN(v.getTime())) return getDhakaDateString(v);
      const s = String(v);
      if (s.length >= 10) return s.slice(0, 10);
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return '';
      return getDhakaDateString(d);
    };
    const inDateRange = (field: any, from: string, to: string) => {
      const fromKey = dateKey(from);
      const toKey = dateKey(to);
      if (!fromKey && !toKey) return true;
      const valueKey = dateKey(field);
      if (!valueKey) return false;
      const fromOk = fromKey ? valueKey >= fromKey : true;
      const toOk = toKey ? valueKey <= toKey : true;
      return fromOk && toOk;
    };

    return orders.filter((o) => {
      const customerName = o.customerName ?? o.customer_name ?? '';
      const customerPhone = o.customerPhone ?? o.customer_phone ?? '';
      const courierCompany = o.courierCompany ?? o.courier_company ?? '';
      const relevantDate = 'filterDateField' in config ? config.filterDateField(o) : config.dateField(o);

      // Always-visible search bar
      const sq = normalize(searchQuery);
      if (sq) {
        const orderNum = o.salesOrderNumber ?? o.sales_order_number ?? o.order_number ?? '';
        const courierId = o.courierOrderId ?? o.courier_order_id ?? '';
        const trackId = o.trackingId ?? o.tracking_id ?? '';
        const haystack = [
          o.id, orderNum, customerName, customerPhone,
          courierCompany, courierId, trackId,
          o.status, o.notes, o.internal_notes,
        ].map((v) => normalize(v)).join(' ');
        if (!haystack.includes(sq)) return false;
      }

      // Filter panel (q field removed, kept for old compatibility)
      const q = normalize(filters.q);
      if (q) {
        const haystack = [o.id, customerName, customerPhone, courierCompany, o.status, o.notes, o.courier_notes, o.internal_notes]
          .map((v) => normalize(v))
          .join(' ');
        if (!haystack.includes(q)) return false;
      }

      if (filters.status && normalize(o.status) !== normalize(filters.status)) return false;
      if (!includes(courierCompany, filters.courierCompany)) return false;
      if (filters.source && !matchesSourceFilter(o, filters.source)) return false;
      if (!inDateRange(relevantDate, filters.shippedFrom, filters.shippedTo)) return false;
      if (filters.cancelReason && normalize(o.cancelReason ?? o.cancel_reason) !== normalize(filters.cancelReason)) return false;
      if (filters.productName.trim()) {
        const productFilter = normalize(filters.productName);
        const itemHaystack = (o.items || [])
          .flatMap((item) => [item.productName, item.productNameBn, item.variantName])
          .map((v) => normalize(v))
          .join(' ');
        if (!itemHaystack.includes(productFilter)) return false;
      }
      if (filters.totalCancelledOrders) {
        const totalCancelled = cancelledOrderCountByCustomer.counts.get(cancelledOrderCountByCustomer.getCustomerKey(o)) || 0;
        if (filters.totalCancelledOrders === '6plus') {
          if (totalCancelled < 6) return false;
        } else if (totalCancelled !== Number(filters.totalCancelledOrders)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, filters, searchQuery, config, cancelledOrderCountByCustomer]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRowIds([]);
  }, [filters, searchQuery]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const selectedOrders = useMemo(() => {
    const selectedSet = new Set(selectedRowIds.map((id) => Number(id)));
    return orders.filter((order) => selectedSet.has(order.id));
  }, [orders, selectedRowIds]);

  const handleBulkStatusUpdate = useCallback(async () => {
    if (!config.allowStatusUpdate) return;
    if (selectedOrders.length === 0) {
      toast.warning('Select at least one order');
      return;
    }
    if (!bulkStatus) {
      toast.warning('Select a status first');
      return;
    }

    const statusLabel = getOrderStatusLabel(bulkStatus);
    if (!confirm(`Update ${selectedOrders.length} selected order(s) to ${statusLabel}?`)) return;

    setBulkUpdatingStatus(true);
    try {
      const results = await Promise.allSettled(
        selectedOrders.map((order) => apiClient.put(`/sales/${order.id}`, { status: bulkStatus })),
      );
      const successCount = results.filter((result) => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(`Updated ${successCount} order(s) to ${statusLabel}${failedCount ? `, failed ${failedCount}` : ''}`);
      } else {
        toast.error('Failed to update selected orders');
      }

      setSelectedRowIds([]);
      setBulkStatus('');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update selected orders');
      await load();
    } finally {
      setBulkUpdatingStatus(false);
    }
  }, [bulkStatus, config.allowStatusUpdate, selectedOrders, toast]);

  const openAssignmentModal = (order: SalesOrder) => {
    if (!canManageOrderAssignment) {
      toast.error('You do not have permission to assign orders');
      return;
    }
    setAssignmentOrder(order);
    setSelectedAssignAgentId(order.assigned_to ? String(order.assigned_to) : '');
  };

  const openBulkAssignmentModal = () => {
    if (!canManageOrderAssignment) {
      toast.error('You do not have permission to assign orders');
      return;
    }
    if (selectedOrders.length === 0) {
      toast.warning('Select at least one order');
      return;
    }
    setAssignmentOrder(null);
    setSelectedAssignAgentId('');
    setIsBulkAssignmentOpen(true);
  };

  const closeAssignmentModal = () => {
    setAssignmentOrder(null);
    setIsBulkAssignmentOpen(false);
    setSelectedAssignAgentId('');
  };

  const saveAssignment = async () => {
    if (!assignmentOrder && !isBulkAssignmentOpen) return;
    if (!canManageOrderAssignment) return toast.error('You do not have permission to assign orders');
    const agentId = Number(selectedAssignAgentId);
    if (!Number.isFinite(agentId) || agentId <= 0) return toast.warning('Select an agent first');

    const targetOrders = assignmentOrder ? [assignmentOrder] : selectedOrders;
    setSavingAssignment(true);
    try {
      const res = await apiClient.put('/sales/order-assignments/bulk-assign', {
        orderIds: targetOrders.map((order) => order.id),
        agentId,
      });
      toast.success(assignmentOrder
        ? (assignmentOrder.assigned_to ? 'Assignment updated' : 'Order assigned')
        : `Assigned ${res.data?.assignedCount ?? targetOrders.length} order(s)`);
      setSelectedRowIds([]);
      closeAssignmentModal();
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save assignment');
      await load();
    } finally {
      setSavingAssignment(false);
    }
  };

  const bulkUnassignOrders = async () => {
    if (!canManageOrderAssignment) return toast.error('You do not have permission to unassign orders');
    const ids = selectedOrders.filter((order) => order.assigned_to).map((order) => order.id);
    if (ids.length === 0) return toast.warning('Select at least one assigned order');
    if (!confirm(`Unassign ${ids.length} selected order(s)?`)) return;
    try {
      const res = await apiClient.put('/sales/order-assignments/bulk-unassign', { orderIds: ids });
      toast.success(`Unassigned ${res.data?.unassignedCount ?? ids.length} order(s)`);
      setSelectedRowIds([]);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to unassign orders');
    }
  };

  const unassignOrder = async (orderId: number) => {
    if (!canManageOrderAssignment) return toast.error('You do not have permission to unassign orders');
    if (!confirm('Unassign this order?')) return;
    try {
      await apiClient.put('/sales/order-assignments/bulk-unassign', { orderIds: [orderId] });
      toast.success('Order unassigned');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to unassign order');
    }
  };

  const handleCourierLinkClick = useCallback((orderId: number) => {
    setHighlightedCourierRowId(orderId);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(courierHighlightStorageKey, String(orderId));
    }
  }, [courierHighlightStorageKey]);

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'customer_phone',
      label: 'Phone',
      render: (_: any, row: SalesOrder) => {
        const phone = row.customerPhone ?? row.customer_phone ?? '-';
        return <span className="text-gray-700">{phone}</span>;
      },
    },
    ...(!isRejectedOrdersMode ? [
      {
        key: 'courierOrderId',
        label: 'Courier ID',
        render: (_: any, row: SalesOrder) => {
          const cid = row.courierOrderId ?? row.courier_order_id;
          if (!cid) return <span className="text-gray-400">-</span>;
          const trackingUrl = getCourierTrackingUrl(
            row.courierCompany ?? row.courier_company,
            row.trackingId ?? row.tracking_id,
            row.courierOrderId ?? row.courier_order_id,
          );
          if (trackingUrl) {
            return (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCourierLinkClick(row.id);
                }}
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
        key: 'courier',
        label: 'Courier',
        render: (_: any, row: SalesOrder) => {
          const company = row.courierCompany ?? row.courier_company ?? '-';
          const colorMap: Record<string, string> = {
            steadfast: 'bg-blue-100 text-blue-800',
            pathao: 'bg-red-100 text-red-800',
            redx: 'bg-orange-100 text-orange-800',
          };
          const key = (company || '').toLowerCase().trim();
          const cls = Object.entries(colorMap).find(([k]) => key.includes(k))?.[1] || 'bg-gray-100 text-gray-800';
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
              {company}
            </span>
          );
        },
      },
    ] : []),
    {
      key: 'shippedAt',
      label: config.dateColumnLabel,
      render: (_: any, row: SalesOrder) => {
        const raw = config.dateField(row);
        const { date, time } = formatDateTime(raw);
        const days = mode === 'late-delivery' ? getDaysSinceShipped(raw) : null;
        return (
          <div>
            <div>{date}</div>
            <div className="text-xs text-gray-500">{time}</div>
            {days !== null && (
              <div className={`text-xs font-semibold mt-0.5 ${days > 5 ? 'text-red-600' : days > 3 ? 'text-orange-600' : 'text-yellow-600'}`}>
                {days} day{days !== 1 ? 's' : ''} ago
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'notes',
      label: 'Notes',
      className: 'min-w-[420px] w-[520px] align-top',
      render: (_: any, row: SalesOrder) => {
        const fullNote = config.noteField(row) || '';
        const meta = parseNoteMeta(fullNote);
        const isEditing = editingNotes[row.id] !== undefined;
        const isSaving = savingNotes[row.id] || false;
        const currentContent = parseNoteContent(fullNote);

        if (isEditing) {
          return (
            <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={editingNotes[row.id] ?? ''}
                onChange={(e) => setEditingNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                className="min-h-[120px] w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={5}
                placeholder="Add a note..."
                disabled={isSaving}
              />
              <div className="flex gap-1">
                <button
                  onClick={() => handleSaveNote(row.id)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <FaCheck size={8} />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingNotes((prev) => { const next = { ...prev }; delete next[row.id]; return next; })}
                  disabled={isSaving}
                  className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            className="w-full min-w-[420px] max-w-[560px] cursor-pointer rounded-lg border border-transparent p-2 transition-colors group hover:border-yellow-200 hover:bg-yellow-50"
            onClick={(e) => {
              e.stopPropagation();
              setEditingNotes((prev) => ({ ...prev, [row.id]: currentContent }));
            }}
            title="Click to edit note"
          >
            {fullNote ? (
              <div>
                {meta && (
                  <div className="text-[10px] text-gray-400 mb-0.5">
                    {meta.date} — {meta.agent}
                  </div>
                )}
                <div className="flex items-start gap-1">
                  <FaStickyNote className="text-yellow-500 mt-0.5 flex-shrink-0" size={12} />
                  <span className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">{currentContent}</span>
                </div>
              </div>
            ) : (
              <span className="text-gray-400 text-xs group-hover:text-blue-500 transition-colors">
                + Add note
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'order_source',
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
      },
    },
    ...(hasAssignmentSystem ? [{
      key: 'assigned_to_name',
      label: 'Assigned',
      render: (_: any, row: SalesOrder) => {
        const assignedAt = formatDateTime(row.assigned_at ?? row.assignedAt);
        return (
          <div className="min-w-[150px] text-xs">
            <div className="mb-2">
              {row.assigned_to ? (
                <>
                  <div className="font-semibold text-gray-800">{row.assigned_to_name || `User #${row.assigned_to}`}</div>
                  {row.assigned_at && <div className="text-gray-500">{assignedAt.date}</div>}
                  {row.telephony_called_at && <div className="text-emerald-600">Called</div>}
                  {row.telephony_outcome && <div className="text-gray-500">{String(row.telephony_outcome).replace(/_/g, ' ')}</div>}
                </>
              ) : (
                <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">Unassigned</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openAssignmentModal(row);
                }}
                disabled={!canManageOrderAssignment}
                className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-35"
                title={row.assigned_to ? 'Update assignment' : 'Assign'}
              >
                {row.assigned_to ? <FaUserEdit size={14} /> : <FaUserCheck size={14} />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  unassignOrder(row.id);
                }}
                disabled={!row.assigned_to || !canManageOrderAssignment}
                className="rounded p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-35"
                title="Unassign"
              >
                <FaUserSlash size={14} />
              </button>
            </div>
          </div>
        );
      },
    }] : []),
    {
      key: 'status',
      label: 'Status',
      render: (_: any, row: SalesOrder) => {
        const currentStatus = row.status || '';
        const isSaving = savingStatus[row.id] || false;
        if (!config.allowStatusUpdate) {
          return (
            <span className={`inline-flex items-center rounded-lg px-2 py-1.5 text-xs font-semibold ${getOrderStatusColor(currentStatus)}`}>
              {getOrderStatusLabel(currentStatus)}
            </span>
          );
        }

        return (
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(row.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            disabled={isSaving}
            className={`text-xs font-semibold rounded-lg px-2 py-1.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${getOrderStatusColor(currentStatus)} ${isSaving ? 'opacity-50' : ''}`}
          >
            {!config.manualStatusOptions.find((o) => o.value === currentStatus) && (
              <option value={currentStatus}>{getOrderStatusLabel(currentStatus)}</option>
            )}
            {config.manualStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'items',
      label: 'Products',
      render: (_: any, row: SalesOrder) => {
        const items = row.items ?? [];
        if (items.length === 0) return <span className="text-gray-400 text-xs">-</span>;
        return (
          <div className="max-w-[220px]">
            {items.slice(0, 3).map((item, i) => (
              <div key={i} className="text-xs text-gray-700 truncate" title={`${item.productNameBn || item.productName || 'Unknown'}${item.variantName ? ` (${item.variantName})` : ''} x${item.quantity}`}>
                <span className="font-medium">{item.quantity}x</span>{' '}
                {item.productNameBn || item.productName || 'Unknown'}{item.variantName ? ` (${item.variantName})` : ''}
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-xs text-blue-600 font-medium">+{items.length - 3} more</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Details',
      render: (_: any, row: SalesOrder) => (
        <button
          type="button"
          onClick={() => {
            setSelectedOrderId(row.id);
            setShowOrderDetails(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <FaEye size={12} />
          Details
        </button>
      ),
    },
  ];

  const activeFilterCount = Object.entries(filters)
    .filter(([k, v]) => k !== 'q' && String(v).trim() !== '')
    .length;

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{config.title}</h1>
            <p className="text-gray-600 mt-1">
              {config.description}
              {!loading && <span className="ml-2 text-sm font-medium text-gray-500">({filtered.length} order{filtered.length !== 1 ? 's' : ''})</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FaFilter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── Always-visible Search Bar ── */}
        <div className="mb-4">
          <div className="relative max-w-2xl">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search by order number, customer name, phone, courier ID, tracking ID…"
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                aria-label="Clear search"
              >
                <FaTimes size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-500" size={14} />
                <h2 className="text-sm font-semibold text-gray-700">Filter Orders</h2>
                {activeFilterCount > 0 && (
                  <span className="text-xs text-gray-500">({activeFilterCount} active)</span>
                )}
              </div>
              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FaTimes size={10} />
                Clear All
              </button>
            </div>

            <div className="p-5">
              {/* Filter grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {!isRejectedOrdersMode && (
                  <>
                    <FormInput
                      label="Order Status"
                      name="status"
                      type="select"
                      value={filters.status}
                      onChange={handleFilterChange}
                      options={config.statusOptions}
                    />
                    <FormInput
                      label="Courier Company"
                      name="courierCompany"
                      type="select"
                      value={filters.courierCompany}
                      onChange={handleFilterChange}
                      options={COURIER_COMPANY_OPTIONS}
                    />
                  </>
                )}
                <FormInput
                  label="Source"
                  name="source"
                  type="select"
                  value={filters.source}
                  onChange={handleFilterChange}
                  selectPlaceholder="All Sources"
                  options={sourceOptions}
                />
                <FormInput label={config.dateFromLabel} name="shippedFrom" type="date" value={filters.shippedFrom} onChange={handleFilterChange} />
                <FormInput label={config.dateToLabel} name="shippedTo" type="date" value={filters.shippedTo} onChange={handleFilterChange} />
                {(isCancelledOrdersMode || isRejectedOrdersMode) && (
                  <>
                    <FormInput
                      label={isRejectedOrdersMode ? 'Rejection Reason' : 'Reject Reason'}
                      name="cancelReason"
                      type="select"
                      value={filters.cancelReason}
                      onChange={handleFilterChange}
                      selectPlaceholder="All Reasons"
                      options={cancelReasonOptions}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                      <ProductAutocomplete
                        value={filters.productName}
                        onChange={(val) => setFilters((prev) => ({ ...prev, productName: val }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <FormInput
                      label={isRejectedOrdersMode ? 'Total Rejected Orders' : 'Total Cancelled Orders'}
                      name="totalCancelledOrders"
                      type="select"
                      value={filters.totalCancelledOrders}
                      onChange={handleFilterChange}
                      selectPlaceholder="All"
                      options={[
                        { value: '1', label: '1 time' },
                        { value: '2', label: '2 times' },
                        { value: '3', label: '3 times' },
                        { value: '4', label: '4 times' },
                        { value: '5', label: '5 times' },
                        { value: '6plus', label: '6+ times' },
                      ]}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {hasAssignmentSystem && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{selectedRowIds.length}</span> selected
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openBulkAssignmentModal}
                disabled={selectedRowIds.length === 0 || !canManageOrderAssignment}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-emerald-700"
              >
                <FaUserCheck />
                Bulk Assign
              </button>
              <button
                type="button"
                onClick={bulkUnassignOrders}
                disabled={selectedRowIds.length === 0 || !canManageOrderAssignment}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-red-700"
              >
                <FaUserSlash />
                Bulk Unassign
              </button>
            </div>
          </div>
        )}

        {mode === 'late-delivery' && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{selectedRowIds.length}</span> selected
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                disabled={bulkUpdatingStatus}
                className="min-w-[190px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">Select status</option>
                {config.manualStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkStatusUpdate}
                disabled={selectedRowIds.length === 0 || !bulkStatus || bulkUpdatingStatus}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700"
              >
                <FaCheck />
                {bulkUpdatingStatus ? 'Updating...' : 'Bulk Update Status'}
              </button>
            </div>
          </div>
        )}

        {/* Page size */}
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
          data={paginated}
          loading={loading}
          selection={hasBulkSelection ? {
            selectedRowIds,
            onChange: setSelectedRowIds,
            getRowId: (row: SalesOrder) => row.id,
          } : undefined}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          rowClassName={(row: SalesOrder) =>
            row.id === highlightedCourierRowId
              ? 'bg-amber-50 hover:bg-amber-50 ring-1 ring-inset ring-amber-300'
              : ''
          }
        />

        {hasAssignmentSystem && (
          <Modal
            isOpen={assignmentOrder != null || isBulkAssignmentOpen}
            onClose={closeAssignmentModal}
            title={isBulkAssignmentOpen ? 'Bulk Assign Orders' : assignmentOrder?.assigned_to ? 'Update Assignment' : 'Assign Order'}
            footer={
              <>
                <button
                  type="button"
                  onClick={closeAssignmentModal}
                  disabled={savingAssignment}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAssignment}
                  disabled={savingAssignment || !selectedAssignAgentId}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingAssignment ? 'Saving...' : 'Save Assignment'}
                </button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-500">{isBulkAssignmentOpen ? 'Selected Orders' : 'Order'}</div>
                <div className="font-semibold text-gray-900">
                  {isBulkAssignmentOpen
                    ? `${selectedOrders.length} order(s)`
                    : assignmentOrder?.sales_order_number || assignmentOrder?.salesOrderNumber || assignmentOrder?.order_number || assignmentOrder?.id}
                </div>
                {!isBulkAssignmentOpen && (
                  <div className="mt-1 text-sm text-gray-600">
                    Current: {assignmentOrder?.assigned_to_name || 'Unassigned'}
                  </div>
                )}
              </div>

              <FormInput
                label="Agent"
                name="agentId"
                type="select"
                value={selectedAssignAgentId}
                onChange={(e) => setSelectedAssignAgentId(e.target.value)}
                selectPlaceholder="Select agent"
                options={assignmentAgents.map((agent) => ({
                  value: agent.id,
                  label: agent.inMyTeam === false ? `${agent.name} (other team)` : agent.name,
                }))}
              />

              <p className="text-sm text-gray-500">
                Choose an agent and save. If assignment permissions or team ownership changed, the server will reject the action and refresh the list.
              </p>
            </div>
          </Modal>
        )}

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrderId && (
          <AdminOrderDetailsModal
            orderId={selectedOrderId}
            onClose={() => {
              setShowOrderDetails(false);
              setSelectedOrderId(null);
            }}
            onUpdate={() => load()}
          />
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminSalesLateDelivery() {
  return <SalesFollowupOrdersPage mode="late-delivery" />;
}
