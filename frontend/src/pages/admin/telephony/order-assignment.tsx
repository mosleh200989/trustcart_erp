import { useEffect, useState } from 'react';
import { FaCalendarAlt, FaCheckCircle, FaCopy, FaHistory, FaPhone, FaShare, FaSms, FaSyncAlt, FaWhatsapp } from 'react-icons/fa';
import AdminLayout from '@/layouts/AdminLayout';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import ProductAutocomplete from '@/components/admin/ProductAutocomplete';
import CallOutcomeSelect from '@/components/admin/CallOutcomeSelect';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { getOrderStatusColor, getOrderStatusLabel } from '@/utils/orderStatus';
import { getDhakaDateString } from '@/utils/dhakaDate';
import { CALL_OUTCOME_OPTIONS, type CallOutcomeValue } from '@/constants/adminOptions';

type FilterCalledStatus = 'all' | 'called_today' | 'called_1week' | 'called_2weeks' | 'called_3weeks' | 'called_1month' | 'called_2months' | 'called_3months_plus' | 'never';
type FilterOutcome = 'all' | CallOutcomeValue;
type CallOutcome = Exclude<FilterOutcome, 'all'> | '';

type AssignedOrder = {
  id: number;
  recordType?: 'sales_order' | 'incomplete_order' | string;
  assignmentWorkType?: 'primary_leads' | 'unreachable_followup' | 'incomplete_recovery' | 'rejected_recovery' | string;
  canHandoffNoAnswer?: boolean;
  salesOrderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerTotalOrders?: number;
  shippingAddress?: string;
  status: string;
  orderSource?: string | null;
  totalAmount: number;
  orderDate?: string;
  assignedAt?: string;
  calledAt?: string | null;
  outcome?: string | null;
  suggestion?: string | null;
  notes?: string | null;
  lastCallLog?: AssignmentCallLog | null;
  items?: Array<{ productName: string; productNameBn?: string | null; variantName?: string | null; quantity: number }>;
};

type AssignmentCallLog = {
  id: number;
  recordType?: string;
  assignmentType?: string | null;
  orderId: number;
  callerUserId?: number | null;
  callerName?: string | null;
  outcome?: string | null;
  suggestion?: string | null;
  notes: string;
  calledAt?: string | null;
  createdAt?: string | null;
};

type AssignmentType = 'order' | 'incomplete' | 'cancelled' | 'rejected';

const PAGE_COPY: Record<AssignmentType, { title: string; description: string; empty: string }> = {
  order: {
    title: 'Order Assignment',
    description: 'Orders assigned to you for telephony follow-up.',
    empty: 'No assigned orders found.',
  },
  incomplete: {
    title: 'Incomplete Assignment',
    description: 'Incomplete orders assigned to you for recovery calls.',
    empty: 'No assigned incomplete orders found.',
  },
  cancelled: {
    title: 'Cancelled Assignment',
    description: 'Cancelled and returned orders assigned to you for follow-up.',
    empty: 'No assigned cancelled orders found.',
  },
  rejected: {
    title: 'Rejected Assignment',
    description: 'Rejected orders assigned to you for follow-up.',
    empty: 'No assigned rejected orders found.',
  },
};

const OUTCOMES = CALL_OUTCOME_OPTIONS;

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toBackendCalledStatus(value: FilterCalledStatus) {
  if (value === 'never') return 'never';
  return value === 'all' ? '' : value;
}

