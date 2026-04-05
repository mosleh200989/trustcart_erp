import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/services/api';

interface AgentTier {
  id: number;
  name: string;
  phone: string;
  tier: string;
  status: string;
  assignedCustomers: number;
}

const TIERS = [
  { value: 'silver', label: 'Silver', color: 'bg-gray-200 text-gray-800', icon: '🥈' },
  { value: 'gold', label: 'Gold', color: 'bg-yellow-100 text-yellow-800', icon: '🥇' },
  { value: 'platinum', label: 'Platinum', color: 'bg-blue-100 text-blue-800', icon: '💎' },
  { value: 'website_sale', label: 'Website Sale', color: 'bg-green-100 text-green-800', icon: '🌐' },
];

export default function AgentTiersPage() {
  const toast = useToast();
  const [agents, setAgents] = useState<AgentTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ agent: AgentTier; newTier: string } | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/crm/team/agent-tiers');
      setAgents(response.data || []);
    } catch (error) {
      console.error('Failed to load agent tiers:', error);
      toast.error('Failed to load agent tiers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, []);

  const handleTierChange = (agent: AgentTier, newTier: string) => {
    if (newTier === agent.tier) return;
    setConfirmModal({ agent, newTier });
  };

  const confirmTierUpdate = async () => {
    if (!confirmModal) return;
    const { agent, newTier } = confirmModal;
    try {
      setUpdating(agent.id);
      const response = await apiClient.put(`/crm/team/agents/${agent.id}/tier`, { tier: newTier });
      toast.success(response.data?.message || 'Tier updated successfully');
      setConfirmModal(null);
      loadAgents();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update tier');
    } finally {
      setUpdating(null);
    }
  };

  const getTierInfo = (tier: string) => TIERS.find(t => t.value === tier) || TIERS[0];

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🏅</span>
            <h1 className="text-2xl font-bold text-amber-700">Agents Tiers</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Manage agent tiers (Silver, Gold, Platinum). Changing an agent&apos;s tier will unassign all their customers.
          </p>
        </div>

        {/* Tier Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {TIERS.map(tier => {
            const count = agents.filter(a => a.tier === tier.value).length;
            return (
              <div key={tier.value} className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
                <span className="text-3xl">{tier.icon}</span>
                <div>
                  <div className="text-sm text-gray-500">{tier.label} Agents</div>
                  <div className="text-2xl font-bold">{count}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Agents Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Agent</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Phone</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Current Tier</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Assigned Customers</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Change Tier</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No agents found</td>
                </tr>
              ) : (
                agents.map(agent => {
                  const tierInfo = getTierInfo(agent.tier);
                  return (
                    <tr key={agent.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium">{agent.name}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{agent.phone || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${tierInfo.color}`}>
                          {tierInfo.icon} {tierInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${agent.assignedCustomers > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {agent.assignedCustomers}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded ${agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {agent.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {TIERS.filter(t => t.value !== agent.tier).map(t => (
                            <button
                              key={t.value}
                              onClick={() => handleTierChange(agent, t.value)}
                              disabled={updating === agent.id}
                              className={`px-2.5 py-1 rounded text-xs font-medium border transition disabled:opacity-50 ${
                                t.value === 'platinum' ? 'border-blue-300 text-blue-700 hover:bg-blue-50' :
                                t.value === 'gold' ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' :
                                'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {t.icon} {t.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">Confirm Tier Change</h2>
              <div className="mb-4 text-sm text-gray-600">
                <p className="mb-2">
                  You are changing <strong>{confirmModal.agent.name}</strong>&apos;s tier from{' '}
                  <span className="font-semibold">{getTierInfo(confirmModal.agent.tier).label}</span> to{' '}
                  <span className="font-semibold">{getTierInfo(confirmModal.newTier).label}</span>.
                </p>
                {confirmModal.agent.assignedCustomers > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                    <p className="text-red-700 font-medium">
                      ⚠️ {confirmModal.agent.assignedCustomers} customer(s) will be unassigned from this agent.
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      You will need to reassign these customers manually after the tier change.
                    </p>
                  </div>
                )}
                {confirmModal.agent.assignedCustomers === 0 && (
                  <p className="text-gray-500 text-xs mt-1">This agent has no assigned customers.</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTierUpdate}
                  disabled={updating !== null}
                  className="px-4 py-2 rounded text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Confirm Change'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
