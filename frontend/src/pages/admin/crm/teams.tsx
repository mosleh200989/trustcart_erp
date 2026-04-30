import React, { useEffect, useState } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api, { users as usersApi } from '../../../services/api';
import Modal from '../../../components/admin/Modal';
import FormInput from '../../../components/admin/FormInput';
import { useToast } from '@/contexts/ToastContext';

interface Team {
  id: number;
  name: string;
  code?: string;
  memberCount: number;
}

interface User {
  id: number;
  name: string;
  lastName: string;
  email: string;
  roleId?: number;
  teamId?: number | null;
}

interface AgentFull {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  teamLeaderId: number | null;
  teamLeaderName: string | null;
  teamId: number | null;
  teamName: string | null;
}

interface TeamLeaderOption {
  id: number;
  name: string;
  lastName?: string;
  email: string;
}

const CrmTeamsAdmin: React.FC = () => {
  const toast = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamModalMode, setTeamModalMode] = useState<'create' | 'edit'>('create');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({ name: '', code: '' });

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [membersTeam, setMembersTeam] = useState<Team | null>(null);

  // All-agents management
  const [allAgents, setAllAgents] = useState<AgentFull[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeaderOption[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // Transfer modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferAgent, setTransferAgent] = useState<AgentFull | null>(null);
  const [transferToTlId, setTransferToTlId] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Remove confirmation
  const [removeAgent, setRemoveAgent] = useState<AgentFull | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadRoles(), loadTeams(), loadAgents(), loadAllAgents(), loadTeamLeaders()]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllAgents = async () => {
    try {
      setAgentsLoading(true);
      const res = await api.get('/crm/team/all-agents');
      setAllAgents(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAllAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  };

  const loadTeamLeaders = async () => {
    try {
      const res = await api.get('/crm/team/team-leaders');
      setTeamLeaders(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTeamLeaders([]);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await api.get('/rbac/roles');
      const rolesData = Array.isArray(res.data) ? res.data : [];
      setRoles(rolesData);
      return rolesData;
    } catch (error) {
      console.error('Failed to load roles', error);
      setRoles([]);
      return [];
    }
  };

  const loadTeams = async () => {
    try {
      const res = await api.get('/crm/team/teams');
      setTeams(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load teams', error);
      setTeams([]);
    }
  };

  const loadAgents = async (rolesData?: any[]) => {
    try {
      // Use the CRM endpoint that Team Leaders have access to
      const res = await api.get('/crm/team/available-agents');
      const data = Array.isArray(res.data) ? res.data : [];
      setAgents(data);
    } catch (error) {
      console.error('Failed to load agents', error);
      setAgents([]);
    }
  };

  const openTeamModal = () => {
    setTeamModalMode('create');
    setEditingTeam(null);
    setTeamForm({ name: '', code: '' });
    setIsTeamModalOpen(true);
  };

  const openEditTeamModal = (team: Team) => {
    setTeamModalMode('edit');
    setEditingTeam(team);
    setTeamForm({ name: team.name || '', code: team.code || '' });
    setIsTeamModalOpen(true);
  };

  const handleTeamFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTeamForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim()) {
      toast.warning('Team name is required');
      return;
    }
    try {
      if (teamModalMode === 'create') {
        await api.post('/crm/team/teams', {
          name: teamForm.name.trim(),
          code: teamForm.code.trim() || undefined,
        });
      } else {
        if (!editingTeam) {
          toast.warning('No team selected');
          return;
        }
        await api.put(`/crm/team/teams/${editingTeam.id}`, {
          name: teamForm.name.trim(),
          code: teamForm.code.trim() || null,
        });
      }
      setIsTeamModalOpen(false);
      await Promise.all([loadTeams(), loadAgents()]);
    } catch (error) {
      console.error('Failed to save team', error);
      toast.error('Failed to save team');
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    const ok = window.confirm(`Delete team "${team.name}"? Agents in this team will be unassigned.`);
    if (!ok) return;
    try {
      await api.delete(`/crm/team/teams/${team.id}`);
      await Promise.all([loadTeams(), loadAgents()]);
    } catch (error) {
      console.error('Failed to delete team', error);
      toast.error('Failed to delete team');
    }
  };

  const openAssignModal = (team: Team) => {
    setSelectedTeam(team);
    setSelectedAgentId('');
    setAssignModalOpen(true);
  };

  const handleAssignAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !selectedAgentId) {
      toast.warning('Please select an agent');
      return;
    }
    try {
      await api.post(`/crm/team/teams/${selectedTeam.id}/assign-agent`, {
        agentId: Number(selectedAgentId),
      });
      setAssignModalOpen(false);
      await Promise.all([loadTeams(), loadAgents()]);
    } catch (error) {
      console.error('Failed to assign agent', error);
      toast.error('Failed to assign agent');
    }
  };

  const getMemberCountForTeam = (teamId: number) => {
    return agents.filter((a) => a.teamId === teamId).length;
  };

  const openMembersModal = (team: Team) => {
    setMembersTeam(team);
    setMembersModalOpen(true);
  };

  const membersForSelectedTeam = membersTeam
    ? agents.filter((a) => a.teamId === membersTeam.id)
    : [];

  const openTransferModal = (agent: AgentFull) => {
    setTransferAgent(agent);
    setTransferToTlId('');
    setTransferModalOpen(true);
  };

  const handleTransferAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAgent || !transferToTlId) {
      toast.warning('Please select a target team leader');
      return;
    }
    try {
      setTransferLoading(true);
      await api.post(`/crm/team/agents/${transferAgent.id}/transfer`, {
        newTeamLeaderId: Number(transferToTlId),
      });
      toast.success(`Agent transferred. Their customers remain under the previous team leader.`);
      setTransferModalOpen(false);
      await Promise.all([loadTeams(), loadAgents(), loadAllAgents()]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to transfer agent');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleRemoveAgent = async (agent: AgentFull) => {
    const ok = window.confirm(
      `Remove "${agent.name}" from their current team leader?\n\nAll their customers will be unassigned from this agent but will remain under the team leader.`
    );
    if (!ok) return;
    try {
      setRemoveLoading(true);
      const res = await api.post(`/crm/team/agents/${agent.id}/remove-from-team`);
      toast.success(`Agent removed. ${res.data?.customersUpdated ?? 0} customer(s) unassigned from agent.`);
      await Promise.all([loadTeams(), loadAgents(), loadAllAgents()]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to remove agent');
    } finally {
      setRemoveLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">CRM Teams</h1>
            <p className="text-gray-600 mt-1">Manage telesales teams under your leadership.</p>
          </div>
          <button
            onClick={openTeamModal}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            + Create Team
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Members</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No teams yet. Create your first team.
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{team.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{team.code || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {team.memberCount ?? getMemberCountForTeam(team.id)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openMembersModal(team)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View Members
                          </button>
                          <button
                            onClick={() => openAssignModal(team)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Assign Agent
                          </button>
                          <button
                            onClick={() => openEditTeamModal(team)}
                            className="text-gray-700 hover:text-gray-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Team Modal */}
        <Modal
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          title={teamModalMode === 'create' ? 'Create New Team' : `Edit Team${editingTeam ? `: ${editingTeam.name}` : ''}`}
          size="md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="team-form"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {teamModalMode === 'create' ? 'Create' : 'Save'}
              </button>
            </>
          }
        >
          <form id="team-form" onSubmit={handleSaveTeam} className="space-y-4">
            <FormInput
              label="Team Name"
              name="name"
              value={teamForm.name}
              onChange={handleTeamFormChange}
              required
            />
            <FormInput
              label="Team Code (optional)"
              name="code"
              value={teamForm.code}
              onChange={handleTeamFormChange}
            />
          </form>
        </Modal>

        {/* Assign Agent Modal */}
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title={selectedTeam ? `Assign Agent to ${selectedTeam.name}` : 'Assign Agent'}
          size="md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="assign-form"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Assign
              </button>
            </>
          }
        >
          <form id="assign-form" onSubmit={handleAssignAgent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Agent</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Agent --</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} {agent.lastName} ({agent.email})
                  </option>
                ))}
              </select>
            </div>
          </form>
        </Modal>

        {/* Members Modal */}
        <Modal
          isOpen={membersModalOpen}
          onClose={() => setMembersModalOpen(false)}
          title={membersTeam ? `Members of ${membersTeam.name}` : 'Team Members'}
          size="lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => setMembersModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </>
          }
        >
          {membersTeam && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                {membersForSelectedTeam.length} member(s) in this team.
              </div>

              {membersForSelectedTeam.length === 0 ? (
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded">
                  No members assigned yet.
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {membersForSelectedTeam.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{m.name} {m.lastName}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{m.email}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{m.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* ==================== ALL AGENTS TABLE ==================== */}
        <div className="mt-10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">All Sales Agents</h2>
              <p className="text-gray-500 text-sm mt-1">Remove or transfer agents between team leaders.</p>
            </div>
          </div>

          {agentsLoading ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">Loading agents...</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team Leader</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allAgents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No sales agents found.
                      </td>
                    </tr>
                  ) : (
                    allAgents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{agent.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{agent.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {agent.teamLeaderName ?? <span className="text-gray-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {agent.teamName ?? <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => openTransferModal(agent)}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              Transfer
                            </button>
                            {agent.teamLeaderId && (
                              <button
                                onClick={() => handleRemoveAgent(agent)}
                                disabled={removeLoading}
                                className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50"
                              >
                                Remove from TL
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transfer Agent Modal */}
        <Modal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          title={transferAgent ? `Transfer Agent: ${transferAgent.name}` : 'Transfer Agent'}
          size="md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="transfer-form"
                disabled={transferLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {transferLoading ? 'Transferring...' : 'Transfer'}
              </button>
            </>
          }
        >
          <form id="transfer-form" onSubmit={handleTransferAgent} className="space-y-4">
            {transferAgent && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                <p><span className="font-medium">Agent:</span> {transferAgent.name}</p>
                <p><span className="font-medium">Current TL:</span> {transferAgent.teamLeaderName ?? <em>None</em>}</p>
                <p className="mt-2 text-amber-700 text-xs">All customers currently assigned to this agent will be unassigned from the agent and remain under the previous team leader.</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select New Team Leader</label>
              <select
                value={transferToTlId}
                onChange={(e) => setTransferToTlId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Select Team Leader --</option>
                {teamLeaders
                  .filter((tl) => tl.id !== transferAgent?.teamLeaderId)
                  .map((tl) => (
                    <option key={tl.id} value={tl.id}>
                      {tl.name} {tl.lastName ?? ''} ({tl.email})
                    </option>
                  ))}
              </select>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default CrmTeamsAdmin;
