import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient, { users as usersApi } from '@/services/api';

interface LeadCustomer {
  id: number | string;
  name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  priority?: string;
  assigned_to?: number | null;
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
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<LeadCustomer[]>([]);

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadCustomer | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [teamsRes, usersRes] = await Promise.all([
        apiClient.get('/crm/team/teams'),
        usersApi.list(),
      ]);

      const teamsData: Team[] = Array.isArray((teamsRes as any)?.data) ? (teamsRes as any).data : [];
      setTeams(teamsData);
      setUsers(Array.isArray(usersRes) ? (usersRes as any) : []);

      if (!selectedTeamId && teamsData.length) {
        setSelectedTeamId(Number(teamsData[0].id));
      }

      await loadUnassignedLeads();
    } catch (error) {
      console.error('Failed to load lead assignment data', error);
      setTeams([]);
      setUsers([]);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUnassignedLeads = async () => {
    try {
      const res = await apiClient.get<PaginatedResponse>('/crm/team/leads', {
        params: { page: 1, limit: 100 },
      });
      const all = Array.isArray((res as any)?.data?.data) ? (res as any).data.data : [];
      setLeads(all);
    } catch (error) {
      console.error('Failed to load unassigned leads', error);
      setLeads([]);
    }
  };

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

  const openAssignModal = (lead: LeadCustomer) => {
    setSelectedLead(lead);
    const first = teamAgents[0];
    setSelectedAgentId(first ? Number(first.id) : null);
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedLead || !selectedAgentId) return;

    try {
      await apiClient.post(`/crm/team/leads/${selectedLead.id}/assign`, {
        agentId: Number(selectedAgentId),
      });

      alert('Lead assigned successfully');
      setShowAssignModal(false);
      setSelectedLead(null);
      setSelectedAgentId(null);
      await loadUnassignedLeads();
    } catch (error) {
      console.error('Failed to assign lead', error);
      alert('Failed to assign lead');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Lead Assignment</h1>
            <p className="text-gray-600">Assign new leads to agents in your CRM teams</p>
          </div>
          <button
            onClick={loadUnassignedLeads}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Refresh Leads
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={selectedTeamId ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setSelectedTeamId(val);
              }}
            >
              {teams.length === 0 ? (
                <option value="">No teams found</option>
              ) : (
                teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.code ? ` (${t.code})` : ''}
                  </option>
                ))
              )}
            </select>
            {teams.length === 0 && (
              <div className="text-xs text-gray-500 mt-2">
                Create teams in{' '}
                <Link className="text-blue-600 hover:underline" href="/admin/crm/teams">
                  CRM Teams
                </Link>
                .
              </div>
            )}
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Agents in selected team</label>
            <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700">
              {selectedTeamId ? `${teamAgents.length} agent(s)` : 'Select a team'}
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Unassigned leads: <span className="font-semibold">{leads.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Unassigned Leads</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-600">Loading...</div>
          ) : leads.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No unassigned leads</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={String(lead.id)} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{formatLeadName(lead)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{lead.email || 'No email'}</div>
                        <div className="text-xs text-gray-500">{lead.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                          {lead.priority || 'new'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openAssignModal(lead)}
                          disabled={!selectedTeamId || teamAgents.length === 0}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showAssignModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full">
              <h3 className="text-2xl font-bold mb-4">Assign Lead</h3>

              <div className="mb-4 p-4 bg-gray-50 rounded">
                <div className="font-semibold">{formatLeadName(selectedLead)}</div>
                <div className="text-sm text-gray-600">{selectedLead.email || 'No email'} | {selectedLead.phone || 'No phone'}</div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Agent</label>
                <select
                  value={selectedAgentId ?? ''}
                  onChange={(e) => setSelectedAgentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border rounded-lg p-2"
                >
                  {teamAgents.length === 0 ? (
                    <option value="">No agents in selected team</option>
                  ) : (
                    teamAgents.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.lastName} (ID: {u.id})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedLead(null);
                    setSelectedAgentId(null);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedAgentId}
                  className={`px-6 py-2 rounded-lg text-white ${
                    selectedAgentId ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Assign Lead
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
