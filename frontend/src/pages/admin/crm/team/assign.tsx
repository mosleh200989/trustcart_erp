import { useEffect, useState, useRef, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

interface LeadCustomer {
  id: number | string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  priority?: string;
  assigned_to?: number | null;
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

export default function CrmAssignLeadsPage() {
  const [leads, setLeads] = useState<LeadCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadCustomer | null>(null);

  // Agent autocomplete
  const [agentSearchTerm, setAgentSearchTerm] = useState('');
  const [agentSuggestions, setAgentSuggestions] = useState<User[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [allAgents, setAllAgents] = useState<User[]>([]);
  const agentInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUnassignedLeads();
    loadAgents();
  }, []);

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

  const loadUnassignedLeads = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PaginatedResponse>('/crm/team/leads', {
        params: { page: 1, limit: 50, assignmentStatus: 'unassigned' }
      });
      const all = (res as any).data?.data ?? [];
      setLeads(all);
    } catch (error) {
      console.error('Failed to load leads', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const res = await apiClient.get('/crm/team/available-agents');
      setAllAgents(Array.isArray((res as any)?.data) ? (res as any).data : []);
    } catch {
      setAllAgents([]);
    }
  };

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

  const formatName = (lead: LeadCustomer) => {
    const full = [lead.name, lead.last_name].filter(Boolean).join(' ');
    return full || 'N/A';
  };

  const handleAssign = async () => {
    if (!selectedLead || !selectedAgent) return;
    try {
      await apiClient.post(`/crm/team/leads/${selectedLead.id}/assign`, {
        agentId: Number(selectedAgent.id)
      });
      alert('Lead assigned successfully');
      setSelectedAgent(null);
      setAgentSearchTerm('');
      setSelectedLead(null);
      loadUnassignedLeads();
    } catch (error) {
      console.error('Failed to assign lead', error);
      alert('Failed to assign lead');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Assign Leads to Agents</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Unassigned Leads ({leads.length})</h2>
            {loading ? (
              <div className="text-gray-500">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="text-gray-500">All leads are assigned.</div>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex justify-between items-center ${
                      selectedLead?.id === lead.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div>
                      <div className="font-medium text-gray-800">{formatName(lead)}</div>
                      <div className="text-xs text-gray-500">{lead.email || 'No email'} • {lead.phone || 'No phone'}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                      {lead.priority || 'new'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Assignment Details</h2>
            {selectedLead ? (
              <>
                <p className="mb-4 text-sm text-gray-700">
                  Lead: <span className="font-semibold">{formatName(selectedLead)}</span>
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Agent (Sales Executive)</label>
                <div className="relative mb-4" ref={dropdownRef}>
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
                        setAgentSuggestions(allAgents);
                      }
                    }}
                    placeholder="Type agent name or ID..."
                    className="w-full border rounded-lg px-3 py-2 pr-8"
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
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between border-b last:border-b-0"
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
                <p className="text-xs text-gray-500 mb-3">Type to search by name or ID</p>

                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAssign}
                  disabled={!selectedAgent}
                >
                  Assign Lead
                </button>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Select a lead from the left to assign.</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
