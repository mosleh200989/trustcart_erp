import { useEffect, useState, useCallback, useRef } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

interface Customer {
  id: number | string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  priority?: string;
  status?: string;
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  // Load follow-ups when agent is selected
  useEffect(() => {
    if (selectedAgent) {
      loadFollowups(selectedAgent.id);
    } else {
      setCustomers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent]);

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
      const res = await apiClient.get<PaginatedResponse>(`/crm/team/agent/${agentId}/customers`, {
        params: { page: 1, limit: 50 }
      });
      setCustomers(res.data?.data ?? []);
    } catch (error) {
      console.error('Failed to load follow-ups', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const formatName = (c: Customer) => {
    if (c.name) return c.name;
    const full = [c.name, c.last_name].filter(Boolean).join(' ');
    return full || 'N/A';
  };

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowAgentDropdown(false);
  };

  const clearAgentSelection = () => {
    setSelectedAgent(null);
    setAgentSearchTerm('');
    setAgentSuggestions(agents);
    agentInputRef.current?.focus();
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

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            Assigned Customers
            {selectedAgent && <span className="text-sm font-normal text-gray-500 ml-2">for {selectedAgent.name} {selectedAgent.lastName || ''}</span>}
          </h2>
          {!selectedAgent ? (
            <div className="text-gray-500">Please select an agent to view assigned customers.</div>
          ) : loading ? (
            <div className="text-gray-500">Loading follow-ups...</div>
          ) : customers.length === 0 ? (
            <div className="text-gray-500">No customers assigned to this agent.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Next Follow-up</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">#{c.id}</td>
                      <td className="px-4 py-2">{formatName(c)}</td>
                      <td className="px-4 py-2">{c.email || 'N/A'}</td>
                      <td className="px-4 py-2">{c.phone || 'N/A'}</td>
                      <td className="px-4 py-2 capitalize">{c.priority || '-'}</td>
                      <td className="px-4 py-2 capitalize">{c.status || '-'}</td>
                      <td className="px-4 py-2">{c.next_follow_up ? new Date(c.next_follow_up).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
