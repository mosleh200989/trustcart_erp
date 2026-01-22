import React, { useEffect, useState } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api, { users as usersApi } from '../../../services/api';
import Modal from '../../../components/admin/Modal';
import FormInput from '../../../components/admin/FormInput';

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

const CrmTeamsAdmin: React.FC = () => {
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

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadRoles(), loadTeams(), loadAgents()]);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await api.get('/rbac/roles');
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load roles', error);
      setRoles([]);
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

  const loadAgents = async () => {
    try {
      const data = await usersApi.list();
      const salesExecRole = roles.find((r: any) => r.slug === 'sales-executive');
      const salesExecRoleId = salesExecRole ? salesExecRole.id : null;
      const filtered = salesExecRoleId
        ? data.filter((u: any) => u.roleId === salesExecRoleId)
        : data;
      setAgents(filtered);
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
      alert('Team name is required');
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
          alert('No team selected');
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
      alert('Failed to save team');
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
      alert('Failed to delete team');
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
      alert('Please select an agent');
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
      alert('Failed to assign agent');
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
      </div>
    </AdminLayout>
  );
};

export default CrmTeamsAdmin;
