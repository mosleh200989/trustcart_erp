import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Pagination from '@/components/admin/Pagination';
import ThSort from '@/components/admin/ThSort';
import { useSortableData } from '@/hooks/useSortableData';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import { FaEye } from 'react-icons/fa';

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
  const [filter, setFilter] = useState({
    tier: 'all',
    status: 'all',
    agent: 'all',
    deliveryDateStart: '',
    deliveryDateEnd: '',
    purchasesCount: '',
    cancelledOrdersCount: '',
    customerSegment: 'all',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [tierForm, setTierForm] = useState({
    tier: 'tier_3',
    isActive: true,
    notes: '',
  });
  const [updatingTierCustomerId, setUpdatingTierCustomerId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const { sorted: sortedTierCustomers, sortKey: tierSortKey, sortDir: tierSortDir, toggleSort: toggleTierSort } = useSortableData<any>(customers);

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
    tier1: 0,
    tier2: 0,
    tier3: 0,
    tier4: 0,
    tier5: 0,
    tier6: 0,
    rejected: 0,
    noTier: 0,
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [filter, currentPage, itemsPerPage, searchQuery]);

  const fetchAgents = async () => {
    try {
      const response = await apiClient.get('/crm/team/available-agents');
      setAgents(response.data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (filter.tier !== 'all') params.append('tier', filter.tier);
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.agent !== 'all') params.append('assignedTo', filter.agent);
      if (filter.deliveryDateStart) params.append('deliveryDateStart', filter.deliveryDateStart);
      if (filter.deliveryDateEnd) params.append('deliveryDateEnd', filter.deliveryDateEnd);
      if (filter.purchasesCount) params.append('purchasesCount', filter.purchasesCount);
      if (filter.cancelledOrdersCount) params.append('cancelledOrdersCount', filter.cancelledOrdersCount);
      if (filter.customerSegment !== 'all') params.append('customerSegment', filter.customerSegment);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      // Use optimized endpoint that returns all customers with tiers in one call
      const response = await apiClient.get(`/lead-management/tiers/all?${params}`);
      const data = response.data;
      
      if (data && data.customers) {
        setCustomers(data.customers);
        setStats(data.stats || {
          totalActive: 0,
          totalInactive: 0,
          tier1: 0,
          tier2: 0,
          tier3: 0,
          tier4: 0,
          tier5: 0,
          tier6: 0,
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
        tier: 'tier_3',
        isActive: true,
        notes: '',
      });
    }
    setShowTierModal(true);
  };

  const handleSaveTier = async () => {
    if (!selectedCustomer) return;

    if (tierForm.tier === 'rejected') {
      if (selectedCustomer.tierData?.tier !== 'tier_6') {
        toast.error('Only Tier 6 customers can be moved to the rejected list.');
        return;
      }

      const confirmed = confirm(
        `Are you sure you want to mark "${selectedCustomer.first_name} ${selectedCustomer.last_name}" as Rejected?\n\nThis will:\n• Unassign the customer from their agent and team leader\n• Remove them from all CRM and Telephony views\n• Move them to the Rejected Customers sub-module only`
      );
      if (!confirmed) return;
    }

    try {
      await apiClient.post('/lead-management/tier', {
        customerId: selectedCustomer.id,
        ...tierForm,
        isActive: tierForm.tier !== 'rejected' ? tierForm.isActive : false,
      });
      if (tierForm.tier === 'rejected') {
        toast.success('Customer moved to Rejected. They have been unassigned from agent and team leader.');
      } else {
        toast.success('Tier updated successfully!');
      }
      setShowTierModal(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error updating tier:', error);
      toast.error('Failed to update tier');
    }
  };

  const handleInlineTierUpdate = async (customer: any, tier: string) => {
    const currentTier = customer.tierData?.tier || 'no_tier';
    if (!tier || tier === currentTier) return;

    if (tier === 'rejected') {
      if (customer.tierData?.tier !== 'tier_6') {
        toast.error('Only Tier 6 customers can be moved to the rejected list.');
        return;
      }

      const confirmed = confirm(
        `Are you sure you want to mark "${customer.first_name} ${customer.last_name}" as Rejected?\n\nThis will:\n- Unassign the customer from their agent and team leader\n- Remove them from all CRM and Telephony views\n- Move them to the Rejected Customers sub-module only`
      );
      if (!confirmed) return;
    }

    try {
      setUpdatingTierCustomerId(customer.id);
      await apiClient.post('/lead-management/tier', {
        customerId: customer.id,
        tier,
        isActive: tier !== 'rejected' ? (customer.tierData?.isActive ?? true) : false,
        notes: '',
      });
      setCustomers((prev) =>
        prev.map((item) => {
          if (item.id !== customer.id) return item;
          if (tier === 'no_tier') {
            return { ...item, tierData: null };
          }
          return {
            ...item,
            tierData: {
              ...(item.tierData || {}),
              tier,
              isActive: tier !== 'rejected' ? (item.tierData?.isActive ?? true) : false,
              tierAssignedAt: new Date().toISOString(),
            },
          };
        })
      );
      setStats((prev) => {
        const next = { ...prev } as any;
        const decrementKey = currentTier === 'no_tier' ? 'noTier' : currentTier.replace('tier_', 'tier');
        const incrementKey = tier === 'no_tier' ? 'noTier' : tier.replace('tier_', 'tier');
        if (next[decrementKey] !== undefined) next[decrementKey] = Math.max(0, Number(next[decrementKey] || 0) - 1);
        if (next[incrementKey] !== undefined) next[incrementKey] = Number(next[incrementKey] || 0) + 1;
        return next;
      });
      toast.success(tier === 'rejected' ? 'Customer moved to Rejected.' : tier === 'no_tier' ? 'Customer tier cleared.' : 'Tier updated successfully!');
    } catch (error) {
      console.error('Error updating tier:', error);
      toast.error('Failed to update tier');
    } finally {
      setUpdatingTierCustomerId(null);
    }
  };

  const handleViewCustomerOrder = async (customerId: number) => {
    try {
      const response = await apiClient.get(`/order-management/customer/${customerId}/orders`);
      const orders = response.data?.data || response.data || [];
      if (orders.length > 0) {
        setSelectedOrderId(orders[0].id);
        setShowOrderModal(true);
      } else {
        toast.error('No orders found for this customer');
      }
    } catch (error) {
      console.error('Failed to fetch customer orders:', error);
      toast.error('Failed to fetch customer orders');
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'tier_1':
        return 'bg-emerald-100 text-emerald-800';
      case 'tier_2':
        return 'bg-sky-100 text-sky-800';
      case 'tier_3':
        return 'bg-slate-100 text-slate-800';
      case 'tier_4':
        return 'bg-amber-100 text-amber-800';
      case 'tier_5':
        return 'bg-orange-100 text-orange-800';
      case 'tier_6':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-orange-200 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getTierLabel = (tier?: string | null) => {
    const labels: Record<string, string> = {
      tier_1: 'Tier 1',
      tier_2: 'Tier 2',
      tier_3: 'Tier 3',
      tier_4: 'Tier 4',
      tier_5: 'Tier 5',
      tier_6: 'Tier 6',
      rejected: 'Rejected',
    };
    return tier ? labels[tier] || tier : 'Not Set';
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Customer Tier Management</h1>
          <p className="text-gray-600">Manage customer tiers and active/inactive status</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-emerald-50 p-4 rounded-lg shadow">
            <div className="text-sm text-emerald-700 font-medium">Tier 1</div>
            <div className="text-2xl font-bold text-emerald-800">{stats.tier1 || 0}</div>
          </div>

          <div className="bg-sky-50 p-4 rounded-lg shadow">
            <div className="text-sm text-sky-700 font-medium">Tier 2</div>
            <div className="text-2xl font-bold text-sky-800">{stats.tier2 || 0}</div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg shadow">
            <div className="text-sm text-slate-700 font-medium">Tier 3</div>
            <div className="text-2xl font-bold text-slate-800">{stats.tier3 || 0}</div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg shadow">
            <div className="text-sm text-amber-700 font-medium">Tier 4</div>
            <div className="text-2xl font-bold text-amber-800">{stats.tier4 || 0}</div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg shadow">
            <div className="text-sm text-orange-700 font-medium">Tier 5</div>
            <div className="text-2xl font-bold text-orange-800">{stats.tier5 || 0}</div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg shadow">
            <div className="text-sm text-red-700 font-medium">Tier 6</div>
            <div className="text-2xl font-bold text-red-800">{stats.tier6 || 0}</div>
          </div>

          <div className="bg-orange-100 p-4 rounded-lg shadow">
            <div className="text-sm text-orange-600 font-medium">Rejected</div>
            <div className="text-2xl font-bold text-orange-700">{stats.rejected || 0}</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name, phone, email, or order number..."
              className="w-full border rounded-lg p-2"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Filter by Tier</label>
              <select
                value={filter.tier}
                onChange={(e) => { setFilter({ ...filter, tier: e.target.value }); setCurrentPage(1); }}
                className="w-full border rounded-lg p-2"
              >
                <option value="all">All Tiers</option>
                <option value="no_tier">No Tier</option>
                <option value="tier_1">Tier 1 - Highest Value</option>
                <option value="tier_2">Tier 2</option>
                <option value="tier_3">Tier 3</option>
                <option value="tier_4">Tier 4</option>
                <option value="tier_5">Tier 5</option>
                <option value="tier_6">Tier 6 - Highest Risk</option>
                <option value="rejected">Rejected</option>
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

            <div>
              <label className="block text-sm font-medium mb-2">Customer Segment</label>
              <select
                value={filter.customerSegment}
                onChange={(e) => { setFilter({ ...filter, customerSegment: e.target.value }); setCurrentPage(1); }}
                className="w-full border rounded-lg p-2"
              >
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="legacy">Legacy</option>
                <option value="converted">Converted</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Delivery Date Start</label>
              <input
                type="date"
                value={filter.deliveryDateStart}
                onChange={(e) => { setFilter({ ...filter, deliveryDateStart: e.target.value }); setCurrentPage(1); }}
                className="w-full border rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Delivery Date End</label>
              <input
                type="date"
                value={filter.deliveryDateEnd}
                onChange={(e) => { setFilter({ ...filter, deliveryDateEnd: e.target.value }); setCurrentPage(1); }}
                className="w-full border rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Min Purchases Count</label>
              <input
                type="number"
                min="0"
                value={filter.purchasesCount}
                onChange={(e) => { setFilter({ ...filter, purchasesCount: e.target.value }); setCurrentPage(1); }}
                className="w-full border rounded-lg p-2"
                placeholder="Any"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Min Cancelled Orders</label>
              <input
                type="number"
                min="0"
                value={filter.cancelledOrdersCount}
                onChange={(e) => { setFilter({ ...filter, cancelledOrdersCount: e.target.value }); setCurrentPage(1); }}
                className="w-full border rounded-lg p-2"
                placeholder="Any"
              />
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
              options={[50, 100, 200]}
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
                      <ThSort col="first_name" label="Customer" sortKey={tierSortKey} sortDir={tierSortDir} onSort={toggleTierSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
                      <ThSort col="email" label="Contact" sortKey={tierSortKey} sortDir={tierSortDir} onSort={toggleTierSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
                      <ThSort col="tier" label="Tier" sortKey={tierSortKey} sortDir={tierSortDir} onSort={toggleTierSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
                      <ThSort col="order_count" label="Purchases" sortKey={tierSortKey} sortDir={tierSortDir} onSort={toggleTierSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
                      <ThSort col="cancelled_order_count" label="Cancelled Orders" sortKey={tierSortKey} sortDir={tierSortDir} onSort={toggleTierSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
                      <ThSort col="last_delivery_date" label="Last Delivery Date" sortKey={tierSortKey} sortDir={tierSortDir} onSort={toggleTierSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
                      <ThSort col="lifetime_value" label="Total Spent" sortKey={tierSortKey} sortDir={tierSortDir} onSort={toggleTierSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedTierCustomers.map((customer) => (
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
                        <select
                          value={customer.tierData?.tier || 'no_tier'}
                          onChange={(e) => handleInlineTierUpdate(customer, e.target.value)}
                          disabled={updatingTierCustomerId === customer.id}
                          className={`min-w-[150px] border rounded-lg px-2 py-1 text-xs font-semibold uppercase disabled:opacity-60 ${getTierBadgeColor(customer.tierData?.tier || '')}`}
                        >
                          <option value="no_tier">No Tier</option>
                          <option value="tier_1">Tier 1</option>
                          <option value="tier_2">Tier 2</option>
                          <option value="tier_3">Tier 3</option>
                          <option value="tier_4">Tier 4</option>
                          <option value="tier_5">Tier 5</option>
                          <option value="tier_6">Tier 6</option>
                          <option value="rejected" disabled={customer.tierData?.tier !== 'tier_6'}>Rejected</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm">{customer.order_count || customer.tierData?.totalPurchases || 0}</td>
                      <td className="px-6 py-4 text-sm">{customer.cancelled_order_count || 0}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        {customer.last_delivery_date ? new Date(customer.last_delivery_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">৳{Number(customer.lifetime_value || customer.tierData?.totalSpent || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewCustomerOrder(customer.id)}
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                        >
                          <FaEye className="text-xs" /> View
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
                    <option value="tier_1">Tier 1 - Highest Value</option>
                    <option value="tier_2">Tier 2</option>
                    <option value="tier_3">Tier 3</option>
                    <option value="tier_4">Tier 4</option>
                    <option value="tier_5">Tier 5</option>
                    <option value="tier_6">Tier 6 - Highest Risk</option>
                    <option value="rejected" disabled={selectedCustomer.tierData?.tier !== 'tier_6'}>Rejected - Tier 6 only</option>
                  </select>
                  {tierForm.tier === 'rejected' && (
                    <p className="mt-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-3 py-2">
                      ⚠️ This customer will be <strong>unassigned</strong> from their agent and team leader, and will only appear in the <strong>Rejected Customers</strong> sub-module. Orders from this customer will still be visible in the Orders page.
                    </p>
                  )}
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

        {showOrderModal && selectedOrderId && (
          <AdminOrderDetailsModal
            orderId={selectedOrderId}
            onClose={() => {
              setShowOrderModal(false);
              setSelectedOrderId(null);
            }}
            onUpdate={fetchCustomers}
          />
        )}
      </div>
    </AdminLayout>
  );
}
