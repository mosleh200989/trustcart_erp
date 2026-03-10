import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import { useToast } from '@/contexts/ToastContext';
import { FaSearch } from 'react-icons/fa';
import apiClient from '@/services/api';

interface PaymentRecord {
  id: number;
  agentId: number;
  agentName: string;
  agentPhone: string;
  requestedAmount: number;
  approvedAmount: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  adminNotes: string | null;
  approvedByName: string;
  paidByName: string;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Agent {
  id: number;
  name: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  bkash: 'bKash',
  nagad: 'Nagad',
  cash: 'Cash',
  other: 'Other',
};

export default function CommissionPaymentHistoryPage() {
  const toast = useToast();

  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchText, setSearchText] = useState('');

  // Summary
  const [summary, setSummary] = useState({ totalPayments: 0, totalPaidAmount: 0 });

  // Filters
  const [agentFilter, setAgentFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadHistory = useCallback(async (page?: number, pageSize?: number) => {
    try {
      setLoading(true);
      const p = page ?? currentPage;
      const ps = pageSize ?? itemsPerPage;
      const params: any = { page: p, limit: ps };
      if (agentFilter) params.agentId = agentFilter;
      if (methodFilter) params.paymentMethod = methodFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (searchText.trim()) params.search = searchText.trim();

      const response = await apiClient.get('/crm/commissions/payment-history', { params });
      const data = response.data;
      setRecords(data.data || []);
      setTotalPages(Math.ceil((data.total || 0) / ps));
      if (data.agents) setAgents(data.agents);
      if (data.summary) setSummary(data.summary);
    } catch (error) {
      console.error('Failed to load payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, agentFilter, methodFilter, startDate, endDate, searchText]);

  useEffect(() => {
    loadHistory(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, agentFilter, methodFilter, startDate, endDate]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadHistory(1, itemsPerPage);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const columns = [
    {
      key: 'paidAt',
      label: 'Payment Date',
      sortable: true,
      render: (_: any, row: PaymentRecord) => (
        <div className="text-xs">
          <div>{formatDate(row.paidAt).split(' ')[0]}</div>
          <div className="text-gray-400">{formatDate(row.paidAt).split(' ')[1]}</div>
        </div>
      ),
    },
    {
      key: 'agentName',
      label: 'Agent',
      sortable: true,
      render: (_: any, row: PaymentRecord) => (
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
      render: (_: any, row: PaymentRecord) => (
        <span className="text-sm">৳{row.requestedAmount.toLocaleString()}</span>
      ),
    },
    {
      key: 'approvedAmount',
      label: 'Paid Amount',
      sortable: true,
      render: (_: any, row: PaymentRecord) => (
        <span className="text-sm font-semibold text-green-600">
          ৳{(row.approvedAmount ?? row.requestedAmount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Method',
      sortable: true,
      render: (_: any, row: PaymentRecord) => (
        <span className="text-sm">{PAYMENT_METHOD_LABELS[row.paymentMethod || ''] || row.paymentMethod || '-'}</span>
      ),
    },
    {
      key: 'paymentReference',
      label: 'Reference / TrxID',
      sortable: false,
      render: (_: any, row: PaymentRecord) => (
        <span className="text-sm text-gray-600 font-mono">{row.paymentReference || '-'}</span>
      ),
    },
    {
      key: 'paidByName',
      label: 'Paid By',
      sortable: false,
      render: (_: any, row: PaymentRecord) => (
        <span className="text-sm text-gray-600">{row.paidByName || '-'}</span>
      ),
    },
    {
      key: 'notes',
      label: 'Notes',
      sortable: false,
      render: (_: any, row: PaymentRecord) => (
        <div className="max-w-[150px]">
          {row.notes && <div className="text-xs text-gray-600 truncate" title={row.notes}>{row.notes}</div>}
          {row.adminNotes && <div className="text-xs text-blue-600 truncate" title={row.adminNotes}>Admin: {row.adminNotes}</div>}
          {!row.notes && !row.adminNotes && <span className="text-xs text-gray-400">-</span>}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-green-600 text-2xl">📋</span>
            <h1 className="text-2xl font-bold text-green-700">Payment History</h1>
          </div>
          <p className="text-gray-500 text-sm">Complete record of all commission payments made to agents.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
            <div className="text-sm text-gray-500">Total Payments</div>
            <div className="text-2xl font-bold text-blue-700">{summary.totalPayments.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
            <div className="text-sm text-gray-500">Total Paid Amount</div>
            <div className="text-2xl font-bold text-green-700">৳{summary.totalPaidAmount.toLocaleString()}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-4 p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
              <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
              <select
                value={methodFilter}
                onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1); }}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Methods</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
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
          data={records}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>
    </AdminLayout>
  );
}
