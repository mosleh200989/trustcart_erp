import { useEffect, useState } from 'react';
import { FaCopy, FaPhone, FaSms, FaSyncAlt, FaWhatsapp } from 'react-icons/fa';
import AdminLayout from '@/layouts/AdminLayout';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Modal from '@/components/admin/Modal';
import ProductAutocomplete from '@/components/admin/ProductAutocomplete';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { getOrderStatusColor, getOrderStatusLabel } from '@/utils/orderStatus';

type FilterCalledStatus = 'all' | 'called_today' | 'called_1week' | 'called_2weeks' | 'called_3weeks' | 'called_1month' | 'never';
type FilterOutcome = 'all' | 'positive' | 'negative' | 'neutral' | 'no_answer';

type AssignedOrder = {
  id: number;
  salesOrderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  status: string;
  totalAmount: number;
  orderDate?: string;
  assignedAt?: string;
  calledAt?: string | null;
  outcome?: string | null;
  suggestion?: string | null;
  notes?: string | null;
  items?: Array<{ productName: string; productNameBn?: string | null; variantName?: string | null; quantity: number }>;
};

const OUTCOMES = [
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'no_answer', label: 'No Answer' },
];

const SUGGESTIONS = [
  { value: 'follow_up', label: 'Follow up' },
  { value: 'send_details', label: 'Send details' },
  { value: 'confirm_order', label: 'Confirm order' },
  { value: 'not_interested', label: 'Not interested' },
];

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

export default function TelephonyOrderAssignmentPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [calledFilter, setCalledFilter] = useState<FilterCalledStatus>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<FilterOutcome>('all');
  const [appliedFilters, setAppliedFilters] = useState({ searchTerm: '', productFilter: '', tierFilter: '', calledFilter: 'all' as FilterCalledStatus, outcomeFilter: 'all' as FilterOutcome });
  const [selectedOrder, setSelectedOrder] = useState<AssignedOrder | null>(null);
  const [form, setForm] = useState({ outcome: '', suggestion: '', notes: '' });

  const loadOrders = async (nextPage = page, nextLimit = limit, filters = appliedFilters) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(nextPage), limit: String(nextLimit) };
      if (filters.searchTerm.trim()) params.q = filters.searchTerm.trim();
      if (filters.productFilter.trim()) params.productName = filters.productFilter.trim();
      if (filters.tierFilter) params.customerType = filters.tierFilter;
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

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({ searchTerm, productFilter, tierFilter, calledFilter, outcomeFilter });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setProductFilter('');
    setTierFilter('');
    setCalledFilter('all');
    setOutcomeFilter('all');
    setPage(1);
    setAppliedFilters({ searchTerm: '', productFilter: '', tierFilter: '', calledFilter: 'all', outcomeFilter: 'all' });
  };

  const saveOutcome = async () => {
    if (!selectedOrder) return;
    if (!form.outcome) return toast.warning('Please select an outcome');
    try {
      await apiClient.post(`/telephony/order-assignments/${selectedOrder.id}/outcome`, form);
      toast.success('Outcome saved');
      setSelectedOrder(null);
      await loadOrders();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save outcome');
    }
  };

  const copyPhone = async (phone: string) => {
    await navigator.clipboard.writeText(phone);
    toast.success('Phone number copied');
  };

  const hasFilters = appliedFilters.searchTerm || appliedFilters.productFilter || appliedFilters.tierFilter || appliedFilters.calledFilter !== 'all' || appliedFilters.outcomeFilter !== 'all';

  return (
    <AdminLayout>
      <div className="space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FaPhone className="text-blue-600" /> Order Assignment</h1>
            <p className="text-sm text-gray-500">Orders assigned to you for telephony follow-up.</p>
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
                  <option value="never">Never Called</option>
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
                <button onClick={applyFilters} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">Apply Filters</button>
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
              <div className="py-8 text-center text-gray-500">No assigned orders found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Order ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Products</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Address</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Last Called</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Outcome</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Suggestion</th>
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
                            {order.calledAt ? <span className="text-emerald-700">{formatDate(order.calledAt)}</span> : <span className="text-gray-400">Never</span>}
                          </td>
                          <td className="px-4 py-3 text-sm capitalize">{order.outcome ? order.outcome.replace(/_/g, ' ') : '-'}</td>
                          <td className="px-4 py-3 text-sm capitalize">{order.suggestion ? order.suggestion.replace(/_/g, ' ') : '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1">
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
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setForm({ outcome: order.outcome || '', suggestion: order.suggestion || '', notes: order.notes || '' });
                                }}
                              >
                                <FaPhone size={10} /> Log Call
                              </button>
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

        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title="Log Call"
          footer={<>
            <button onClick={() => setSelectedOrder(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button onClick={saveOutcome} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
          </>}
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <div className="font-semibold">#{selectedOrder?.id}</div>
              <div className="text-gray-600">{selectedOrder?.customerName} {selectedOrder?.customerPhone ? `- ${selectedOrder.customerPhone}` : ''}</div>
            </div>
            <select value={form.outcome} onChange={(e) => setForm((prev) => ({ ...prev, outcome: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">Select outcome...</option>
              {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={form.suggestion} onChange={(e) => setForm((prev) => ({ ...prev, suggestion: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">Select suggestion...</option>
              {SUGGESTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="min-h-[100px] w-full rounded-lg border px-3 py-2 text-sm" placeholder="Notes" />
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
