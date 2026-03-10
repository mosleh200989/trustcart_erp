import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import { useToast } from '@/contexts/ToastContext';
import { FaSearch } from 'react-icons/fa';
import apiClient from '@/services/api';

interface AgentRow {
  agentId: number;
  agentName: string;
  phone: string;
  totalOrders: number;
  totalProductQty: number;
  totalAmount: number;
  totalCommission: number;
  paidCommission: number;
  balance: number;
}

export default function CommissionAgentsPage() {
  const toast = useToast();

  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchText, setSearchText] = useState('');

  const loadAgents = useCallback(async (page?: number, pageSize?: number) => {
    try {
      setLoading(true);
      const p = page ?? currentPage;
      const ps = pageSize ?? itemsPerPage;
      const params: any = { page: p, limit: ps };
      if (searchText.trim()) params.search = searchText.trim();

      const response = await apiClient.get('/crm/commissions/agents', { params });
      const data = response.data;
      setAgents(data.data || []);
      setTotalPages(Math.ceil((data.total || 0) / ps));
    } catch (error) {
      console.error('Failed to load agent report:', error);
      toast.error('Failed to load agent report');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchText]);

  useEffect(() => {
    loadAgents(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadAgents(1, itemsPerPage);
  };

  const columns = [
    {
      key: 'agentName',
      label: 'Name',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm font-medium">{row.agentName || '-'}</span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm">{row.phone || '-'}</span>
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
      key: 'totalAmount',
      label: 'Total Amount',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm font-medium">৳{row.totalAmount.toLocaleString()}</span>
      ),
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
      label: 'Paid',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className="text-sm text-green-600 font-medium">৳{row.paidCommission.toLocaleString()}</span>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      sortable: true,
      render: (_: any, row: AgentRow) => (
        <span className={`text-sm font-semibold ${row.balance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
          ৳{row.balance.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-blue-600 text-2xl">👥</span>
            <h1 className="text-2xl font-bold text-blue-700">Agents</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Agent-wise commission summary report showing total orders, amounts, commissions, and balance.
          </p>
        </div>

        {/* Table Controls */}
        <div className="mb-3 flex items-center justify-between">
          <PageSizeSelector
            value={itemsPerPage}
            onChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
          <div className="flex items-center gap-2">
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
      </div>
    </AdminLayout>
  );
}
