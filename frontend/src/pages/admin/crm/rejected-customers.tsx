import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { apiUrl } from '@/config/backend';
import { useToast } from '@/contexts/ToastContext';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Pagination from '@/components/admin/Pagination';
import { FaBan, FaSearch, FaFileExport, FaUndo, FaTimes } from 'react-icons/fa';

interface Agent {
  id: number;
  name: string;
  lastName?: string;
}

interface RejectedCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  customer_type: string;
  assigned_to: number | null;
  agent_name: string | null;
  created_at: string;
  order_count: number;
  lifetime_value: number;
  tierData: {
    id: number;
    tier: string;
    isActive: boolean;
    tierAssignedAt: string;
    totalPurchases: number;
    totalSpent: number;
    engagementScore: number;
    daysInactive: number;
    notes: string | null;
  } | null;
}

export default function RejectedCustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<RejectedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [stats, setStats] = useState({ totalActive: 0, totalInactive: 0, rejected: 0 });
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setCurrentPage(1);
      setSelectedIds([]);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch agents
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(apiUrl('/crm/team/available-agents'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setAgents(await res.json());
      } catch {}
    })();
  }, []);

  // Fetch rejected customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams();
      params.append('tier', 'rejected');
      if (statusFilter) params.append('status', statusFilter);
      if (agentFilter) params.append('assignedTo', agentFilter);
      if (searchDebounced) params.append('search', searchDebounced);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const res = await fetch(apiUrl(`/lead-management/tiers/all?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setCustomers([]);
        return;
      }
      const data = await res.json();
      setCustomers(data.customers || []);
      setStats({
        totalActive: data.stats?.totalActive || 0,
        totalInactive: data.stats?.totalInactive || 0,
        rejected: data.stats?.rejected || 0,
      });
      if (data.pagination) {
        setTotalCount(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Error fetching rejected customers:', err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, statusFilter, agentFilter, searchDebounced]);

  useEffect(() => {
    setSelectedIds([]);
    fetchCustomers();
  }, [fetchCustomers]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  };

  // Remove from rejected (change tier back to silver)
  const removeTier = async (customerId: number) => {
    try {
      setUpdatingId(customerId);
      const token = localStorage.getItem('authToken');
      const res = await fetch(apiUrl('/lead-management/tier'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customerId, tier: 'silver', isActive: true, notes: 'Removed from rejected list' }),
      });
      if (res.ok) {
        toast.success('Customer removed from rejected list');
        fetchCustomers();
      } else {
        toast.error('Failed to update tier');
      }
    } catch {
      toast.error('Failed to update tier');
    } finally {
      setUpdatingId(null);
    }
  };

  // Bulk remove
  const bulkRemove = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Remove ${selectedIds.length} customer(s) from rejected list?`)) return;
    const token = localStorage.getItem('authToken');
    let success = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(apiUrl('/lead-management/tier'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ customerId: id, tier: 'silver', isActive: true, notes: 'Bulk removed from rejected list' }),
        });
        if (res.ok) success++;
      } catch {}
    }
    toast.success(`${success} customer(s) removed from rejected list`);
    setSelectedIds([]);
    fetchCustomers();
  };

  // CSV export
  const exportCsv = () => {
    const rows = selectedIds.length > 0 ? customers.filter((c) => selectedIds.includes(c.id)) : customers;
    const csv = [
      ['ID', 'Name', 'Phone', 'Email', 'Orders', 'Lifetime Value', 'Days Inactive', 'Notes', 'Rejected At'].join(','),
      ...rows.map((c) =>
        [
          c.id,
          `"${(c.first_name || '') + ' ' + (c.last_name || '')}"`,
          c.phone || '',
          c.email || '',
          c.order_count || 0,
          Number(c.lifetime_value || 0).toFixed(2),
          c.tierData?.daysInactive || 0,
          `"${(c.tierData?.notes || '').replace(/"/g, '""')}"`,
          c.tierData?.tierAssignedAt ? new Date(c.tierData.tierAssignedAt).toLocaleDateString() : '',
        ].join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rejected-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FaBan className="text-2xl text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-800">Rejected Customers</h1>
          </div>
          <p className="text-gray-600">Customers marked as rejected. Orders from these customers will show a warning.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-orange-50 p-4 rounded-lg shadow border-l-4 border-orange-500">
            <div className="text-sm text-orange-600 font-medium">Total Rejected</div>
            <div className="text-3xl font-bold text-orange-700">{stats.rejected}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-sm text-green-600 font-medium">Active (in list)</div>
            <div className="text-3xl font-bold text-green-700">{stats.totalActive}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg shadow border-l-4 border-gray-400">
            <div className="text-sm text-gray-600 font-medium">Inactive</div>
            <div className="text-3xl font-bold text-gray-700">{stats.totalInactive}</div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, phone, email..."
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Agent filter */}
            <select
              value={agentFilter}
              onChange={(e) => { setAgentFilter(e.target.value); setCurrentPage(1); }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.lastName || ''}
                </option>
              ))}
            </select>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={exportCsv} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                <FaFileExport /> Export
              </button>
              {selectedIds.length > 0 && (
                <button onClick={bulkRemove} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <FaUndo /> Remove ({selectedIds.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            {selectedIds.length > 0 && (
              <span className="text-sm font-medium text-orange-600">{selectedIds.length} selected</span>
            )}
            <div className={selectedIds.length === 0 ? 'ml-auto' : ''}>
              <PageSizeSelector value={itemsPerPage} onChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === customers.length && customers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Lifetime Value</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Days Inactive</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rejected At</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">No rejected customers found</td></tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-orange-50/30">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{c.first_name} {c.last_name}</div>
                        <div className="text-xs text-gray-500">ID: {c.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{c.phone || '-'}</div>
                        <div className="text-xs text-gray-500">{c.email || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.agent_name || '-'}</td>
                      <td className="px-4 py-3 text-center text-sm font-medium">{c.order_count || 0}</td>
                      <td className="px-4 py-3 text-center text-sm">৳{Number(c.lifetime_value || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm">{c.tierData?.daysInactive || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                        {c.tierData?.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        {c.tierData?.tierAssignedAt ? new Date(c.tierData.tierAssignedAt).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removeTier(c.id)}
                          disabled={updatingId === c.id}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                          title="Remove from rejected list"
                        >
                          {updatingId === c.id ? '...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-4 border-t">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              showInfo={true}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
