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
  const [teamForm, setTeamForm] = useState({ name: '', code: '' });

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

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
    setTeamForm({ name: '', code: '' });
    setIsTeamModalOpen(true);
  };

  const handleTeamFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTeamForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim()) {
      alert('Team name is required');
      return;
    }
    try {
      await api.post('/crm/team/teams', {
        name: teamForm.name.trim(),
        code: teamForm.code.trim() || undefined,
      });
      setIsTeamModalOpen(false);
      await loadTeams();
    } catch (error) {
      console.error('Failed to create team', error);
      alert('Failed to create team');
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
                        <button
                          onClick={() => openAssignModal(team)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Assign Agent
                        </button>
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
          title="Create New Team"
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
                Create
              </button>
            </>
          }
        >
          <form id="team-form" onSubmit={handleCreateTeam} className="space-y-4">
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
      </div>
    </AdminLayout>
  );
};

export default CrmTeamsAdmin;
