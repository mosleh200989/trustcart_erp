import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FaChartLine,
  FaClipboardList,
  FaDownload,
  FaRedo,
  FaUsers,
  FaUserCheck,
} from 'react-icons/fa';
import AdminLayout from '@/layouts/AdminLayout';
import AdminDateInput from '@/components/admin/AdminDateInput';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getDhakaDateString } from '@/utils/dhakaDate';

type WorkType = 'primary_leads' | 'unreachable_followup' | 'incomplete_recovery' | 'rejected_recovery';

const WORK_TYPE_META: Record<WorkType, { label: string; tone: string }> = {
  primary_leads: { label: 'Primary Leads', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  unreachable_followup: { label: 'Unreachable Follow-up', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  incomplete_recovery: { label: 'Incomplete Recovery', tone: 'bg-purple-50 text-purple-700 border-purple-200' },
  rejected_recovery: { label: 'Rejected Recovery', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
};

type TeamLeaderOption = { id: number; name: string; email: string };

type TeamReport = {
  teamLeaderId: number;
  from: string;
  to: string;
  settings: { isEnabled: boolean; teamLeaderName: string | null };
  summary: {
    teams: number;
    agents: number;
    onlineAgents: number;
    activeOrders: number;
    assignedInRange: number;
    pendingQueue: number;
    unreachableOutcomes: number;
  };
  queueSummary: Array<{ workType: WorkType; count: number }>;
  teams: Array<{
    id: number;
    name: string;
    code?: string | null;
    workTypes: WorkType[];
    agentCount: number;
    onlineAgents: number;
    activeOrders: number;
    activeSalesOrders: number;
    activeIncompleteOrders: number;
    assignedInRange: number;
    salesAssignedInRange: number;
    incompleteAssignedInRange: number;
    unreachableOutcomes: number;
    positiveOutcomes: number;
  }>;
  agents: Array<{
    id: number;
    name: string;
    email: string;
    teamName: string;
    teamCode?: string | null;
    presenceState: string;
    activeOrders: number;
    assignedInRange: number;
    callsLogged: number;
    positiveOutcomes: number;
    unreachableOutcomes: number;
  }>;
  recentAssignments: Array<{
    id: number;
    order_id?: number | null;
    incomplete_order_id?: number | null;
    record_type?: string | null;
    agent_name?: string | null;
    reason: string;
    created_at: string;
  }>;
};

const numberFormat = new Intl.NumberFormat('en-US');

function formatNumber(value: number | undefined) {
  return numberFormat.format(Number(value || 0));
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function workTypeLabel(workType: string) {
  return WORK_TYPE_META[workType as WorkType]?.label || workType.replace(/_/g, ' ');
}

export default function TeamDataCollectionPage() {
  const toast = useToast();
  const { user } = useAuth();
  const canChooseTeamLeader = ['super-admin', 'admin', 'sales-manager'].includes(String(user?.roleSlug || '').toLowerCase());
  const today = getDhakaDateString();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [teamLeaders, setTeamLeaders] = useState<TeamLeaderOption[]>([]);
  const [report, setReport] = useState<TeamReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTeamLeaders = async () => {
    if (!canChooseTeamLeader) return;
    try {
      const response = await apiClient.get('/sales/automatic-assignment/team-leaders');
      const rows = Array.isArray(response.data) ? response.data : [];
      setTeamLeaders(rows);
      if (!teamLeaderId && rows.length > 0) setTeamLeaderId(String(rows[0].id));
    } catch {
      setTeamLeaders([]);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { from, to };
      if (teamLeaderId) params.teamLeaderId = teamLeaderId;
      const response = await apiClient.get('/sales/automatic-assignment/team-report', { params });
      setReport(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load team report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamLeaders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canChooseTeamLeader]);

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, teamLeaderId]);

  const topTeams = useMemo(() => {
    return [...(report?.teams || [])].sort((a, b) => b.assignedInRange - a.assignedInRange).slice(0, 3);
  }, [report?.teams]);

  const exportCsv = () => {
    if (!report) return;
    const header = ['Team', 'Code', 'Work Types', 'Agents', 'Online', 'Active Orders', 'Assigned', 'Positive', 'Unreachable'];
    const rows = report.teams.map((team) => [
      team.name,
      team.code || '',
      team.workTypes.map(workTypeLabel).join(' + '),
      team.agentCount,
      team.onlineAgents,
      team.activeOrders,
      team.assignedInRange,
      team.positiveOutcomes,
      team.unreachableOutcomes,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `team-report-${report.from}-to-${report.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
              <FaChartLine className="text-blue-600" />
              Team Performance Report
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              All-in-one queue, team, and agent performance for Team A, Team B, Team C and future teams.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {canChooseTeamLeader && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Team Leader</label>
                <select value={teamLeaderId} onChange={(e) => setTeamLeaderId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                  {teamLeaders.map((teamLeader) => (
                    <option key={teamLeader.id} value={teamLeader.id}>{teamLeader.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-gray-500">From</label>
              <AdminDateInput value={from} onValueChange={setFrom} className="rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-gray-500">To</label>
              <AdminDateInput value={to} onValueChange={setTo} className="rounded-lg border px-3 py-2 text-sm" />
            </div>
            <button onClick={loadReport} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              <FaRedo /> Refresh
            </button>
            <button onClick={exportCsv} disabled={!report} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <FaDownload /> Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            ['Teams', report?.summary.teams, 'text-blue-700'],
            ['Agents', report?.summary.agents, 'text-gray-900'],
            ['Online Agents', report?.summary.onlineAgents, 'text-emerald-700'],
            ['Active Orders', report?.summary.activeOrders, 'text-indigo-700'],
            ['Assigned in Range', report?.summary.assignedInRange, 'text-purple-700'],
            ['Pending Queue', report?.summary.pendingQueue, 'text-amber-700'],
          ].map(([label, value, color]) => (
            <div key={String(label)} className="rounded-lg bg-white p-4 shadow">
              <div className="text-sm text-gray-500">{label}</div>
              <div className={`mt-1 text-2xl font-bold ${color}`}>{formatNumber(Number(value || 0))}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {(report?.queueSummary || []).map((queue) => {
            const meta = WORK_TYPE_META[queue.workType];
            return (
              <div key={queue.workType} className={`rounded-lg border p-4 ${meta?.tone || 'bg-white text-gray-700 border-gray-200'}`}>
                <div className="text-sm font-semibold">{meta?.label || queue.workType}</div>
                <div className="mt-2 text-3xl font-bold">{formatNumber(queue.count)}</div>
                <div className="mt-1 text-xs opacity-80">unassigned queue size</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-lg bg-white p-5 shadow xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><FaUsers className="text-blue-600" /> Team Scoreboard</h2>
              <Link href="/admin/crm/automatic-assignment" className="text-sm font-semibold text-blue-600 hover:text-blue-800">Configure queues</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Team</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Work Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Agents</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Online</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Active</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Assigned</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Positive</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Unreachable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading report...</td></tr>
                  ) : (report?.teams || []).length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No teams found.</td></tr>
                  ) : (
                    report!.teams.map((team) => (
                      <tr key={team.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{team.name}</div>
                          <div className="text-xs text-gray-500">{team.code || `Team #${team.id}`}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(team.workTypes || []).length ? team.workTypes.map((workType) => (
                              <span key={workType} className={`rounded-full border px-2 py-1 text-xs font-semibold ${WORK_TYPE_META[workType]?.tone || 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                                {workTypeLabel(workType)}
                              </span>
                            )) : <span className="text-sm text-gray-400">Not configured</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold">{formatNumber(team.agentCount)}</td>
                        <td className="px-4 py-3 text-right text-sm text-emerald-700 font-semibold">{formatNumber(team.onlineAgents)}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatNumber(team.activeOrders)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">{formatNumber(team.assignedInRange)}</td>
                        <td className="px-4 py-3 text-right text-sm text-green-700">{formatNumber(team.positiveOutcomes)}</td>
                        <td className="px-4 py-3 text-right text-sm text-amber-700">{formatNumber(team.unreachableOutcomes)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900"><FaClipboardList className="text-blue-600" /> Top Teams</h2>
            <div className="space-y-3">
              {topTeams.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">No assignment activity in this range.</div>
              ) : topTeams.map((team, index) => (
                <div key={team.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase text-blue-600">Rank {index + 1}</div>
                      <div className="font-semibold text-gray-900">{team.name}</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">{formatNumber(team.assignedInRange)}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Active: <span className="font-semibold text-gray-900">{formatNumber(team.activeOrders)}</span></div>
                    <div>Online: <span className="font-semibold text-gray-900">{formatNumber(team.onlineAgents)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="border-b p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><FaUserCheck className="text-blue-600" /> Agent Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Presence</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Active</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Assigned</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Calls</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Positive</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Unreachable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(report?.agents || []).map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{agent.teamCode ? `${agent.teamCode} - ${agent.teamName}` : agent.teamName}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${agent.presenceState === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {agent.presenceState === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{formatNumber(agent.activeOrders)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">{formatNumber(agent.assignedInRange)}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatNumber(agent.callsLogged)}</td>
                    <td className="px-4 py-3 text-right text-sm text-green-700">{formatNumber(agent.positiveOutcomes)}</td>
                    <td className="px-4 py-3 text-right text-sm text-amber-700">{formatNumber(agent.unreachableOutcomes)}</td>
                  </tr>
                ))}
                {!loading && (report?.agents || []).length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No agents found for this team leader.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Automatic Assignments</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(report?.recentAssignments || []).slice(0, 10).map((item) => (
              <div key={item.id} className="flex flex-col gap-1 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold text-gray-900">
                    {item.record_type === 'incomplete_order' ? `Incomplete #${item.incomplete_order_id}` : `Order #${item.order_id}`}
                  </div>
                  <div className="text-sm text-gray-500">{item.agent_name || 'Unassigned agent'} · {workTypeLabel(String(item.reason || '').split(':').pop() || '')}</div>
                </div>
                <div className="text-sm text-gray-500">{formatDateTime(item.created_at)}</div>
              </div>
            ))}
            {!loading && (report?.recentAssignments || []).length === 0 && (
              <div className="p-6 text-center text-gray-500">No recent automatic assignments.</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
