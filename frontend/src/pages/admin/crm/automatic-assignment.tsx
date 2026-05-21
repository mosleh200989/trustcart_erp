import { useEffect, useState } from 'react';
import { FaCircle, FaPlay, FaSyncAlt, FaUserCheck } from 'react-icons/fa';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

type AgentRow = {
  id: number;
  name: string;
  email: string;
  presenceState: 'online' | 'offline' | string;
  activeAssignedOrders: number;
  assignedToday: number;
  productPreferenceId?: number | null;
  productPreferenceName?: string | null;
  assignmentOrderDirection?: 'asc' | 'desc' | string;
};

type Overview = {
  teamLeaderId: number;
  settings: {
    isEnabled: boolean;
    maxActiveOrders: number;
    maxDailyOrders: number;
    teamLeaderName: string | null;
  };
  agents: AgentRow[];
  recentAssignments: Array<{
    id: number;
    order_id: number;
    agent_id: number;
    agent_name: string | null;
    reason: string;
    created_at: string;
  }>;
  pendingUnassignedOrders?: number;
  assignmentRun?: {
    assignedCount: number;
    checkedOrders: number;
    eligibleAgents: number;
  };
};

type TeamLeaderOption = {
  id: number;
  name: string;
  email: string;
};

type ProductOption = {
  id: number;
  name: string;
  sku?: string | null;
};