function formatSource(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Unknown';
  if (normalized === 'landing_page') return 'Landing Page';
  if (normalized === 'website' || normalized === 'web') return 'Website';
  if (normalized === 'agent' || normalized === 'agent_order') return 'Agent';
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TelephonyOrderAssignmentPage({ assignmentType = 'order' }: { assignmentType?: AssignmentType }) {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canViewCallLogs = hasPermission('view-call-logs');
  const pageCopy = PAGE_COPY[assignmentType] || PAGE_COPY.order;
  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [calledFilter, setCalledFilter] = useState<FilterCalledStatus>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<FilterOutcome>('all');
  const [appliedFilters, setAppliedFilters] = useState({ searchTerm: '', productFilter: '', tierFilter: '', statusFilter: '', calledFilter: 'all' as FilterCalledStatus, outcomeFilter: 'all' as FilterOutcome });
  const [selectedOrder, setSelectedOrder] = useState<AssignedOrder | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [callActionFollowUpDate, setCallActionFollowUpDate] = useState('');
  const [callActionFollowUpTime, setCallActionFollowUpTime] = useState('');
  const [callActionNotes, setCallActionNotes] = useState('');
  const [callActionProductSuggestion, setCallActionProductSuggestion] = useState('');
  const [callActionOutcome, setCallActionOutcome] = useState<CallOutcome>('');
  const [savingCallAction, setSavingCallAction] = useState(false);
  const [handoffOrderId, setHandoffOrderId] = useState<number | null>(null);
  const [historyOrder, setHistoryOrder] = useState<AssignedOrder | null>(null);
  const [callHistory, setCallHistory] = useState<AssignmentCallLog[]>([]);
  const [loadingCallHistory, setLoadingCallHistory] = useState(false);

  const loadOrders = async (nextPage = page, nextLimit = limit, filters = appliedFilters) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(nextPage), limit: String(nextLimit) };
      if (assignmentType !== 'order') params.assignmentType = assignmentType;
      if (filters.searchTerm.trim()) params.q = filters.searchTerm.trim();
      if (filters.productFilter.trim()) params.productName = filters.productFilter.trim();
      if (filters.tierFilter) params.customerType = filters.tierFilter;
      if (filters.statusFilter) params.status = filters.statusFilter;
      const calledStatus = toBackendCalledStatus(filters.calledFilter);
      if (calledStatus) params.calledStatus = calledStatus;
      if (filters.outcomeFilter !== 'all') params.outcome = filters.outcomeFilter;
      const res = await apiClient.get('/telephony/order-assignments', { params });
      setOrders(Array.isArray(res.data?.data) ? res.data.data : []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load assigned orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(page, limit, appliedFilters);
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setAppliedFilters({ searchTerm, productFilter, tierFilter, statusFilter, calledFilter, outcomeFilter });
    }, searchTerm.trim() || productFilter.trim() ? 400 : 0);
    return () => clearTimeout(timer);
  }, [searchTerm, productFilter, tierFilter, statusFilter, calledFilter, outcomeFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setProductFilter('');
    setTierFilter('');
    setStatusFilter('');
    setCalledFilter('all');
    setOutcomeFilter('all');
    setPage(1);
    setAppliedFilters({ searchTerm: '', productFilter: '', tierFilter: '', statusFilter: '', calledFilter: 'all', outcomeFilter: 'all' });
  };

  const openCallActionModal = (order: AssignedOrder) => {
    setSelectedOrder(order);
    setCallActionFollowUpDate('');
    setCallActionFollowUpTime('');
    setCallActionNotes('');
    setCallActionProductSuggestion(order.suggestion || '');
    setCallActionOutcome((order.outcome as CallOutcome) || '');
  };

  const closeCallActionModal = () => {
    setSelectedOrder(null);
    setCallActionFollowUpDate('');
    setCallActionFollowUpTime('');
    setCallActionNotes('');
    setCallActionProductSuggestion('');
    setCallActionOutcome('');
  };

  const getPreviousCallLog = (order: AssignedOrder | null): AssignmentCallLog | null => {
    if (!canViewCallLogs) return null;
    if (!order) return null;
    if (order.lastCallLog) return order.lastCallLog;
    if (!order.notes) return null;
    return {
      id: 0,
      orderId: order.id,
      callerName: 'Unknown caller',
      notes: order.notes,
      outcome: order.outcome,
      suggestion: order.suggestion,
      calledAt: order.calledAt,
    };
  };

  const openCallHistory = async (order: AssignedOrder) => {
    if (!canViewCallLogs) return;
    setHistoryOrder(order);
    setCallHistory([]);
    setLoadingCallHistory(true);
    try {
      const res = await apiClient.get(`/telephony/order-assignments/${order.id}/call-history`, {
        params: { assignmentType },
      });
      setCallHistory(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load call history');
    } finally {
      setLoadingCallHistory(false);
    }
  };

  const closeCallHistory = () => {
    setHistoryOrder(null);
    setCallHistory([]);
  };

  const handleSubmitCallAction = async () => {
    if (!selectedOrder) return;
    if (!callActionNotes.trim()) return toast.warning('Please enter call notes');
    if (!callActionOutcome) return toast.warning('Please select a call outcome');
    setSavingCallAction(true);
    try {
      await apiClient.post(`/telephony/order-assignments/${selectedOrder.id}/outcome`, {
        assignmentType,
        outcome: callActionOutcome,
        suggestion: callActionProductSuggestion || undefined,
        notes: callActionNotes,
        followUpDate: callActionFollowUpDate || undefined,
        followUpTime: callActionFollowUpTime || undefined,
      });
      toast.success('Call log saved');
      closeCallActionModal();
      await loadOrders();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save call log');
    } finally {
      setSavingCallAction(false);
    }
  };

  const copyPhone = async (phone: string) => {
    await navigator.clipboard.writeText(phone);
    toast.success('Phone number copied');
  };

  const handoffNoAnswer = async (order: AssignedOrder) => {
    const ok = window.confirm('Pass this order to the Unreachable Follow-up team?');
    if (!ok) return;
    setHandoffOrderId(order.id);
    try {
      await apiClient.post(`/telephony/order-assignments/${order.id}/unreachable-handoff`, {
        outcome: 'no_answer',
      });
      toast.success('Order passed to unreachable follow-up queue');
      await loadOrders();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to pass order');
    } finally {
      setHandoffOrderId(null);
    }
  };

  const hasFilters = appliedFilters.searchTerm || appliedFilters.productFilter || appliedFilters.tierFilter || appliedFilters.statusFilter || appliedFilters.calledFilter !== 'all' || appliedFilters.outcomeFilter !== 'all';

  return (
    <AdminLayout>
      <div className="space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FaPhone className="text-blue-600" /> {pageCopy.title}</h1>
            <p className="text-sm text-gray-500">{pageCopy.description}</p>
          </div>
          <button onClick={() => loadOrders()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <FaSyncAlt /> Refresh
          </button>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="border-b p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-64">
                <label className="mb-1 block text-xs font-medium text-gray-600">Search</label>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name, phone, order, address"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div className="w-64">
                <label className="mb-1 block text-xs font-medium text-gray-600">Product</label>
                <ProductAutocomplete value={productFilter} onChange={setProductFilter} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="w-40">
                <label className="mb-1 block text-xs font-medium text-gray-600">Tier</label>
                <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="">All Tiers</option>
                  <option value="new">New</option>
                  <option value="normal">Normal</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                  <option value="vip">VIP</option>
                  <option value="repeat">Repeat</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="w-40">
                <label className="mb-1 block text-xs font-medium text-gray-600">Called Status</label>
                <select value={calledFilter} onChange={(e) => setCalledFilter(e.target.value as FilterCalledStatus)} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="all">All</option>
                  <option value="called_today">Called Today</option>
                  <option value="called_1week">Called 1 Week Ago</option>
                  <option value="called_2weeks">Called 2 Weeks Ago</option>
                  <option value="called_3weeks">Called 3 Weeks Ago</option>
                  <option value="called_1month">Called 1 Month Ago</option>
                  <option value="called_2months">Called 2 Months Ago</option>
                  <option value="called_3months_plus">Called 3+ Months Ago</option>
                  <option value="never">Never Called</option>
                </select>
              </div>
              <div className="w-40">
                <label className="mb-1 block text-xs font-medium text-gray-600">Order Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="">All Statuses</option>
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="delivered">Delivered</option>
                  <option value="partial_delivered">Partial Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="admin_cancelled">Rejected</option>
                  <option value="pickup_failed">Pickup Failed</option>
                  <option value="hold">On Hold</option>
                  <option value="returned">Returned</option>
                </select>
              </div>
              <div className="w-40">
                <label className="mb-1 block text-xs font-medium text-gray-600">Outcome</label>
                <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value as FilterOutcome)} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="all">All Outcomes</option>
                  {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={clearFilters} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800">Clear</button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total assigned: <span className="font-semibold">{total}</span>
                {hasFilters && <span className="ml-2 text-blue-600">(filtered)</span>}
              </div>
              <PageSizeSelector value={limit} onChange={(size) => { setLimit(size); setPage(1); }} options={[10, 20, 50, 100, 200]} />
            </div>

            {orders.length === 0 && !loading ? (
              <div className="py-8 text-center text-gray-500">{pageCopy.empty}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Order ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                      <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">Order Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Products</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Address</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Last Called</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Source</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.map((order) => {
                      const phone = String(order.customerPhone || '').trim();
                      const waPhone = phone.replace(/[^0-9]/g, '');
                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">#{order.id}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatDate(order.orderDate || order.assignedAt)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{order.customerName || '-'}</div>
                            {phone && (
                              <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-600">
                                <FaPhone className="text-[10px]" />
                                <a href={`tel:${phone}`} className="text-blue-600 hover:text-blue-800 hover:underline" title="Call">{phone}</a>
                                <button type="button" onClick={() => copyPhone(phone)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Copy number">
                                  <FaCopy size={11} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">
                              {order.customerTotalOrders ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getOrderStatusColor(order.status)}`}>
                              {getOrderStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-h-28 min-w-[220px] overflow-y-auto text-xs">
                              {(order.items || []).length === 0 ? (
                                <span className="text-gray-400">No items</span>
                              ) : (order.items || []).map((item, idx) => (
                                <div key={`${order.id}-${idx}`} className="mb-1">
                                  <span className="font-medium">{item.productNameBn || item.productName}{item.variantName ? ` (${item.variantName})` : ''}</span>
                                  <span className="ml-1 text-gray-500">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="max-w-[260px] px-4 py-3 text-sm text-gray-700">{order.shippingAddress || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            {canViewCallLogs
                              ? (order.calledAt ? <span className="text-emerald-700">{formatDate(order.calledAt)}</span> : <span className="text-gray-400">Never</span>)
                              : <span className="text-gray-400">Restricted</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                              {formatSource(order.orderSource)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1">
                              {order.recordType !== 'incomplete_order' && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderId(order.id)}
                                  className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                                >
                                  View
                                </button>
                              )}
                              <a
                                href={phone ? `tel:${phone}` : undefined}
                                aria-disabled={!phone}
                                title={phone ? 'Call' : 'No phone'}
                                className={`rounded border p-1.5 ${phone ? 'border-green-200 text-green-700 hover:bg-green-50' : 'cursor-not-allowed border-gray-200 text-gray-300'}`}
                                onClick={(e) => {
                                  if (!phone) e.preventDefault();
                                }}
                              >
                                <FaPhone size={12} />
                              </a>
                              <a
                                href={waPhone ? `https://wa.me/${waPhone}` : undefined}
                                target="_blank"
                                rel="noreferrer"
                                aria-disabled={!waPhone}
                                title={waPhone ? 'WhatsApp' : 'No phone'}
                                className={`rounded border p-1.5 ${waPhone ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'cursor-not-allowed border-gray-200 text-gray-300'}`}
                                onClick={(e) => {
                                  if (!waPhone) e.preventDefault();
                                }}
                              >
                                <FaWhatsapp size={12} />
                              </a>
                              <a
                                href={phone ? `https://imoim.app/${phone}` : undefined}
                                target="_blank"
                                rel="noreferrer"
                                aria-disabled={!phone}
                                title={phone ? 'IMO' : 'No phone'}
                                className={`rounded border p-1.5 ${phone ? 'border-indigo-200 text-indigo-700 hover:bg-indigo-50' : 'cursor-not-allowed border-gray-200 text-gray-300'}`}
                                onClick={(e) => {
                                  if (!phone) e.preventDefault();
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" fill="none" />
                                  <circle cx="12" cy="10" r="4" fill="currentColor" />
                                  <ellipse cx="12" cy="18" rx="6" ry="3" fill="currentColor" />
                                </svg>
                              </a>
                              <a
                                href={phone ? `sms:${phone}` : undefined}
                                aria-disabled={!phone}
                                title={phone ? 'SMS' : 'No phone'}
                                className={`rounded border p-1.5 ${phone ? 'border-blue-200 text-blue-700 hover:bg-blue-50' : 'cursor-not-allowed border-gray-200 text-gray-300'}`}
                                onClick={(e) => {
                                  if (!phone) e.preventDefault();
                                }}
                              >
                                <FaSms size={12} />
                              </a>
                              <button
                                type="button"
                                className="flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                                onClick={() => openCallActionModal(order)}
                              >
                                <FaPhone size={10} /> Log Call
                              </button>
                              {canViewCallLogs && (
                                <button
                                  type="button"
                                  className="flex items-center gap-1 rounded border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50"
                                  onClick={() => openCallHistory(order)}
                                >
                                  <FaHistory size={10} /> History
                                </button>
                              )}
                              {assignmentType === 'order' && order.recordType !== 'incomplete_order' && order.canHandoffNoAnswer && (
                                <button
                                  type="button"
                                  disabled={handoffOrderId === order.id}
                                  className="flex items-center gap-1 rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                                  onClick={() => handoffNoAnswer(order)}
                                  title="Customer did not receive the call. Pass to Unreachable Follow-up."
                                >
                                  <FaShare size={10} /> {handoffOrderId === order.id ? 'Passing...' : 'No Answer'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
              <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded border px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>

        {selectedOrderId != null && (
          <AdminOrderDetailsModal
            orderId={selectedOrderId}
            onClose={() => setSelectedOrderId(null)}
            onUpdate={() => loadOrders()}
          />
        )}

        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-2 flex items-center gap-2 text-xl font-bold text-gray-800">
                <FaPhone className="text-green-600" />
                Log Call
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                Customer: <strong>{selectedOrder.customerName || `Order #${selectedOrder.id}`}</strong>
                {selectedOrder.customerPhone && <span className="ml-2 text-gray-500">({selectedOrder.customerPhone})</span>}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Call Outcome <span className="text-red-500">*</span>
                  </label>
                  <CallOutcomeSelect
                    value={callActionOutcome as any}
                    onChange={(next) => setCallActionOutcome(next as CallOutcome)}
                  />
                </div>

                <div>
                  {(() => {
                    const previousLog = getPreviousCallLog(selectedOrder);
                    if (!previousLog) return null;
                    return (
                      <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs font-semibold text-blue-700">Previous Call</span>
                          <span className="text-xs text-blue-700">
                            {previousLog.callerName || 'Unknown caller'}
                            {previousLog.calledAt && ` · ${formatDate(previousLog.calledAt)}`}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-blue-950">{previousLog.notes}</p>
                      </div>
                    );
                  })()}
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Call Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={callActionNotes}
                    onChange={(e) => setCallActionNotes(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Describe the conversation, customer feedback, interests, concerns..."
                    required
                  />
                </div>

                <div>
                  {selectedOrder.suggestion && (
                    <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                      <span className="text-xs font-medium text-amber-700">Previous Product Suggestion:</span>
                      <p className="mt-0.5 text-sm text-amber-900">{selectedOrder.suggestion}</p>
                    </div>
                  )}
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Product Suggestion <span className="text-xs font-normal text-gray-400">(Optional)</span>
                  </label>
                  <textarea
                    value={callActionProductSuggestion}
                    onChange={(e) => setCallActionProductSuggestion(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Suggest products for this customer..."
                  />
                </div>

                <div className="border-t pt-4">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FaCalendarAlt className="text-blue-500" />
                    Schedule Next Follow-up <span className="text-xs font-normal text-gray-400">(Optional)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={callActionFollowUpDate}
                      onChange={(e) => setCallActionFollowUpDate(e.target.value)}
                      min={getDhakaDateString()}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                    <input
                      type="time"
                      value={callActionFollowUpTime}
                      onChange={(e) => setCallActionFollowUpTime(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                  {callActionFollowUpDate && (
                    <p className="mt-1 text-xs text-blue-600">
                      A follow-up will be noted for {callActionFollowUpDate}
                      {callActionFollowUpTime && ` at ${callActionFollowUpTime}`}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleSubmitCallAction}
                  disabled={savingCallAction || !callActionNotes.trim() || !callActionOutcome}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {savingCallAction ? 'Saving...' : <><FaCheckCircle /> Save Call Log</>}
                </button>
                <button
                  onClick={closeCallActionModal}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {historyOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
                    <FaHistory className="text-purple-600" />
                    Call History
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {historyOrder.customerName || `Order #${historyOrder.id}`}
                    {historyOrder.customerPhone && <span className="ml-2 text-gray-500">({historyOrder.customerPhone})</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCallHistory}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                >
                  Close
                </button>
              </div>

              {loadingCallHistory ? (
                <div className="rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
                  Loading call history...
                </div>
              ) : callHistory.length === 0 ? (
                <div className="rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
                  No call history found.
                </div>
              ) : (
                <div className="space-y-3">
                  {callHistory.map((log) => (
                    <div key={log.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{log.callerName || 'Unknown caller'}</div>
                          <div className="text-xs text-gray-500">{log.calledAt ? formatDate(log.calledAt) : 'Unknown time'}</div>
                        </div>
                        {log.outcome && (
                          <span className="inline-flex w-fit rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            {OUTCOMES.find((o) => o.value === log.outcome)?.label || log.outcome.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">{log.notes}</p>
                      {log.suggestion && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
                          <span className="font-medium">Suggestion:</span> {log.suggestion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
