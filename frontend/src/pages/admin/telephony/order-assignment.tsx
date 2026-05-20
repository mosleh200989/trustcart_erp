import { useEffect, useMemo, useState } from 'react';
import { FaPhone, FaSyncAlt } from 'react-icons/fa';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Modal from '@/components/admin/Modal';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

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
  callStatus?: string;
  outcome?: string | null;
  suggestion?: string | null;
  notes?: string | null;
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

export default function TelephonyOrderAssignmentPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [calledStatus, setCalledStatus] = useState('');
  const [outcome, setOutcome] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AssignedOrder | null>(null);
  const [form, setForm] = useState({ outcome: '', suggestion: '', notes: '' });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (q.trim()) params.q = q.trim();
      if (calledStatus) params.calledStatus = calledStatus;
      if (outcome) params.outcome = outcome;
      if (suggestion) params.suggestion = suggestion;
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
    const timer = setTimeout(loadOrders, q.trim() ? 350 : 0);
    return () => clearTimeout(timer);
  }, [page, limit, q, calledStatus, outcome, suggestion]);

  const columns = useMemo(() => [
    { key: 'salesOrderNumber', label: 'Order', render: (_: any, row: AssignedOrder) => row.salesOrderNumber || `#${row.id}` },
    {
      key: 'customerName',
      label: 'Customer',
      render: (_: any, row: AssignedOrder) => (
        <div>
          <div className="font-semibold">{row.customerName || '-'}</div>
          {row.customerPhone && <a className="text-xs text-blue-600 hover:underline" href={`tel:${row.customerPhone}`}>{row.customerPhone}</a>}
        </div>
      ),
    },
    { key: 'totalAmount', label: 'Amount', render: (_: any, row: AssignedOrder) => `৳${Number(row.totalAmount || 0).toFixed(2)}` },
    {
      key: 'callStatus',
      label: 'Called',
      render: (_: any, row: AssignedOrder) => row.calledAt ? (
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Called</span>
      ) : (
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Not Called</span>
      ),
    },
    { key: 'outcome', label: 'Outcome', render: (_: any, row: AssignedOrder) => row.outcome ? row.outcome.replace(/_/g, ' ') : '-' },
    { key: 'suggestion', label: 'Suggestion', render: (_: any, row: AssignedOrder) => row.suggestion ? row.suggestion.replace(/_/g, ' ') : '-' },
    {
      key: 'actions',
      label: 'Action',
      render: (_: any, row: AssignedOrder) => (
        <button
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          onClick={() => {
            setSelectedOrder(row);
            setForm({ outcome: row.outcome || '', suggestion: row.suggestion || '', notes: row.notes || '' });
          }}
        >
          Set Outcome
        </button>
      ),
    },
  ], []);

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

  return (
    <AdminLayout>
      <div className="space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FaPhone className="text-blue-600" /> Order Assignment</h1>
            <p className="text-sm text-gray-500">Orders assigned to you for telephony follow-up.</p>
          </div>
          <button onClick={loadOrders} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <FaSyncAlt /> Refresh
          </button>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search order, customer, phone, address" className="rounded-lg border px-3 py-2 text-sm md:col-span-2" />
            <select value={calledStatus} onChange={(e) => { setCalledStatus(e.target.value); setPage(1); }} className="rounded-lg border px-3 py-2 text-sm">
              <option value="">All Called Status</option>
              <option value="called">Called</option>
              <option value="not_called">Not Called</option>
            </select>
            <select value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(1); }} className="rounded-lg border px-3 py-2 text-sm">
              <option value="">All Outcomes</option>
              {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={suggestion} onChange={(e) => { setSuggestion(e.target.value); setPage(1); }} className="rounded-lg border px-3 py-2 text-sm">
              <option value="">All Suggestions</option>
              {SUGGESTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Total assigned: <span className="font-semibold">{total}</span></div>
          <PageSizeSelector value={limit} onChange={(size) => { setLimit(size); setPage(1); }} />
        </div>

        <DataTable columns={columns} data={orders} loading={loading} currentPage={page} totalPages={totalPages} onPageChange={setPage} />

        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title="Set Call Outcome"
          footer={<>
            <button onClick={() => setSelectedOrder(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button onClick={saveOutcome} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
          </>}
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <div className="font-semibold">{selectedOrder?.salesOrderNumber || selectedOrder?.id}</div>
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
