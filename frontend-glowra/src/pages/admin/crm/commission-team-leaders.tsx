import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import { useToast } from '@/contexts/ToastContext';
import { FaSearch, FaMoneyBillWave } from 'react-icons/fa';
import apiClient from '@/services/api';

interface TLRow {
  tlId: number;
  tlName: string;
  phone: string;
  totalOrders: number;
  upsellQty: number;
  commissionRate: number;
  orderRate: number;
  upsellRate: number;
  crossSellRate: number;
  orderCommission: number;
  upsellCommission: number;
  crossSellCommission: number;
  totalCommission: number;
  paidCommission: number;
  balance: number;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export default function CommissionTeamLeadersPage() {
  const toast = useToast();
  const router = useRouter();

  const [teamLeaders, setTeamLeaders] = useState<TLRow[]>([]);
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
  const [paymentModal, setPaymentModal] = useState<TLRow | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadTeamLeaders = useCallback(async (page?: number, pageSize?: number) => {
    try {
      setLoading(true);
      const p = page ?? currentPage;
      const ps = pageSize ?? itemsPerPage;
      const params: any = { page: p, limit: ps };
      if (searchText.trim()) params.search = searchText.trim();
      if (monthFilter) params.month = monthFilter;

      const response = await apiClient.get('/crm/commissions/team-leaders', { params });
      const data = response.data;
      setTeamLeaders(data.data || []);
      setTotalPages(Math.ceil((data.total || 0) / ps));
    } catch (error) {
      console.error('Failed to load team leader report:', error);
      toast.error('Failed to load team leader report');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchText, monthFilter]);

  useEffect(() => {
    loadTeamLeaders(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, monthFilter]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadTeamLeaders(1, itemsPerPage);
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
        agentId: paymentModal.tlId,
        requestedAmount: amount,
        paymentMethod: paymentForm.paymentMethod || undefined,
        notes: paymentForm.notes || undefined,
      });
      toast.success(`Payment request of ৳${amount.toLocaleString()} created for ${paymentModal.tlName}`);
      setPaymentModal(null);
      loadTeamLeaders();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create payment request');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'tlName',
      label: 'Name',
      sortable: true,
      render: (_: any, row: TLRow) => (
        <div>
          <div className="text-sm font-medium">{row.tlName || '-'}</div>
          {row.phone && <div className="text-xs text-gray-500 mt-0.5">{row.phone}</div>}
        </div>
      ),
    },
    {
      key: 'totalOrders',
      label: 'Orders',
      sortable: true,
      render: (_: any, row: TLRow) => (
        <div>
          <span className="text-sm font-medium">{row.totalOrders.toLocaleString()}</span>
          {row.orderRate > 0 && <div className="text-xs text-gray-500">৳{row.orderRate}/order</div>}
        </div>
      ),
    },
    {
      key: 'orderCommission',
      label: 'Order Commission',
      sortable: true,
      render: (_: any, row: TLRow) => (
        <span className="text-sm font-medium text-blue-700">৳{row.orderCommission.toLocaleString()}</span>
      ),
    },
    {
      key: 'upsellQty',
      label: 'Upsells',
      sortable: true,
      render: (_: any, row: TLRow) => (
        <div>
          <span className="text-sm font-medium">{row.upsellQty.toLocaleString()}</span>
          {row.upsellRate > 0 && <div className="text-xs text-gray-500">৳{row.upsellRate}/upsell</div>}
        </div>
      ),
    },
    {
      key: 'upsellCommission',
      label: 'Upsell Commission',
      sortable: true,
      render: (_: any, row: TLRow) => (
        <span className="text-sm font-medium text-green-700">৳{row.upsellCommission.toLocaleString()}</span>
      ),
    },
    {
      key: 'crossSellCommission',
      label: 'Cross-sell Commission',
      sortable: true,
      render: (_: any, row: TLRow) => (
        <span className="text-sm font-medium text-purple-700">৳{row.crossSellCommission.toLocaleString()}</span>
      ),
    },
    {
      key: 'totalCommission',
      label: 'Total Commission',
      sortable: true,
      render: (_: any, row: TLRow) => (
        <span className="text-sm font-bold">৳{row.totalCommission.toLocaleString()}</span>
      ),
    },
    {
      key: 'paidCommission',
      label: 'Last Paid',
      sortable: true,
      render: (_: any, row: TLRow) => (
        <span className="text-sm text-green-600 font-medium">৳{row.paidCommission.toLocaleString()}</span>
      ),
    },
    {
      key: 'balance',
      label: 'Unpaid Balance',
      sortable: true,
      render: (_: any, row: TLRow) => (
        <span className={`text-sm font-semibold ${row.balance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
          ৳{row.balance.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_: any, row: TLRow) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPaymentModal(row);
              setPaymentForm({ amount: String(row.balance > 0 ? row.balance : ''), paymentMethod: '', notes: '' });
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1"
            title="Payment Request"
          >
            <FaMoneyBillWave size={12} /> Payment Request
          </button>
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
            <span className="text-purple-600 text-2xl">👔</span>
            <h1 className="text-2xl font-bold text-purple-700">Team Leaders</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Team leader commission summary — showing total orders by their agents, commission rate, and unpaid balance.
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
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Search:</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Name or Phone"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-56"
            />
            <button
              onClick={handleSearch}
              className="bg-purple-600 text-white px-4 py-1.5 rounded hover:bg-purple-700 flex items-center gap-1 text-sm"
            >
              <FaSearch size={12} /> Search
            </button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={teamLeaders}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
        />

        {/* Payment Request Modal */}
        {paymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-1">New Payment Request</h2>
              <p className="text-sm text-gray-500 mb-4">
                Team Leader: <strong>{paymentModal.tlName}</strong> | Balance: <strong className="text-red-600">৳{paymentModal.balance.toLocaleString()}</strong>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Amount (৳) *</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