function formatDateTime(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AutomaticAssignmentPage() {
  const toast = useToast();
  const { hasPermission, user } = useAuth();
  const canManage = hasPermission('manage-auto-order-assignment');
  const canChooseTeamLeader = ['super-admin', 'admin', 'sales-manager'].includes(String(user?.roleSlug || '').toLowerCase());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeaderOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [maxActiveOrders, setMaxActiveOrders] = useState(10);
  const [maxDailyOrders, setMaxDailyOrders] = useState(100);
  const [agentPreferences, setAgentPreferences] = useState<Record<number, string>>({});
  const [agentOrderDirections, setAgentOrderDirections] = useState<Record<number, 'asc' | 'desc'>>({});

  const loadOverview = async () => {
    setLoading(true);
    try {
      const params = selectedTeamLeaderId ? { teamLeaderId: selectedTeamLeaderId } : undefined;
      const res = await apiClient.get('/sales/automatic-assignment/overview', { params });
      const data = res.data as Overview;
      setOverview(data);
      setSelectedTeamLeaderId(String(data.teamLeaderId || selectedTeamLeaderId || ''));
      setIsEnabled(Boolean(data.settings?.isEnabled));
      setMaxActiveOrders(Number(data.settings?.maxActiveOrders || 10));
      setMaxDailyOrders(Number(data.settings?.maxDailyOrders || 100));
      const nextPreferences: Record<number, string> = {};
      const nextDirections: Record<number, 'asc' | 'desc'> = {};
      for (const agent of data.agents || []) {
        nextPreferences[agent.id] = agent.productPreferenceId ? String(agent.productPreferenceId) : '';
        nextDirections[agent.id] = agent.assignmentOrderDirection === 'desc' ? 'desc' : 'asc';
      }
      setAgentPreferences(nextPreferences);
      setAgentOrderDirections(nextDirections);
      if (data.assignmentRun?.assignedCount) {
        toast.success(`${data.assignmentRun.assignedCount} orders assigned automatically`);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load automatic assignment');
    } finally {
      setLoading(false);
    }
  };

  const runAssignmentNow = async () => {
    setRunning(true);
    try {
      const res = await apiClient.post('/sales/automatic-assignment/run', {
        teamLeaderId: selectedTeamLeaderId ? Number(selectedTeamLeaderId) : undefined,
      });
      const data = res.data as Overview;
      setOverview(data);
      setIsEnabled(Boolean(data.settings?.isEnabled));
      setMaxActiveOrders(Number(data.settings?.maxActiveOrders || 10));
      setMaxDailyOrders(Number(data.settings?.maxDailyOrders || 100));
      const nextPreferences: Record<number, string> = {};
      const nextDirections: Record<number, 'asc' | 'desc'> = {};
      for (const agent of data.agents || []) {
        nextPreferences[agent.id] = agent.productPreferenceId ? String(agent.productPreferenceId) : '';
        nextDirections[agent.id] = agent.assignmentOrderDirection === 'desc' ? 'desc' : 'asc';
      }
      setAgentPreferences(nextPreferences);
      setAgentOrderDirections(nextDirections);
      toast.success(`${data.assignmentRun?.assignedCount || 0} orders assigned`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to run automatic assignment');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    const loadTeamLeaders = async () => {
      try {
        const response = await apiClient.get('/sales/automatic-assignment/team-leaders');
        const rows = Array.isArray(response.data) ? response.data : [];
        setTeamLeaders(rows);
        if (!selectedTeamLeaderId && rows.length > 0) {
          setSelectedTeamLeaderId(String(rows[0].id));
        }
      } catch {
        setTeamLeaders([]);
      }
    };

    loadTeamLeaders();
    apiClient.get('/sales/automatic-assignment/products')
      .then((response) => setProducts(Array.isArray(response.data) ? response.data : []))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    loadOverview();
  }, [selectedTeamLeaderId]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put('/sales/automatic-assignment/settings', {
        teamLeaderId: selectedTeamLeaderId ? Number(selectedTeamLeaderId) : undefined,
        isEnabled,
        maxActiveOrders,
        maxDailyOrders,
        agentPreferences: (overview?.agents || []).map((agent) => ({
          agentId: agent.id,
          productId: agentPreferences[agent.id] ? Number(agentPreferences[agent.id]) : null,
          assignmentOrderDirection: agentOrderDirections[agent.id] || 'asc',
        })),
      });
      const data = res.data as Overview;
      setOverview(data);
      setIsEnabled(Boolean(data.settings?.isEnabled));
      setMaxActiveOrders(Number(data.settings?.maxActiveOrders || 10));
      setMaxDailyOrders(Number(data.settings?.maxDailyOrders || 100));
      toast.success('Automatic assignment settings saved');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const onlineAgents = overview?.agents.filter((agent) => agent.presenceState === 'online').length || 0;
  const totalActive = overview?.agents.reduce((sum, agent) => sum + agent.activeAssignedOrders, 0) || 0;
  const assignedToday = overview?.agents.reduce((sum, agent) => sum + agent.assignedToday, 0) || 0;

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <FaUserCheck className="text-blue-600" />
              Automatic Assignment
            </h1>
            <p className="text-sm text-gray-500">Automatically route new website and landing page orders to online agents in your team.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <button
                onClick={runAssignmentNow}
                disabled={running}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <FaPlay /> {running ? 'Running...' : 'Run Now'}
              </button>
            )}
            <button
              onClick={loadOverview}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <FaSyncAlt /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-500">Mode</div>
            <div className={`mt-1 text-2xl font-bold ${isEnabled ? 'text-emerald-700' : 'text-gray-700'}`}>{isEnabled ? 'Enabled' : 'Disabled'}</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-500">Online Agents</div>
            <div className="mt-1 text-2xl font-bold text-green-700">{onlineAgents}</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-500">Active Assigned Orders</div>
            <div className="mt-1 text-2xl font-bold text-blue-700">{totalActive}</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-500">Assigned Today</div>
            <div className="mt-1 text-2xl font-bold text-purple-700">{assignedToday}</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-500">Pending Queue</div>
            <div className="mt-1 text-2xl font-bold text-amber-700">{overview?.pendingUnassignedOrders || 0}</div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-500">
              New processing orders from landing pages or website are assigned only to online sales executives whose active queue is below the limit.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {canChooseTeamLeader && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Team Leader</label>
                <select
                  value={selectedTeamLeaderId}
                  onChange={(e) => setSelectedTeamLeaderId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  {teamLeaders.map((teamLeader) => (
                    <option key={teamLeader.id} value={teamLeader.id}>
                      {teamLeader.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <label className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                disabled={!canManage}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-gray-800">Enable automatic assignment</span>
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Max active orders per agent</label>
              <input
                type="number"
                min={1}
                max={500}
                value={maxActiveOrders}
                onChange={(e) => setMaxActiveOrders(Math.max(1, Number(e.target.value || 1)))}
                disabled={!canManage}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Max daily orders per agent</label>
              <input
                type="number"
                min={1}
                max={5000}
                value={maxDailyOrders}
                onChange={(e) => setMaxDailyOrders(Math.max(1, Number(e.target.value || 1)))}
                disabled={!canManage}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={saveSettings}
                disabled={!canManage || saving}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold text-gray-900">Agent Capacity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Presence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Product Preference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Time Order</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Active Assigned</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Assigned Today</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(overview?.agents || []).map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${agent.presenceState === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        <FaCircle size={8} />
                        {agent.presenceState === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={agentPreferences[agent.id] || ''}
                        onChange={(e) => setAgentPreferences((prev) => ({ ...prev, [agent.id]: e.target.value }))}
                        disabled={!canManage}
                        className="min-w-[220px] rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100"
                      >
                        <option value="">Any product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}{product.sku ? ` (${product.sku})` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={agentOrderDirections[agent.id] || 'asc'}
                        onChange={(e) => setAgentOrderDirections((prev) => ({ ...prev, [agent.id]: e.target.value === 'desc' ? 'desc' : 'asc' }))}
                        disabled={!canManage}
                        className="min-w-[150px] rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100"
                      >
                        <option value="asc">Oldest first</option>
                        <option value="desc">Newest first</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">{agent.activeAssignedOrders}</td>
                    <td className="px-4 py-3 text-right text-sm">{agent.assignedToday}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div>{Math.max(0, maxActiveOrders - agent.activeAssignedOrders)} active</div>
                      <div className="text-xs text-gray-500">{Math.max(0, maxDailyOrders - agent.assignedToday)} today</div>
                    </td>
                  </tr>
                ))}
                {!loading && (overview?.agents || []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No active sales executives found for this team.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Automatic Assignments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(overview?.recentAssignments || []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">#{item.order_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.agent_name || `Agent #${item.agent_id}`}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(item.created_at)}</td>
                  </tr>
                ))}
                {!loading && (overview?.recentAssignments || []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No automatic assignments yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
