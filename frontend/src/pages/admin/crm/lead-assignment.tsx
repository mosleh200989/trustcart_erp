import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Pagination from '@/components/admin/Pagination';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaEye } from 'react-icons/fa';

interface LeadCustomer {
  id: number | string;
  name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  priority?: string;
  assigned_to?: number | null;
  created_at?: string;
  first_order_date?: string;
  order_count?: number;
}

interface PaginatedResponse {
  data: LeadCustomer[];
  total: number;
}

interface Team {
  id: number;
  name: string;
  code?: string;
  memberCount?: number;
}

interface User {
  id: number;
  name: string;
  lastName: string;
  email: string;
  roleId?: number;
  teamId?: number | null;
}

export default function LeadAssignmentPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<LeadCustomer[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);

  // Filters
  const [assignmentStatus, setAssignmentStatus] = useState<'all' | 'assigned' | 'unassigned'>('unassigned');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('');
  const [purchaseStageFilter, setPurchaseStageFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Team selection
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Single assign modal
  const [selectedLead, setSelectedLead] = useState<LeadCustomer | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Bulk selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number | string>>(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  // Order Details Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Agent autocomplete
  const [agentSearchTerm, setAgentSearchTerm] = useState('');
  const [agentSuggestions, setAgentSuggestions] = useState<User[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const agentInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentStatus, searchTerm, priorityFilter, customerTypeFilter, purchaseStageFilter, dateFrom, dateTo, page]);

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

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [teamsRes, agentsRes] = await Promise.all([
        apiClient.get('/crm/team/teams'),
        apiClient.get('/crm/team/available-agents'),
      ]);

      const teamsData: Team[] = Array.isArray((teamsRes as any)?.data) ? (teamsRes as any).data : [];
      setTeams(teamsData);
      setUsers(Array.isArray((agentsRes as any)?.data) ? (agentsRes as any).data : []);

      if (!selectedTeamId && teamsData.length) {
        setSelectedTeamId(Number(teamsData[0].id));
      }

      await loadLeads();
    } catch (error) {
      console.error('Failed to load lead assignment data', error);
      setTeams([]);
      setUsers([]);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const params: any = { 
        page, 
        limit,
        assignmentStatus,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (priorityFilter) params.priority = priorityFilter;
      if (customerTypeFilter) params.customerType = customerTypeFilter;
      if (purchaseStageFilter) params.purchaseStage = purchaseStageFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await apiClient.get<PaginatedResponse>('/crm/team/leads', { params });
      const data = Array.isArray((res as any)?.data?.data) ? (res as any).data.data : [];
      const total = (res as any)?.data?.total || 0;
      setLeads(data);
      setTotalLeads(total);
    } catch (error) {
      console.error('Failed to load leads', error);
      setLeads([]);
      setTotalLeads(0);
    }
  };

  // Agent search with debounce
  const searchAgents = useCallback(async (term: string) => {
    if (!term.trim()) {
      setAgentSuggestions(users);
      return;
    }
    try {
      const res = await apiClient.get('/crm/team/agents/search', { params: { q: term } });
      setAgentSuggestions(Array.isArray((res as any)?.data) ? (res as any).data : []);
    } catch {
      setAgentSuggestions([]);
    }
  }, [users]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showAgentDropdown) {
        searchAgents(agentSearchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [agentSearchTerm, showAgentDropdown, searchAgents]);

  const teamAgents = useMemo(() => {
    if (!selectedTeamId) return [];
    return users.filter((u) => Number(u.teamId) === Number(selectedTeamId));
  }, [users, selectedTeamId]);

  const formatLeadName = (lead: LeadCustomer) => {
    const n = (lead.name || '').trim();
    const ln = (lead.last_name || '').trim();
    const full = [n, ln].filter(Boolean).join(' ').trim();
    return full || 'N/A';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  // Handle viewing order details for a lead/customer
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
    } catch (error: any) {
      console.error('Error fetching customer orders:', error);
      toast.error('Failed to fetch customer orders');
    }
  };

  // Single assign
  const openAssignModal = (lead: LeadCustomer) => {
    setSelectedLead(lead);
    setSelectedAgent(null);
    setAgentSearchTerm('');
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedLead || !selectedAgent) return;

    try {
      await apiClient.post(`/crm/team/leads/${selectedLead.id}/assign`, {
        agentId: Number(selectedAgent.id),
      });

      toast.success('Lead assigned successfully');
      setShowAssignModal(false);
      setSelectedLead(null);
      setSelectedAgent(null);
      setAgentSearchTerm('');
      await loadLeads();
    } catch (error) {
      console.error('Failed to assign lead', error);
      toast.error('Failed to assign lead');
    }
  };

  // Bulk selection
  const toggleSelectLead = (leadId: number | string) => {
    const newSet = new Set(selectedLeadIds);
    if (newSet.has(leadId)) {
      newSet.delete(leadId);
    } else {
      newSet.add(leadId);
    }
    setSelectedLeadIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map(l => l.id)));
    }
  };

  const openBulkAssignModal = () => {
    setSelectedAgent(null);
    setAgentSearchTerm('');
    setShowBulkAssignModal(true);
  };

  const handleBulkAssign = async () => {
    if (selectedLeadIds.size === 0 || !selectedAgent) return;

    try {
      const res = await apiClient.post('/crm/team/leads/bulk-assign', {
        customerIds: Array.from(selectedLeadIds),
        agentId: Number(selectedAgent.id),
      });
      
      const result = (res as any)?.data;
      toast.success(`Bulk assign completed! Success: ${result?.success || 0}, Failed: ${result?.failed || 0}`);
      
      setShowBulkAssignModal(false);
      setSelectedLeadIds(new Set());
      setSelectedAgent(null);
      setAgentSearchTerm('');
      await loadLeads();
    } catch (error) {
      console.error('Failed to bulk assign leads', error);
      toast.error('Failed to bulk assign leads');
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('');
    setCustomerTypeFilter('');
    setPurchaseStageFilter('');
    setDateFrom('');
    setDateTo('');
    setAssignmentStatus('unassigned');
    setPage(1);
  };

  // Agent autocomplete component
  const AgentAutocomplete = ({ onSelect }: { onSelect: (agent: User) => void }) => (
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
            setAgentSuggestions(users);
          }
        }}
        placeholder="Type agent name or ID..."
        className="w-full border rounded-lg p-2 pr-8"
      />
      {selectedAgent && (
        <button
          type="button"
          onClick={() => {
            setSelectedAgent(null);
            setAgentSearchTerm('');
            agentInputRef.current?.focus();
          }}
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
                onClick={() => {
                  setSelectedAgent(agent);
                  setShowAgentDropdown(false);
                  onSelect(agent);
                }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between border-b last:border-b-0"
              >
                <div>
                  <div className="font-medium text-gray-800">
                    {agent.name} {agent.lastName || ''}
                  </div>
                  <div className="text-xs text-gray-500">{agent.email}</div>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">ID: {agent.id}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );

  const totalPages = Math.ceil(totalLeads / limit);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Lead Assignment</h1>
            <p className="text-gray-600">Assign leads to agents in your CRM teams</p>
          </div>
          <button
            onClick={loadLeads}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Assignment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Status</label>
              <select
                value={assignmentStatus}
                onChange={(e) => {
                  setAssignmentStatus(e.target.value as 'all' | 'assigned' | 'unassigned');
                  setPage(1);
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="all">All Leads</option>
                <option value="unassigned">Unassigned Only</option>
                <option value="assigned">Assigned Only</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Name, email, phone..."
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">All Priorities</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Sleep/Dead</option>
                <option value="new">New</option>
              </select>
            </div>

            {/* Customer Type (VIP/Platinum) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
              <select
                value={customerTypeFilter}
                onChange={(e) => {
                  setCustomerTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">All Types</option>
                <option value="vip">VIP</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            {/* Purchase Stage (Repeat) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Stage</label>
              <select
                value={purchaseStageFilter}
                onChange={(e) => {
                  setPurchaseStageFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">All Stages</option>
                <option value="new">New (1st order)</option>
                <option value="repeat_2">Repeat-2</option>
                <option value="repeat_3">Repeat-3</option>
                <option value="regular">Regular (4-7)</option>
                <option value="permanent">Permanent (8+)</option>
              </select>
            </div>

            {/* Team Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={selectedTeamId ?? ''}
                onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All Teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.code ? ` (${t.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Stats & Bulk Actions */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex gap-6 text-sm">
            <div>
              Total: <span className="font-semibold">{totalLeads}</span> leads
            </div>
            <div>
              Selected: <span className="font-semibold text-blue-600">{selectedLeadIds.size}</span>
            </div>
            {selectedTeamId && (
              <div>
                Agents in team: <span className="font-semibold">{teamAgents.length}</span>
              </div>
            )}
          </div>

          {selectedLeadIds.size > 0 && (
            <button
              onClick={openBulkAssignModal}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Bulk Assign ({selectedLeadIds.size} selected)
            </button>
          )}
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {assignmentStatus === 'unassigned' ? 'Unassigned Leads' : 
               assignmentStatus === 'assigned' ? 'Assigned Leads' : 'All Leads'}
            </h2>
            <PageSizeSelector
              value={limit}
              onChange={(size) => {
                setLimit(size);
                setPage(1);
              }}
            />
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-600">Loading...</div>
          ) : leads.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No leads found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.size === leads.length && leads.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leads.map((lead) => (
                      <tr key={String(lead.id)} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.has(lead.id)}
                            onChange={() => toggleSelectLead(lead.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{formatLeadName(lead)}</div>
                          <div className="text-xs text-gray-500">ID: {lead.id}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">{lead.email || 'No email'}</div>
                          <div className="text-xs text-gray-500">{lead.phone || 'No phone'}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                            lead.priority === 'hot' ? 'bg-red-100 text-red-700' :
                            lead.priority === 'warm' ? 'bg-orange-100 text-orange-700' :
                            lead.priority === 'cold' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {lead.priority === 'cold' ? 'Sleep/Dead' : (lead.priority || 'new')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {lead.assigned_to ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              Assigned (#{lead.assigned_to})
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 font-medium">
                          {lead.order_count || 0}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {lead.first_order_date ? formatDate(lead.first_order_date) : 'No orders'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewOrder(lead.id)}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                            >
                              <FaEye size={12} /> View
                            </button>
                            <button
                              onClick={() => openAssignModal(lead)}
                              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                            >
                              {lead.assigned_to ? 'Reassign' : 'Assign'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={totalLeads}
                    itemsPerPage={limit}
                    onPageChange={setPage}
                    showInfo={true}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Single Assign Modal */}
        {showAssignModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full mx-4">
              <h3 className="text-2xl font-bold mb-4">
                {selectedLead.assigned_to ? 'Reassign Lead' : 'Assign Lead'}
              </h3>

              <div className="mb-4 p-4 bg-gray-50 rounded">
                <div className="font-semibold">{formatLeadName(selectedLead)}</div>
                <div className="text-sm text-gray-600">{selectedLead.email || 'No email'} | {selectedLead.phone || 'No phone'}</div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Agent (Sales Executive)</label>
                <AgentAutocomplete onSelect={(agent) => setSelectedAgent(agent)} />
                <p className="text-xs text-gray-500 mt-1">Type to search by name or ID</p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedLead(null);
                    setSelectedAgent(null);
                    setAgentSearchTerm('');
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedAgent}
                  className={`px-6 py-2 rounded-lg text-white ${
                    selectedAgent ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Assign Lead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Assign Modal */}
        {showBulkAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full mx-4">
              <h3 className="text-2xl font-bold mb-4">Bulk Assign Leads</h3>

              <div className="mb-4 p-4 bg-blue-50 rounded">
                <div className="font-semibold text-blue-800">
                  {selectedLeadIds.size} lead(s) selected
                </div>
                <div className="text-sm text-blue-600">
                  All selected leads will be assigned to the chosen agent
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Agent (Sales Executive)</label>
                <AgentAutocomplete onSelect={(agent) => setSelectedAgent(agent)} />
                <p className="text-xs text-gray-500 mt-1">Type to search by name or ID</p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowBulkAssignModal(false);
                    setSelectedAgent(null);
                    setAgentSearchTerm('');
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={!selectedAgent}
                  className={`px-6 py-2 rounded-lg text-white ${
                    selectedAgent ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Assign {selectedLeadIds.size} Lead(s)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {showOrderModal && selectedOrderId && (
          <AdminOrderDetailsModal
            orderId={selectedOrderId}
            onClose={() => {
              setShowOrderModal(false);
              setSelectedOrderId(null);
            }}
            onUpdate={loadLeads}
          />
        )}
      </div>
    </AdminLayout>
  );
}
