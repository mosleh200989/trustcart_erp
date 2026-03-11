import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import { useToast } from '@/contexts/ToastContext';
import { FaSearch, FaPlus, FaCheck, FaMoneyBillWave, FaTimes } from 'react-icons/fa';
import apiClient from '@/services/api';

interface PaymentRequest {
  id: number;
  agentId: number;
  agentName: string;
  agentPhone: string;
  agentPreferredMethod: string | null;
  agentBkashNumber: string | null;
  agentNagadNumber: string | null;
  agentRocketNumber: string | null;
  agentBankName: string | null;
  agentBankAccountHolder: string | null;
  agentBankAccountNumber: string | null;
  agentBankBranchName: string | null;
  requestedAmount: number;
  approvedAmount: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  status: string;
  notes: string | null;
  adminNotes: string | null;
  approvedByName: string;
  paidByName: string;
  rejectedByName: string;
  approvedAt: string | null;
  paidAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
}

interface Agent {
  id: number;
  name: string;
  preferredMethod: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export default function CommissionPaymentRequestsPage() {
  const toast = useToast();

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchText, setSearchText] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ agentId: '', requestedAmount: '', paymentMethod: '', notes: '' });
  const [creating, setCreating] = useState(false);

  // Action modals
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'pay' | 'reject'; request: PaymentRequest } | null>(null);
  const [actionForm, setActionForm] = useState({ approvedAmount: '', paymentMethod: '', paymentReference: '', adminNotes: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const loadRequests = useCallback(async (page?: number, pageSize?: number) => {
    try {
      setLoading(true);
      const p = page ?? currentPage;
      const ps = pageSize ?? itemsPerPage;
      const params: any = { page: p, limit: ps };
      if (statusFilter) params.status = statusFilter;
      if (agentFilter) params.agentId = agentFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (searchText.trim()) params.search = searchText.trim();

      const response = await apiClient.get('/crm/commissions/payment-requests', { params });
      const data = response.data;
      setRequests(data.data || []);
      setTotalPages(Math.ceil((data.total || 0) / ps));
      if (data.agents) setAgents(data.agents);
    } catch (error) {
      console.error('Failed to load payment requests:', error);
      toast.error('Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, statusFilter, agentFilter, startDate, endDate, searchText]);

  useEffect(() => {
    loadRequests(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, statusFilter, agentFilter, startDate, endDate]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadRequests(1, itemsPerPage);
  };

  const handleCreate = async () => {
    if (!createForm.agentId || !createForm.requestedAmount) {
      toast.error('Agent and Amount are required');
      return;
    }
    try {
      setCreating(true);
      await apiClient.post('/crm/commissions/payment-requests', {
        agentId: Number(createForm.agentId),
        requestedAmount: parseFloat(createForm.requestedAmount),
        paymentMethod: createForm.paymentMethod || undefined,
        notes: createForm.notes || undefined,
      });
      toast.success('Payment request created successfully');
      setShowCreateModal(false);
      setCreateForm({ agentId: '', requestedAmount: '', paymentMethod: '', notes: '' });
      loadRequests(1, itemsPerPage);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create payment request');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    try {
      setActionLoading(true);
      const { type, request } = actionModal;
      if (type === 'approve') {
        await apiClient.put(`/crm/commissions/payment-requests/${request.id}/approve`, {
          approvedAmount: actionForm.approvedAmount ? parseFloat(actionForm.approvedAmount) : undefined,
        });
        toast.success('Payment request approved');
      } else if (type === 'pay') {
        await apiClient.put(`/crm/commissions/payment-requests/${request.id}/pay`, {
          paymentMethod: actionForm.paymentMethod || undefined,
          paymentReference: actionForm.paymentReference || undefined,
          adminNotes: actionForm.adminNotes || undefined,
        });
        toast.success('Payment marked as paid');
      } else if (type === 'reject') {
        await apiClient.put(`/crm/commissions/payment-requests/${request.id}/reject`, {
          adminNotes: actionForm.adminNotes || undefined,
        });
        toast.success('Payment request rejected');
      }
      setActionModal(null);
      setActionForm({ approvedAmount: '', paymentMethod: '', paymentReference: '', adminNotes: '' });
      loadRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openActionModal = (type: 'approve' | 'pay' | 'reject', request: PaymentRequest) => {
    setActionModal({ type, request });
    setActionForm({
      approvedAmount: type === 'approve' ? String(request.requestedAmount) : '',
      paymentMethod: type === 'pay' ? (request.agentPreferredMethod || request.paymentMethod || '') : (request.paymentMethod || ''),
      paymentReference: request.paymentReference || '',
      adminNotes: '',
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const columns = [
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      render: (_: any, row: PaymentRequest) => (
        <div className="text-xs">
          <div>{formatDate(row.createdAt).split(' ')[0]}</div>
          <div className="text-gray-400">{formatDate(row.createdAt).split(' ')[1]}</div>
        </div>
      ),
    },
    {
      key: 'agentName',
      label: 'Agent',
      sortable: true,
      render: (_: any, row: PaymentRequest) => (
        <div>
          <div className="text-sm font-medium">{row.agentName || '-'}</div>
          <div className="text-xs text-gray-400">{row.agentPhone}</div>
        </div>
      ),
    },
    {
      key: 'requestedAmount',
      label: 'Requested',
      sortable: true,
      render: (_: any, row: PaymentRequest) => (
        <span className="text-sm font-medium">৳{row.requestedAmount.toLocaleString()}</span>
      ),
    },
    {
      key: 'approvedAmount',
      label: 'Approved',
      sortable: true,
      render: (_: any, row: PaymentRequest) => (
        <span className="text-sm font-medium">
          {row.approvedAmount != null ? `৳${row.approvedAmount.toLocaleString()}` : '-'}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Method',
      sortable: false,
      render: (_: any, row: PaymentRequest) => {
        const method = PAYMENT_METHODS.find(m => m.value === row.paymentMethod);
        return <span className="text-sm">{method?.label || row.paymentMethod || '-'}</span>;
      },
    },
    {
      key: 'paymentReference',
      label: 'Reference',
      sortable: false,
      render: (_: any, row: PaymentRequest) => (
        <span className="text-sm text-gray-600">{row.paymentReference || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (_: any, row: PaymentRequest) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[row.status] || 'bg-gray-100 text-gray-800'}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'notes',
      label: 'Notes',
      sortable: false,
      render: (_: any, row: PaymentRequest) => (
        <div className="max-w-[150px]">
          {row.notes && <div className="text-xs text-gray-600 truncate" title={row.notes}>{row.notes}</div>}
          {row.adminNotes && <div className="text-xs text-blue-600 truncate" title={row.adminNotes}>Admin: {row.adminNotes}</div>}
          {!row.notes && !row.adminNotes && <span className="text-xs text-gray-400">-</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_: any, row: PaymentRequest) => (
        <div className="flex items-center gap-1.5">
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => openActionModal('approve', row)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                title="Approve"
              >
                <FaCheck size={10} /> Approve
              </button>
              <button
                onClick={() => openActionModal('reject', row)}
                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                title="Reject"
              >
                <FaTimes size={10} /> Reject
              </button>
            </>
          )}
          {row.status === 'approved' && (
            <button
              onClick={() => openActionModal('pay', row)}
              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
              title="Mark as Paid"
            >
              <FaMoneyBillWave size={10} /> Pay
            </button>
          )}
          {(row.status === 'paid' || row.status === 'rejected') && (
            <span className="text-xs text-gray-400 italic">No actions</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-blue-600 text-2xl">💰</span>
                <h1 className="text-2xl font-bold text-blue-700">Payment Requests</h1>
              </div>
              <p className="text-gray-500 text-sm">Manage agent commission payment requests - create, approve, pay, or reject.</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
            >
              <FaPlus size={12} /> New Payment Request
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-4 p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Agent</label>
              <select
                value={agentFilter}
                onChange={(e) => { setAgentFilter(e.target.value); setCurrentPage(1); }}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Agents</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <div className="flex items-center gap-1">
                <input
                  type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Name, Phone, Ref"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleSearch} className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
                  <FaSearch size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Controls */}
        <div className="mb-3 flex items-center justify-between">
          <PageSizeSelector value={itemsPerPage} onChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }} />
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={requests}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
        />

        {/* Create Payment Request Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">New Payment Request</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Agent *</label>
                  <select
                    value={createForm.agentId}
                    onChange={(e) => {
                      const agentId = e.target.value;
                      const agent = agents.find(a => String(a.id) === agentId);
                      setCreateForm(f => ({ ...f, agentId, paymentMethod: agent?.preferredMethod || f.paymentMethod }));
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Agent</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Amount (৳) *</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={createForm.requestedAmount}
                    onChange={(e) => setCreateForm(f => ({ ...f, requestedAmount: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
                  <select
                    value={createForm.paymentMethod}
                    onChange={(e) => setCreateForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Method</option>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Notes</label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2} placeholder="Optional notes"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={handleCreate} disabled={creating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Modal (Approve / Pay / Reject) */}
        {actionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-1 capitalize">{actionModal.type} Payment Request</h2>
              <p className="text-sm text-gray-500 mb-4">
                Agent: <strong>{actionModal.request.agentName}</strong> | Amount: <strong>৳{actionModal.request.requestedAmount.toLocaleString()}</strong>
              </p>

              {/* Agent Payment Info Card (shown in Pay modal) */}
              {actionModal.type === 'pay' && (actionModal.request.agentBkashNumber || actionModal.request.agentNagadNumber || actionModal.request.agentRocketNumber || actionModal.request.agentBankName) && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Agent&apos;s Saved Payment Info
                    {actionModal.request.agentPreferredMethod && (
                      <span className="ml-2 text-blue-600 normal-case font-medium">
                        (Preferred: {PAYMENT_METHODS.find(m => m.value === actionModal.request.agentPreferredMethod)?.label || actionModal.request.agentPreferredMethod})
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {actionModal.request.agentBkashNumber && (
                      <>
                        <span className="text-gray-500">bKash:</span>
                        <span className="font-medium text-gray-800">{actionModal.request.agentBkashNumber}</span>
                      </>
                    )}
                    {actionModal.request.agentNagadNumber && (
                      <>
                        <span className="text-gray-500">Nagad:</span>
                        <span className="font-medium text-gray-800">{actionModal.request.agentNagadNumber}</span>
                      </>
                    )}
                    {actionModal.request.agentRocketNumber && (
                      <>
                        <span className="text-gray-500">Rocket:</span>
                        <span className="font-medium text-gray-800">{actionModal.request.agentRocketNumber}</span>
                      </>
                    )}
                    {actionModal.request.agentBankName && (
                      <>
                        <span className="text-gray-500">Bank:</span>
                        <span className="font-medium text-gray-800">{actionModal.request.agentBankName}</span>
                      </>
                    )}
                    {actionModal.request.agentBankAccountHolder && (
                      <>
                        <span className="text-gray-500">Account Holder:</span>
                        <span className="font-medium text-gray-800">{actionModal.request.agentBankAccountHolder}</span>
                      </>
                    )}
                    {actionModal.request.agentBankAccountNumber && (
                      <>
                        <span className="text-gray-500">Account No:</span>
                        <span className="font-medium text-gray-800">{actionModal.request.agentBankAccountNumber}</span>
                      </>
                    )}
                    {actionModal.request.agentBankBranchName && (
                      <>
                        <span className="text-gray-500">Branch:</span>
                        <span className="font-medium text-gray-800">{actionModal.request.agentBankBranchName}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {actionModal.type === 'approve' && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Approved Amount (৳)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={actionForm.approvedAmount}
                      onChange={(e) => setActionForm(f => ({ ...f, approvedAmount: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {actionModal.type === 'pay' && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
                      <select
                        value={actionForm.paymentMethod}
                        onChange={(e) => setActionForm(f => ({ ...f, paymentMethod: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Method</option>
                        {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Payment Reference / TrxID</label>
                      <input
                        type="text"
                        value={actionForm.paymentReference}
                        onChange={(e) => setActionForm(f => ({ ...f, paymentReference: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Transaction ID or reference"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    {actionModal.type === 'reject' ? 'Reason for Rejection' : 'Admin Notes'}
                  </label>
                  <textarea
                    value={actionForm.adminNotes}
                    onChange={(e) => setActionForm(f => ({ ...f, adminNotes: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2} placeholder={actionModal.type === 'reject' ? 'Reason...' : 'Optional notes'}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={handleAction} disabled={actionLoading}
                  className={`px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-50 ${
                    actionModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    actionModal.type === 'pay' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}>
                  {actionLoading ? 'Processing...' : actionModal.type === 'approve' ? 'Approve' : actionModal.type === 'pay' ? 'Confirm Payment' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
