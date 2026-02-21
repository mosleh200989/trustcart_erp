import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { apiUrl, backendUrl } from '@/config/backend';
import { useToast } from '@/contexts/ToastContext';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Pagination from '@/components/admin/Pagination';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  assigned_to?: number;
  agent_name?: string;
}

interface Agent {
  id: number;
  name: string;
  lastName?: string;
}

interface CustomerTier {
  id: number;
  customerId: number;
  isActive: boolean;
  tier: string;
  tierAssignedAt: string;
  totalPurchases: number;
  totalSpent: number;
  engagementScore: number;
  daysInactive: number;
}

export default function CustomerTierManagementPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [filter, setFilter] = useState({ tier: 'all', status: 'all', agent: 'all' });
  const [loading, setLoading] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [tierForm, setTierForm] = useState({
    tier: 'silver',
    isActive: true,
    notes: '',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Agents state
  const [agents, setAgents] = useState<Agent[]>([]);

  const [stats, setStats] = useState({
    totalActive: 0,
    totalInactive: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
    vip: 0,
    noTier: 0,
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [filter, currentPage, itemsPerPage]);

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/crm/team/available-agents'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAgents(data || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Build query params
      const params = new URLSearchParams();
      if (filter.tier !== 'all') params.append('tier', filter.tier);
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.agent !== 'all') params.append('assignedTo', filter.agent);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      // Use optimized endpoint that returns all customers with tiers in one call
      const response = await fetch(apiUrl(`/lead-management/tiers/all?${params}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch tier data:', response.statusText);
        setCustomers([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data && data.customers) {
        setCustomers(data.customers);
        setStats(data.stats || {
          totalActive: 0,
          totalInactive: 0,
          silver: 0,
          gold: 0,
          platinum: 0,
          vip: 0,
          noTier: 0,
        });
        // Set pagination data
        if (data.pagination) {
          setTotalItems(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const openTierModal = (customer: any) => {
    setSelectedCustomer(customer);
    if (customer.tierData) {
      setTierForm({
        tier: customer.tierData.tier,
        isActive: customer.tierData.isActive,
        notes: '',
      });
    } else {
      setTierForm({
        tier: 'silver',
        isActive: true,
        notes: '',
      });
    }
    setShowTierModal(true);
  };

  const handleSaveTier = async () => {
    if (!selectedCustomer) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/lead-management/tier'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          ...tierForm,
        }),
      });

      if (response.ok) {
        toast.success('Tier updated successfully!');
        setShowTierModal(false);
        fetchCustomers();
      }
    } catch (error) {
      console.error('Error updating tier:', error);
      toast.error('Failed to update tier');
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'silver':
        return 'bg-gray-200 text-gray-800';
      case 'gold':
        return 'bg-yellow-200 text-yellow-800';
      case 'platinum':
        return 'bg-purple-200 text-purple-800';
      case 'vip':
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Customer Tier Management</h1>
          <p className="text-gray-600">Manage customer tiers and active/inactive status</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <div className="text-sm text-green-600 font-medium">Active Customers</div>
            <div className="text-2xl font-bold text-green-700">{stats.totalActive}</div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg shadow">
            <div className="text-sm text-red-600 font-medium">Inactive</div>
            <div className="text-2xl font-bold text-red-700">{stats.totalInactive}</div>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 font-medium">Silver</div>
            <div className="text-2xl font-bold text-gray-700">{stats.silver}</div>
          </div>

          <div className="bg-yellow-100 p-4 rounded-lg shadow">
            <div className="text-sm text-yellow-600 font-medium">Gold</div>
            <div className="text-2xl font-bold text-yellow-700">{stats.gold}</div>
          </div>

          <div className="bg-purple-100 p-4 rounded-lg shadow">
            <div className="text-sm text-purple-600 font-medium">Platinum</div>
            <div className="text-2xl font-bold text-purple-700">{stats.platinum}</div>
          </div>

          <div className="bg-red-100 p-4 rounded-lg shadow">
            <div className="text-sm text-red-600 font-medium">VIP</div>
            <div className="text-2xl font-bold text-red-700">{stats.vip}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Filter by Tier</label>
              <select
                value={filter.tier}
                onChange={(e) => { setFilter({ ...filter, tier: e.target.value }); setCurrentPage(1); }}
                className="w-full border rounded-lg p-2"
              >
                <option value="all">All Tiers</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="vip">VIP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Filter by Status</label>
              <select
                value={filter.status}
                onChange={(e) => { setFilter({ ...filter, status: e.target.value }); setCurrentPage(1); }}
                className="w-full border rounded-lg p-2"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Filter by Agent</label>
              <select
                value={filter.agent}
                onChange={(e) => { setFilter({ ...filter, agent: e.target.value }); setCurrentPage(1); }}
                className="w-full border rounded-lg p-2"
              >
                <option value="all">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id.toString()}>
                    {agent.name} {agent.lastName || ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between">
            <h2 className="text-xl font-semibold">
              Customers ({customers.length} of {totalItems})
            </h2>
            <PageSizeSelector
              value={itemsPerPage}
              onChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
              options={[25, 50, 100, 200]}
            />
          </div>

          {loading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No customers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchases</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Engagement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Inactive</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium">{customer.first_name} {customer.last_name}</div>
                        <div className="text-sm text-gray-500">ID: #{customer.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{customer.email}</div>
                        <div className="text-xs text-gray-500">{customer.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        {customer.tierData ? (
                          <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getTierBadgeColor(customer.tierData.tier)}`}>
                            {customer.tierData.tier}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Not Set</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {customer.tierData ? (
                          customer.tierData.isActive ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Inactive</span>
                          )
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">{customer.order_count || customer.tierData?.totalPurchases || 0}</td>
                      <td className="px-6 py-4 text-sm">৳{Number(customer.lifetime_value || customer.tierData?.totalSpent || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {customer.tierData ? (
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${customer.tierData.engagementScore}%` }}
                              />
                            </div>
                            <span className="text-sm">{customer.tierData.engagementScore}%</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">{customer.tierData?.daysInactive || 0}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openTierModal(customer)}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        {/* Tier Management Modal */}
        {showTierModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
              <h3 className="text-2xl font-bold mb-4">Manage Customer Tier</h3>

              <div className="mb-4 p-3 bg-gray-50 rounded">
                <div className="font-semibold">{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                <div className="text-sm text-gray-600">{selectedCustomer.email}</div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Customer Tier</label>
                  <select
                    value={tierForm.tier}
                    onChange={(e) => setTierForm({ ...tierForm, tier: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={tierForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setTierForm({ ...tierForm, isActive: e.target.value === 'active' })}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={tierForm.notes}
                    onChange={(e) => setTierForm({ ...tierForm, notes: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    rows={3}
                    placeholder="Reason for tier change or deactivation..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowTierModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTier}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
