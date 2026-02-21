import { useEffect, useState, useRef, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Pagination from '@/components/admin/Pagination';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';

interface LeadCustomer {
  id: number | string;
  name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  priority?: string;
  status?: string;
  customer_type?: string;
  assigned_to?: number | null;
  assigned_to_name?: string | null;
}

interface PaginatedResponse {
  data: LeadCustomer[];
  total: number;
}

interface User {
  id: number;
  name: string;
  lastName?: string;
  email: string;
}

export default function CrmLeadsPage() {
  const toast = useToast();
  const [leads, setLeads] = useState<LeadCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<number | string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  
  // Filters
  const [priority, setPriority] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [customerType, setCustomerType] = useState<string>('');
  const [purchaseStage, setPurchaseStage] = useState<string>('');
  const [assignmentStatus, setAssignmentStatus] = useState<string>('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Order Details Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Convert Modal
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertLeadId, setConvertLeadId] = useState<number | string | null>(null);
  const [convertCustomerType, setConvertCustomerType] = useState<string>('');

  // Assignment Panel
  const [selectedLeads, setSelectedLeads] = useState<Set<number | string>>(new Set());
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  
  // Agent autocomplete for assignment
  const [allAgents, setAllAgents] = useState<User[]>([]);
  const [agentSearchTerm, setAgentSearchTerm] = useState('');
  const [agentSuggestions, setAgentSuggestions] = useState<User[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const agentInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, priority, status, customerType, purchaseStage, assignmentStatus, selectedAgentFilter, pageSize]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        loadLeads();
      } else {
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Close agent dropdown when clicking outside
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
      setAgentSuggestions(allAgents);
      return;
    }
    try {
      const res = await apiClient.get('/crm/team/agents/search', { params: { q: term } });
      setAgentSuggestions(Array.isArray((res as any)?.data) ? (res as any).data : []);
    } catch {
      setAgentSuggestions([]);
    }
  }, [allAgents]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showAgentDropdown) {
        searchAgents(agentSearchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [agentSearchTerm, showAgentDropdown, searchAgents]);

  const loadAgents = async () => {
    try {
      const res = await apiClient.get('/crm/team/available-agents');
      setAllAgents(Array.isArray((res as any)?.data) ? (res as any).data : []);
    } catch {
      setAllAgents([]);
    }
  };

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: pageSize };
      if (priority) params.priority = priority;
      if (status) params.status = status;
      if (customerType) params.customerType = customerType;
      if (purchaseStage) params.purchaseStage = purchaseStage;
      if (assignmentStatus) params.assignmentStatus = assignmentStatus;
      if (selectedAgentFilter) params.assignedTo = selectedAgentFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await apiClient.get<PaginatedResponse>('/crm/team/leads', { params });
      setLeads(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (error) {
      console.error('Failed to load leads', error);
      setLeads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatName = (lead: LeadCustomer) => {
    if (lead.name) return lead.name;
    const full = [lead.name, lead.last_name].filter(Boolean).join(' ');
    return full || 'N/A';
  };

  const openConvertModal = (customerId: number | string) => {
    setConvertLeadId(customerId);
    setConvertCustomerType('');
    setShowConvertModal(true);
  };

  const handleConvert = async () => {
    if (!convertLeadId) return;

    try {
      setConvertingId(convertLeadId);
      await apiClient.post(`/crm/team/leads/${convertLeadId}/convert`, {
        customerType: convertCustomerType || undefined
      });
      toast.success('Lead converted successfully');
      setShowConvertModal(false);
      setConvertLeadId(null);
      setConvertCustomerType('');
      await loadLeads();
    } catch (error) {
      console.error('Failed to convert lead', error);
      toast.error('Failed to convert lead');
    } finally {
      setConvertingId(null);
    }
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

  // Lead selection for bulk assignment
  const toggleLeadSelection = (leadId: number | string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const selectAllLeads = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
  };

  // Bulk assign leads
  const handleBulkAssign = async () => {
    if (!selectedAgent || selectedLeads.size === 0) return;

    try {
      const customerIds = Array.from(selectedLeads);
      await apiClient.post('/crm/team/leads/bulk-assign', {
        customerIds,
        agentId: selectedAgent.id
      });
      toast.success(`${customerIds.length} lead(s) assigned successfully`);
      setSelectedLeads(new Set());
      setSelectedAgent(null);
      setAgentSearchTerm('');
      setShowAssignPanel(false);
      await loadLeads();
    } catch (error) {
      console.error('Failed to bulk assign leads', error);
      toast.error('Failed to assign leads');
    }
  };

  const clearFilters = () => {
    setPriority('');
    setStatus('');
    setCustomerType('');
    setPurchaseStage('');
    setAssignmentStatus('');
    setSelectedAgentFilter('');
    setSearchTerm('');
    setPage(1);
  };

  const getCustomerTypeColor = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case 'vip': return 'bg-purple-100 text-purple-800';
      case 'platinum': return 'bg-gray-100 text-gray-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'silver': return 'bg-gray-200 text-gray-600';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">CRM Leads</h1>
          <div className="flex gap-2">
            {selectedLeads.size > 0 && (
              <button
                onClick={() => setShowAssignPanel(!showAssignPanel)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                🎯 Assign Selected ({selectedLeads.size})
              </button>
            )}
            <button
              onClick={clearFilters}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Search */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Search</label>
              <input
                type="text"
                placeholder="Name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
            
            {/* Agent Filter */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Agent</label>
              <select
                className="w-full border rounded-lg px-3 py-1.5 text-sm"
                value={selectedAgentFilter}
                onChange={(e) => {
                  setPage(1);
                  setSelectedAgentFilter(e.target.value);
                }}
              >
                <option value="">All Agents</option>
                {allAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} {agent.lastName || ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment Status */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Assignment</label>
              <select
                className="w-full border rounded-lg px-3 py-1.5 text-sm"
                value={assignmentStatus}
                onChange={(e) => {
                  setPage(1);
                  setAssignmentStatus(e.target.value);
                }}
              >
                <option value="">All</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Priority</label>
              <select
                className="w-full border rounded-lg px-3 py-1.5 text-sm"
                value={priority}
                onChange={(e) => {
                  setPage(1);
                  setPriority(e.target.value);
                }}
              >
                <option value="">All Priorities</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Sleep/Dead</option>
              </select>
            </div>

            {/* Customer Type Filter (VIP, Platinum, etc.) */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Customer Type</label>
              <select
                className="w-full border rounded-lg px-3 py-1.5 text-sm"
                value={customerType}
                onChange={(e) => {
                  setPage(1);
                  setCustomerType(e.target.value);
                }}
              >
                <option value="">All Types</option>
                <option value="vip">VIP</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="new">New</option>
                <option value="repeat">Repeat</option>
              </select>
            </div>

            {/* Purchase Stage Filter (Repeat 2, Repeat 3, etc.) */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Purchase Stage</label>
              <select
                className="w-full border rounded-lg px-3 py-1.5 text-sm"
                value={purchaseStage}
                onChange={(e) => {
                  setPage(1);
                  setPurchaseStage(e.target.value);
                }}
              >
                <option value="">All Stages</option>
                <option value="new">New (0-1 orders)</option>
                <option value="repeat_2">Repeat 2</option>
                <option value="repeat_3">Repeat 3</option>
                <option value="regular">Regular (4-7 orders)</option>
                <option value="permanent">Permanent (8+ orders)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Status</label>
              <select
                className="w-full border rounded-lg px-3 py-1.5 text-sm"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assignment Panel */}
        {showAssignPanel && selectedLeads.size > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-green-700">
                Assign {selectedLeads.size} selected lead(s) to:
              </span>
              
              <div className="relative flex-1 max-w-xs" ref={dropdownRef}>
                <input
                  ref={agentInputRef}
                  type="text"
                  value={selectedAgent ? `${selectedAgent.name} ${selectedAgent.lastName || ''}` : agentSearchTerm}
                  onChange={(e) => {
                    setAgentSearchTerm(e.target.value);
                    setSelectedAgent(null);
                    setShowAgentDropdown(true);
                  }}
                  onFocus={() => {
                    setShowAgentDropdown(true);
                    if (!agentSearchTerm) {
                      setAgentSuggestions(allAgents);
                    }
                  }}
                  placeholder="Search agent..."
                  className="w-full border rounded-lg px-3 py-2 pr-8 text-sm"
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
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-green-50 flex items-center justify-between border-b last:border-b-0"
                        >
                          <div>
                            <div className="font-medium text-gray-800 text-sm">
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

              <button
                onClick={handleBulkAssign}
                disabled={!selectedAgent}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Assign Now
              </button>
              
              <button
                onClick={() => {
                  setShowAssignPanel(false);
                  setSelectedLeads(new Set());
                }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Team Leads</h2>
            <PageSizeSelector
              value={pageSize}
              onChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
          {loading ? (
            <div className="text-center text-gray-500">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="text-center text-gray-500">No leads found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.size === leads.length && leads.length > 0}
                        onChange={selectAllLeads}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Assigned To</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((lead) => (
                    <tr key={lead.id} className={`hover:bg-gray-50 ${selectedLeads.has(lead.id) ? 'bg-green-50' : ''}`}>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead.id)}
                          onChange={() => toggleLeadSelection(lead.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-2">#{lead.id}</td>
                      <td className="px-4 py-2">{formatName(lead)}</td>
                      <td className="px-4 py-2">{lead.email || 'N/A'}</td>
                      <td className="px-4 py-2">{lead.phone || 'N/A'}</td>
                      <td className="px-4 py-2 capitalize">{lead.priority || '-'}</td>
                      <td className="px-4 py-2">
                        {lead.customer_type && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCustomerTypeColor(lead.customer_type)}`}>
                            {lead.customer_type.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 capitalize">{lead.status || '-'}</td>
                      <td className="px-4 py-2">{lead.assigned_to_name || (lead.assigned_to ? `Agent #${lead.assigned_to}` : 'Unassigned')}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1 border rounded hover:bg-gray-50 text-sm"
                            onClick={() => handleViewOrder(lead.id)}
                          >
                            View
                          </button>
                          <button
                            className="px-3 py-1 border rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm"
                            disabled={convertingId === lead.id}
                            onClick={() => openConvertModal(lead.id)}
                          >
                            {convertingId === lead.id ? '...' : 'Convert'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 py-4 border-t">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              showInfo={true}
            />
          </div>
        </div>
      </div>

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

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Convert Lead to Customer</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Type (Optional)
              </label>
              <select
                value={convertCustomerType}
                onChange={(e) => setConvertCustomerType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select Type (Auto)</option>
                <option value="vip">VIP</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to keep existing type. Repeat customer status is determined automatically by order count.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConvertModal(false);
                  setConvertLeadId(null);
                  setConvertCustomerType('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={convertingId === convertLeadId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {convertingId === convertLeadId ? 'Converting...' : 'Convert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
