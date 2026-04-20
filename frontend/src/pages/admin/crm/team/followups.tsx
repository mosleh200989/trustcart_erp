import { useEffect, useState, useCallback, useRef } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Pagination from '@/components/admin/Pagination';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import { useToast } from '@/contexts/ToastContext';

interface Customer {
  id: number | string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  tier?: string | null;
  next_follow_up?: string;
}

interface PaginatedResponse {
  data: Customer[];
  total: number;
}

interface Agent {
  id: number;
  name: string;
  lastName?: string;
  email?: string;
  teamId?: number | null;
}

export default function CrmFollowupsPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const totalPages = Math.max(1, Math.ceil(totalCustomers / itemsPerPage));
  
  // Date filter states
  const today = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [todayOnly, setTodayOnly] = useState(false);
  
  // Agent search autocomplete states
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentSearchTerm, setAgentSearchTerm] = useState('');
  const [agentSuggestions, setAgentSuggestions] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const agentInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load available agents on mount
  useEffect(() => {
    loadAvailableAgents();
  }, []);

  // Load follow-ups when agent is selected or date filters change
  useEffect(() => {
    if (selectedAgent) {
      loadFollowups(selectedAgent.id);
    } else {
      setCustomers([]);
      setTotalCustomers(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent, dateFilter, todayOnly, currentPage, itemsPerPage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAgentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Agent search with debounce
  const searchAgents = useCallback(async (term: string) => {
    if (!term.trim()) {
      setAgentSuggestions(agents);
      return;
    }
    try {
      const res = await apiClient.get('/crm/team/agents/search', { params: { q: term } });
      setAgentSuggestions(Array.isArray((res as any)?.data) ? (res as any).data : []);
    } catch {
      setAgentSuggestions([]);
    }
  }, [agents]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showAgentDropdown) {
        searchAgents(agentSearchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [agentSearchTerm, showAgentDropdown, searchAgents]);

  const loadAvailableAgents = async () => {
    try {
      const res = await apiClient.get('/crm/team/available-agents');
      const agentsData = Array.isArray((res as any)?.data) ? (res as any).data : [];
      setAgents(agentsData);
      setAgentSuggestions(agentsData);
    } catch (error) {
      console.error('Failed to load available agents', error);
      setAgents([]);
    }
  };

  const loadFollowups = async (agentId: number) => {
    try {
      setLoading(true);
      
      // Build date params
      const params: any = { page: currentPage, limit: itemsPerPage };
      if (todayOnly) {
        params.followUpDate = today;
      } else {
        if (dateFilter.startDate) params.startDate = dateFilter.startDate;
        if (dateFilter.endDate) params.endDate = dateFilter.endDate;
      }
      
      const res = await apiClient.get<PaginatedResponse>(`/crm/team/agent/${agentId}/customers`, {
        params
      });
      setCustomers(res.data?.data ?? []);
      setTotalCustomers(res.data?.total ?? 0);
    } catch (error) {
      console.error('Failed to load follow-ups', error);
      setCustomers([]);
      setTotalCustomers(0);
    } finally {
      setLoading(false);
    }
  };

  const formatName = (c: Customer) => {
    if (c.name) return c.name;
    const full = [c.name, c.last_name].filter(Boolean).join(' ');
    return full || 'N/A';
  };

  const getTierColor = (tier: string | undefined | null) => {
    switch (tier?.toLowerCase()) {
      case 'vip': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'platinum': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'gold': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'silver': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'repeat': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'new': return 'bg-green-100 text-green-800 border-green-300';
      case 'blacklist': return 'bg-red-100 text-red-800 border-red-300';
      case 'rejected': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  const handleViewOrder = async (customerId: number | string) => {
    try {
      const response = await apiClient.get(`/order-management/customer/${customerId}/orders`);
      const orders = response.data?.data || response.data || [];
      if (orders.length > 0) {
        setSelectedOrderId(orders[0].id);
        setShowOrderModal(true);
      } else {
        toast.warning('No orders found for this customer');
      }
    } catch {
      toast.error('Failed to fetch customer orders');
    }
  };

  const handleTodayToggle = () => {
    if (!todayOnly) {
      // Switching to today only - clear date filters
      setDateFilter({ startDate: '', endDate: '' });
    }
    setTodayOnly(!todayOnly);
    setCurrentPage(1);
  };

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowAgentDropdown(false);
    setCurrentPage(1);
  };

  const clearAgentSelection = () => {
    setSelectedAgent(null);
    setAgentSearchTerm('');
    setAgentSuggestions(agents);
    setCurrentPage(1);
    agentInputRef.current?.focus();
  };

  const handleDateFilterChange = (field: 'startDate' | 'endDate', value: string) => {
    setTodayOnly(false);
    setDateFilter({ ...dateFilter, [field]: value });
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">CRM Follow-ups</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Select Agent:</span>
            <div className="relative" ref={dropdownRef}>
              <input
                ref={agentInputRef}
                type="text"
                value={selectedAgent ? `${selectedAgent.name} ${selectedAgent.lastName || ''} (ID: ${selectedAgent.id})` : agentSearchTerm}
                onChange={(e) => {
                  setAgentSearchTerm(e.target.value);
                  setSelectedAgent(null);
                  setShowAgentDropdown(true);
                }}
                onFocus={() => {
                  setShowAgentDropdown(true);
                  if (!agentSearchTerm) {
                    setAgentSuggestions(agents);
                  }
                }}
                placeholder="Type agent name..."
                className="w-64 border rounded-lg px-3 py-1.5 text-sm pr-8"
              />
              {selectedAgent && (
                <button
                  type="button"
                  onClick={clearAgentSelection}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
              
              {showAgentDropdown && !selectedAgent && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {agentSuggestions.length === 0 ? (
                    <div className="p-3 text-gray-500 text-sm">No agents found</div>
                  ) : (
                    agentSuggestions.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => handleAgentSelect(agent)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between border-b last:border-b-0"
                      >
                        <div>
                          <div className="font-medium text-gray-800">
                            {agent.name} {agent.lastName || ''}
                          </div>
                          <div className="text-xs text-gray-500">{agent.email || ''}</div>
                        </div>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">ID: {agent.id}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date Filters and Stats */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Today Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={todayOnly}
                onChange={handleTodayToggle}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Today Only</span>
            </label>

            {/* Date Range Filters */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">From:</label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => handleDateFilterChange('startDate', e.target.value)}
                disabled={todayOnly}
                className="border rounded-lg px-3 py-1.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">To:</label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => handleDateFilterChange('endDate', e.target.value)}
                disabled={todayOnly}
                className="border rounded-lg px-3 py-1.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Stats */}
            {selectedAgent && (
              <div className="ml-auto flex items-center gap-4">
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <span className="text-sm text-blue-600 font-medium">
                    Total Customers: <span className="text-lg font-bold">{totalCustomers}</span>
                  </span>
                </div>
                <div className="bg-green-50 px-4 py-2 rounded-lg">
                  <span className="text-sm text-green-600 font-medium">
                    Showing: <span className="text-lg font-bold">{customers.length}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              Assigned Customers
              {selectedAgent && <span className="text-sm font-normal text-gray-500 ml-2">for {selectedAgent.name} {selectedAgent.lastName || ''}</span>}
            </h2>
            <PageSizeSelector
              value={itemsPerPage}
              onChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="p-6 pt-0">
          {!selectedAgent ? (
            <div className="text-gray-500 pt-4">Please select an agent to view assigned customers.</div>
          ) : loading ? (
            <div className="text-gray-500 pt-4">Loading follow-ups...</div>
          ) : customers.length === 0 ? (
            <div className="text-gray-500 pt-4">No customers assigned to this agent.</div>
          ) : (
            <div className="overflow-x-auto pt-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Tier</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Next Follow-up</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">#{c.id}</td>
                      <td className="px-4 py-2">{formatName(c)}</td>
                      <td className="px-4 py-2">{c.phone || 'N/A'}</td>
                      <td className="px-4 py-2">
                        {c.tier ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getTierColor(c.tier)}`}>
                            {c.tier.charAt(0).toUpperCase() + c.tier.slice(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">{c.next_follow_up ? new Date(c.next_follow_up).toLocaleString() : '-'}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleViewOrder(c.id)}
                          className="px-3 py-1 border rounded hover:bg-gray-50 text-sm text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {selectedAgent && totalCustomers > 0 && (
            <div className="pt-4 border-t mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCustomers}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                showInfo={true}
              />
            </div>
          )}
          </div>
        </div>
      </div>
      {showOrderModal && selectedOrderId && (
        <AdminOrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => { setShowOrderModal(false); setSelectedOrderId(null); }}
          onUpdate={() => {}}
        />
      )}
    </AdminLayout>
  );
}
