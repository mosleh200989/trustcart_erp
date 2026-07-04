import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import { useToast } from '@/contexts/ToastContext';
import { FaSearch, FaMoneyBillWave, FaEye, FaCheckSquare, FaUsers } from 'react-icons/fa';
import apiClient from '@/services/api';

interface AgentRow {
  agentId: number;
  agentName: string;
  phone: string;
  totalOrders: number;
  totalProductQty: number;
  totalDeliveredOrders: number;
  totalDeliveredProducts: number;
  upsellQty: number;
  crossSellQty: number;
  cancelledOrders: number;
  totalAmount: number;
  extraPartial: number;
  totalCommission: number;
  paidCommission: number;
  balance: number;
  paymentRequestId?: number | null;
  paymentRequestStatus?: string | null;
  paymentRequestedAmount?: number | null;
  hasPaymentRequest?: boolean;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export default function CommissionAgentsPage() {
  const toast = useToast();
  const router = useRouter();

  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchText, setSearchText] = useState('');
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Payment request modal
  const [paymentModal, setPaymentModal] = useState<AgentRow | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Extra partial editing
  const [extraPartialEdits, setExtraPartialEdits] = useState<Record<number, string>>({});
  const [savingExtra, setSavingExtra] = useState<number | null>(null);

  const handleSaveExtraPartial = async (agentId: number) => {
    const val = parseFloat(extraPartialEdits[agentId] ?? '0');
    if (isNaN(val) || val < 0) { toast.error('Invalid amount'); return; }
    try {
      setSavingExtra(agentId);
      await apiClient.put('/crm/commissions/extra-partial', { agentId, month: monthFilter, amount: val });
      toast.success('Extra (for partial) saved');
      setExtraPartialEdits(prev => { const n = { ...prev }; delete n[agentId]; return n; });
      loadAgents();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save');
    } finally {
      setSavingExtra(null);
    }
  };

  const loadAgents = useCallback(async (page?: number, pageSize?: number) => {
    try {
      setLoading(true);
      const p = page ?? currentPage;
      const ps = pageSize ?? itemsPerPage;
      const params: any = { page: p, limit: ps };
      if (searchText.trim()) params.search = searchText.trim();
      if (monthFilter) params.month = monthFilter;

      const response = await apiClient.get('/crm/commissions/agents', { params });
      const data = response.data;
      setAgents(data.data || []);
      setSelectedAgentIds([]);
      setTotalPages(Math.max(1, Math.ceil((data.total || 0) / ps)));
    } catch (error) {
      console.error('Failed to load agent report:', error);
      toast.error('Failed to load agent report');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchText, monthFilter]);

  useEffect(() => {
    loadAgents(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, monthFilter]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadAgents(1, itemsPerPage);
  };

  const handlePaymentRequest = async () => {
    if (!paymentModal) return;
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.post('/crm/commissions/payment-requests', {
        agentId: paymentModal.agentId,
        requestedAmount: amount,
        paymentMethod: paymentForm.paymentMethod || undefined,
        notes: paymentForm.notes || undefined,
        commissionMonth: monthFilter,
      });
      toast.success(`Payment request of ৳${amount.toLocaleString()} created for ${paymentModal.agentName}`);
      setPaymentModal(null);
      loadAgents();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create payment request');
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleAgents = agents.filter(agent => !agent.hasPaymentRequest && agent.balance > 0);
  const selectedEligibleAgents = agents.filter(agent => selectedAgentIds.includes(agent.agentId) && !agent.hasPaymentRequest && agent.balance > 0);
  const allEligibleSelected = eligibleAgents.length > 0 && eligibleAgents.every(agent => selectedAgentIds.includes(agent.agentId));

  const toggleAgentSelection = (agent: AgentRow, checked: boolean) => {
    if (agent.hasPaymentRequest || agent.balance <= 0) return;
    setSelectedAgentIds(prev => checked
      ? Array.from(new Set([...prev, agent.agentId]))
      : prev.filter(id => id !== agent.agentId));
  };

  const toggleAllEligible = (checked: boolean) => {
    setSelectedAgentIds(checked ? eligibleAgents.map(agent => agent.agentId) : []);
  };

  const handleBulkPaymentRequest = async () => {
    if (selectedEligibleAgents.length === 0) {
      toast.error('Select at least one eligible agent');
      return;
    }

    const confirmed = window.confirm(`Create payment requests for ${selectedEligibleAgents.length} selected agent(s) for ${monthFilter}?`);
    if (!confirmed) return;

    try {
      setBulkSubmitting(true);
      const response = await apiClient.post('/crm/commissions/payment-requests/bulk', {
        commissionMonth: monthFilter,
        requests: selectedEligibleAgents.map(agent => ({
          agentId: agent.agentId,
          requestedAmount: Math.max(agent.balance, 0),
        })),
      });
      const createdCount = response.data?.createdCount || 0;
      const skippedCount = response.data?.skippedCount || 0;
      toast.success(`Created ${createdCount} payment request(s)${skippedCount ? `, skipped ${skippedCount}` : ''}`);
      setSelectedAgentIds([]);
      loadAgents();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create bulk payment requests');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'select',
      label: 'Select',
      sortable: false,
      render: (_: any, row: AgentRow) => {
        const disabled = Boolean(row.hasPaymentRequest) || row.balance <= 0;
        return (
          <input
            type="checkbox"
            checked={selectedAgentIds.includes(row.agentId)}
            disabled={disabled}
            onChange={(e) => toggleAgentSelection(row, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 disabled:opacity-40"
            title={disabled ? 'Payment request is not available for this row' : 'Select for bulk payment request'}
          />
        );
      },
    },
    {
      key: 'agentName',
      label: 'Name',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <div>
          <div className="text-sm font-medium">{row.agentName || '-'}</div>
          {row.phone && <div className="text-xs text-gray-500 mt-0.5">{row.phone}</div>}
        </div>
      ),
    },
    {
      key: 'totalOrders',
      label: 'Total Orders',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm font-medium">{row.totalOrders.toLocaleString()}</span>
      ),
    },
    {
      key: 'totalProductQty',
      label: 'Total Product Qty',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm">{row.totalProductQty.toLocaleString()}</span>
      ),
    },
    {
      key: 'totalDeliveredOrders',
      label: 'Total Delivered Orders',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm font-medium text-green-700">{(row.totalDeliveredOrders || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'totalDeliveredProducts',
      label: 'Total Delivered Products',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm text-green-700">{(row.totalDeliveredProducts || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'upsellQty',
      label: 'Upsell Qty',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm">{(row.upsellQty || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'crossSellQty',
      label: 'Cross-sell Qty',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm">{(row.crossSellQty || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'cancelledOrders',
      label: 'Cancelled / Returned',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm font-medium text-red-600">{(row.cancelledOrders || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm font-medium">৳{row.totalAmount.toLocaleString()}</span>
      ),
    },
    {
      key: 'extraPartial',
      label: 'Extra (for partial)',
      sortable: false,
      render: (_: any, row: AgentRow) => {
        const editVal = extraPartialEdits[row.agentId];
        const isEditing = editVal !== undefined;
        const currentVal = isEditing ? editVal : String(row.extraPartial || 0);
        return (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              step="1"
              value={currentVal}
              onChange={(e) => setExtraPartialEdits(prev => ({ ...prev, [row.agentId]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveExtraPartial(row.agentId); }}
              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {isEditing && (
              <button
                onClick={() => handleSaveExtraPartial(row.agentId)}
                disabled={savingExtra === row.agentId}
                className="bg-green-500 hover:bg-green-600 text-white px-1.5 py-1 rounded text-xs disabled:opacity-50"
              >
                {savingExtra === row.agentId ? '...' : '✓'}
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'totalCommission',
      label: 'Total Commission',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm font-medium">৳{row.totalCommission.toLocaleString()}</span>
      ),
    },
    {
      key: 'paidCommission',
      label: 'Last Paid',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm text-green-600 font-medium">৳{row.paidCommission.toLocaleString()}</span>
      ),
    },
    {
      key: 'balance',
      label: 'Unpaid Balance',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className={`text-sm font-semibold ${row.balance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
          ৳{row.balance.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_: any, row: AgentRow) => {
        const hasRequest = Boolean(row.hasPaymentRequest);
        const requestStatusLabel = row.paymentRequestStatus === 'paid' ? 'Paid'
          : row.paymentRequestStatus === 'approved' ? 'Requested'
            : row.paymentRequestStatus === 'pending' ? 'Requested'
              : 'Requested';

        return (
          <div className="flex items-center gap-2">
            {hasRequest ? (
              <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                row.paymentRequestStatus === 'paid'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {requestStatusLabel}
              </span>
            ) : (
              <button
                onClick={() => {
                  setPaymentModal(row);
                  setPaymentForm({ amount: String(row.balance > 0 ? row.balance : ''), paymentMethod: '', notes: '' });
                }}
                disabled={row.balance <= 0}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Payment Request"
              >
                <FaMoneyBillWave size={12} /> Payment Request
              </button>
            )}
          <button
            onClick={() => router.push(`/admin/crm/commission-sales?agentId=${row.agentId}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1"
            title="View Agent Orders"
          >
            <FaEye size={12} /> View
          </button>
        </div>
        );
      },
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center gap-3 mb-1">
            <FaUsers className="text-blue-600 text-2xl" />
            <h1 className="text-2xl font-bold text-blue-700">Agents</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Agent-wise commission summary report showing total orders, amounts, commissions, and balance.
          </p>
        </div>

        {/* Month Filter + Table Controls */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PageSizeSelector
              value={itemsPerPage}
              onChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Month:</label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => { setMonthFilter(e.target.value); setCurrentPage(1); }}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleAllEligible(!allEligibleSelected)}
              disabled={eligibleAgents.length === 0}
              className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {allEligibleSelected ? 'Clear Selection' : 'Select Eligible'}
            </button>
            <button
              onClick={handleBulkPaymentRequest}
              disabled={bulkSubmitting || selectedEligibleAgents.length === 0}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
              title="Create payment requests for selected eligible agents"
            >
              <FaCheckSquare size={12} /> {bulkSubmitting ? 'Submitting...' : `Bulk Payment Request${selectedEligibleAgents.length ? ` (${selectedEligibleAgents.length})` : ''}`}
            </button>
            <label className="text-sm text-gray-600">Search:</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Name or Phone"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 flex items-center gap-1 text-sm"
            >
              <FaSearch size={12} /> Search
            </button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={agents}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
        />
        {!loading && agents.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">
            No eligible sales agents or commission activity matched this month and search.
          </p>
        )}

        {/* Payment Request Modal */}
        {paymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-1">New Payment Request</h2>
              <p className="text-sm text-gray-500 mb-4">
                Agent: <strong>{paymentModal.agentName}</strong> | Balance: <strong className="text-red-600">৳{paymentModal.balance.toLocaleString()}</strong>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Amount (৳) *</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Method</option>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Notes</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2} placeholder="Optional notes"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setPaymentModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={handlePaymentRequest} disabled={submitting}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                  <FaMoneyBillWave size={12} />
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
