import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import ScriptEditor from '@/components/admin/ScriptEditor';
import TrainingEditor from '@/components/admin/TrainingEditor';
import { FaSyncAlt } from 'react-icons/fa';
import { FaPhone, FaEnvelope, FaUserTie, FaBullseye, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

// ── Interfaces ──────────────────────────────────────────────
interface DashboardOverview {
  totalCustomers: number;
  repeatRate: number;
  vipRetention30: number;
  pendingFromPreviousDays: number;
}

interface TierStats {
  new: number;
  repeat: number;
  silver: number;
  gold: number;
  platinum: number;
  vip: number;
  blacklist: number;
  rejected: number;
  no_tier: number;
}

interface AssignedAgent {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  agentTier: string;
  assignedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  callsToday: number;
  callsCompleted: number;
  callsFailed: number;
}

interface AgentCallRow {
  agent_id: number | null;
  agent_name: string;
  total_today: number;
  completed_today: number;
  failed_today: number;
}

interface Escalation {
  id: number;
  name: string;
  email: string;
  escalated_at: string;
}

interface DashboardData {
  overview: DashboardOverview;
  tierStats: TierStats;
  assignedAgents: AssignedAgent[];
  agentWiseCalls: AgentCallRow[];
  recentEscalations: Escalation[];
  scripts: Record<string, unknown>;
  trainingRolePlays: Record<string, unknown>;
}

const ITEMS_PER_PAGE = 10;

const SalesTeamLeaderDashboard = () => {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('manage-team-members');
  
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Editable configs state
  const [savedConfigs, setSavedConfigs] = useState<Record<string, unknown>>({});
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  // Pagination state
  const [agentsPage, setAgentsPage] = useState(1);
  const [agentCallsPage, setAgentCallsPage] = useState(1);
  const [escalationsPage, setEscalationsPage] = useState(1);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [dashRes, configRes] = await Promise.all([
        api.get('/crm/team/dashboard'),
        api.get('/crm/team/dashboard/config'),
      ]);
      setDashboard(dashRes.data);
      const raw = configRes.data;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        setSavedConfigs(raw as Record<string, unknown>);
      } else if (Array.isArray(raw)) {
        const configs: Record<string, unknown> = {};
        raw.forEach((c: { configKey: string; value: unknown }) => {
          configs[c.configKey] = c.value;
        });
        setSavedConfigs(configs);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleEditClick = (sectionKey: string, currentValue: unknown) => {
    setEditingSection(sectionKey);
    setEditValue(JSON.parse(JSON.stringify(currentValue)));
  };
  
  const handleSaveConfig = async () => {
    if (!editingSection || !editValue) return;
    try {
      setSaving(true);
      await api.put(`/crm/team/dashboard/config/${editingSection}`, { value: editValue });
      setSavedConfigs(prev => ({ ...prev, [editingSection]: editValue }));
      setEditingSection(null);
      setEditValue(null);
      toast.success('Configuration saved successfully');
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditValue(null);
  };
  
  const getConfigValue = (key: string, defaultValue: unknown): any => {
    return savedConfigs[key] !== undefined ? savedConfigs[key] : defaultValue;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading dashboard">
          <svg className="animate-spin h-8 w-8 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-lg text-gray-600">Loading dashboard...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h1 className="text-3xl font-bold">Sales Team Leader Dashboard</h1>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              aria-label="Refresh dashboard data"
            >
              <FaSyncAlt className={refreshing ? 'animate-spin' : ''} size={14} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Quick Actions */}
          <nav aria-label="Quick actions" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <Link href="/admin/crm/leads" className="bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none min-h-[48px] px-3 py-3 flex items-center justify-center">
              View and Manage Leads
            </Link>
            <Link href="/admin/crm/team/followups" className="bg-yellow-600 text-white text-center rounded-lg hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-400 focus:outline-none min-h-[48px] px-3 py-3 flex items-center justify-center">
              Track Follow-ups
            </Link>
            <Link href="/admin/crm/team-agents-report" className="bg-cyan-600 text-white text-center rounded-lg hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none min-h-[48px] px-3 py-3 flex items-center justify-center">
              Agent Reports
            </Link>
            {/* <Link href="/admin/crm/reports" className="bg-purple-600 text-white text-center py-3 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-400 focus:outline-none">
              View Reports
            </Link> */}
            <Link href="/admin/crm/teams" className="bg-pink-600 text-white text-center rounded-lg hover:bg-pink-700 focus:ring-2 focus:ring-pink-400 focus:outline-none min-h-[48px] px-3 py-3 flex items-center justify-center">
              Manage Teams
            </Link>
            <Link href="/admin/crm/agent-tiers" className="bg-amber-600 text-white text-center rounded-lg hover:bg-amber-700 focus:ring-2 focus:ring-amber-400 focus:outline-none min-h-[48px] px-3 py-3 flex items-center justify-center">
              Agents Tiers
            </Link>
          </nav>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8" role="region" aria-label="Key metrics overview">
          <div className="bg-white p-6 rounded-lg shadow" role="group" aria-label="Total customers">
            <div className="text-gray-600 text-sm mb-2">Total Customers (TL Coverage)</div>
            <div className="text-3xl font-bold text-blue-600" aria-live="polite">{dashboard?.overview?.totalCustomers ?? 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow" role="group" aria-label="Repeat rate">
            <div className="text-gray-600 text-sm mb-2">Repeat Rate</div>
            <div className="text-3xl font-bold text-green-600" aria-live="polite">{dashboard?.overview?.repeatRate ?? 0}%</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow" role="group" aria-label="VIP retention 30 days">
            <div className="text-gray-600 text-sm mb-2">VIP/Permanent Active (30d)</div>
            <div className="text-3xl font-bold text-purple-600" aria-live="polite">{dashboard?.overview?.vipRetention30 ?? 0}%</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow" role="group" aria-label="Pending from previous days">
            <div className="text-gray-600 text-sm mb-2">Pending From Previous Days</div>
            <div className="text-3xl font-bold text-red-600" aria-live="polite">{dashboard?.overview?.pendingFromPreviousDays ?? 0}</div>
          </div>
        </div>

        {/* Customer Tier Distribution */}
        {(() => {
          const ts = dashboard?.tierStats;
          const total = (ts?.new ?? 0) + (ts?.repeat ?? 0) + (ts?.silver ?? 0) + (ts?.gold ?? 0) + (ts?.platinum ?? 0) + (ts?.vip ?? 0) + (ts?.blacklist ?? 0) + (ts?.rejected ?? 0) + (ts?.no_tier ?? 0);
          const tiers = [
            { key: 'vip', label: 'VIP', count: ts?.vip ?? 0, color: 'bg-yellow-400', textColor: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800' },
            { key: 'platinum', label: 'Platinum', count: ts?.platinum ?? 0, color: 'bg-indigo-400', textColor: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-800' },
            { key: 'gold', label: 'Gold', count: ts?.gold ?? 0, color: 'bg-amber-400', textColor: 'text-amber-800', badge: 'bg-amber-100 text-amber-800' },
            { key: 'silver', label: 'Silver', count: ts?.silver ?? 0, color: 'bg-gray-400', textColor: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' },
            { key: 'repeat', label: 'Repeat', count: ts?.repeat ?? 0, color: 'bg-blue-400', textColor: 'text-blue-800', badge: 'bg-blue-100 text-blue-800' },
            { key: 'new', label: 'New', count: ts?.new ?? 0, color: 'bg-green-400', textColor: 'text-green-800', badge: 'bg-green-100 text-green-800' },
            { key: 'blacklist', label: 'Blacklist', count: ts?.blacklist ?? 0, color: 'bg-red-400', textColor: 'text-red-800', badge: 'bg-red-100 text-red-800' },
            { key: 'rejected', label: 'Rejected', count: ts?.rejected ?? 0, color: 'bg-rose-400', textColor: 'text-rose-800', badge: 'bg-rose-100 text-rose-800' },
            { key: 'no_tier', label: 'Untiered', count: ts?.no_tier ?? 0, color: 'bg-slate-300', textColor: 'text-slate-600', badge: 'bg-slate-100 text-slate-600' },
          ];
          return (
            <div className="bg-white p-6 rounded-lg shadow mb-8" role="region" aria-label="Customer tier distribution">
              <h2 className="text-xl font-bold mb-4">Customer Tier Distribution</h2>
              {/* Bar chart */}
              {total > 0 && (
                <div className="flex h-5 rounded-full overflow-hidden mb-4" title={`Total: ${total} customers`}>
                  {tiers.filter(t => t.count > 0).map(t => (
                    <div key={t.key} className={`${t.color} relative group`} style={{ width: `${(t.count / total) * 100}%` }}>
                      <span className="sr-only">{t.label}: {t.count}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Grid of tier cards */}
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
                {tiers.map(t => (
                  <div key={t.key} className="text-center">
                    <div className={`text-2xl font-bold ${t.textColor}`}>{t.count}</div>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${t.badge}`}>{t.label}</span>
                    {total > 0 && <div className="text-xs text-gray-400 mt-0.5">{((t.count / total) * 100).toFixed(1)}%</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Assigned Agents */}
        {(() => {
          const agents = dashboard?.assignedAgents ?? [];
          const totalAgentsPages = Math.max(1, Math.ceil(agents.length / ITEMS_PER_PAGE));
          const pagedAgents = agents.slice((agentsPage - 1) * ITEMS_PER_PAGE, agentsPage * ITEMS_PER_PAGE);
          const tierBadge = (tier: string) => {
            const map: Record<string, string> = {
              vip: 'bg-yellow-100 text-yellow-800 border-yellow-300',
              platinum: 'bg-indigo-100 text-indigo-800 border-indigo-300',
              gold: 'bg-amber-100 text-amber-800 border-amber-300',
              silver: 'bg-gray-100 text-gray-700 border-gray-300',
              bronze: 'bg-orange-100 text-orange-800 border-orange-300',
            };
            return map[tier] || 'bg-gray-100 text-gray-600 border-gray-300';
          };
          const totalAssigned = agents.reduce((s, a) => s + a.assignedLeads, 0);
          const totalCallsToday = agents.reduce((s, a) => s + a.callsToday, 0);
          return (
            <div className="bg-white rounded-lg shadow mb-8" role="region" aria-label="Assigned agents">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FaUserTie className="text-blue-600" /> Assigned Agents
                    <span className="text-sm font-normal text-gray-500">({agents.length})</span>
                  </h2>
                </div>
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-blue-600">{agents.length}</div>
                    <div className="text-xs text-gray-500">Total Agents</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-600">{totalAssigned}</div>
                    <div className="text-xs text-gray-500">Assigned Leads</div>
                  </div>
                  <div className="bg-cyan-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-cyan-600">{totalCallsToday}</div>
                    <div className="text-xs text-gray-500">Total Calls Today</div>
                  </div>
                </div>
              </div>

              {/* Agent Cards */}
              <div className="p-6">
                {pagedAgents.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {pagedAgents.map((agent: AssignedAgent) => (
                      <div key={agent.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold text-gray-900">{agent.name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <FaEnvelope size={10} /> {agent.email}
                            </div>
                            {agent.phone && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                <FaPhone size={10} /> {agent.phone}
                              </div>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${tierBadge(agent.agentTier)}`}>
                            {agent.agentTier.charAt(0).toUpperCase() + agent.agentTier.slice(1)}
                          </span>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="bg-gray-50 rounded p-2">
                            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1"><FaBullseye size={10} /> Leads</div>
                            <div className="text-lg font-bold text-gray-800">{agent.assignedLeads}</div>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1"><FaPhone size={10} /> Calls Today</div>
                            <div className="text-lg font-bold text-cyan-600">{agent.callsToday}</div>
                          </div>
                        </div>

                        {/* Today's calls */}
                        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                          <span className="text-gray-500">Today&apos;s Calls</span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-green-600"><FaCheckCircle size={10} /> {agent.callsCompleted}</span>
                            <span className="flex items-center gap-1 text-red-500"><FaTimesCircle size={10} /> {agent.callsFailed}</span>
                            <span className="text-gray-600 font-medium">{agent.callsToday} total</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-gray-400">No agents assigned yet.</div>
                )}
              </div>

              {agents.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between px-6 pb-4 pt-2 border-t text-sm">
                  <span className="text-gray-600">Page {agentsPage} of {totalAgentsPages} ({agents.length} agents)</span>
                  <div className="flex gap-2">
                    <button onClick={() => setAgentsPage(p => Math.max(1, p - 1))} disabled={agentsPage === 1} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Prev</button>
                    <button onClick={() => setAgentsPage(p => Math.min(totalAgentsPages, p + 1))} disabled={agentsPage === totalAgentsPages} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Next</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Agent-wise Calls */}
        {(() => {
          const allCalls = dashboard?.agentWiseCalls ?? [];
          const totalCallsPages = Math.max(1, Math.ceil(allCalls.length / ITEMS_PER_PAGE));
          const pagedCalls = allCalls.slice((agentCallsPage - 1) * ITEMS_PER_PAGE, agentCallsPage * ITEMS_PER_PAGE);
          return (
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-xl font-bold mb-4">Agent-wise Calls (Today)</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full" aria-label="Agent-wise call tasks for today">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Agent ID</th>
                      <th className="text-left py-3 px-4">Agent Name</th>
                      <th className="text-left py-3 px-4">Total</th>
                      <th className="text-left py-3 px-4">Completed</th>
                      <th className="text-left py-3 px-4">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCalls.length > 0 ? pagedCalls.map((row: AgentCallRow) => (
                      <tr key={row.agent_id ?? 'unassigned'} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{row.agent_id ?? 'Unassigned'}</td>
                        <td className="py-3 px-4">{row.agent_name || 'Unknown'}</td>
                        <td className="py-3 px-4">{row.total_today}</td>
                        <td className="py-3 px-4 text-green-600 font-semibold">{row.completed_today}</td>
                        <td className="py-3 px-4 text-red-600 font-semibold">{row.failed_today}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-500">No tasks found for today.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {allCalls.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t text-sm">
                  <span className="text-gray-600">Page {agentCallsPage} of {totalCallsPages} ({allCalls.length} agents)</span>
                  <div className="flex gap-2">
                    <button onClick={() => setAgentCallsPage(p => Math.max(1, p - 1))} disabled={agentCallsPage === 1} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Prev</button>
                    <button onClick={() => setAgentCallsPage(p => Math.min(totalCallsPages, p + 1))} disabled={agentCallsPage === totalCallsPages} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Next</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Scripts */}
        <div className="bg-white p-6 rounded-lg shadow mb-8" role="region" aria-label="Call script playbook">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Call Script Playbook</h2>
            {canEdit && (
              <button
                onClick={() => handleEditClick('scripts', getConfigValue('scripts', dashboard?.scripts))}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                ✏️ Edit Scripts
              </button>
            )}
          </div>
          {(() => {
            const scripts = getConfigValue('scripts', dashboard?.scripts);
            return (
              <>
                <div className="grid md:grid-cols-2 gap-4 text-sm mb-6">
                  <div className="border rounded p-4">
                    <div className="font-semibold mb-2">{scripts?.commonOpening?.title}</div>
                    <ul className="list-disc ml-5 space-y-1 text-gray-700">
                      {(scripts?.commonOpening?.lines || []).map((l: string, idx: number) => (
                        <li key={idx}>{l}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="border rounded p-4">
                    <div className="font-semibold mb-2">{scripts?.callEnding?.title}</div>
                    <ul className="list-disc ml-5 space-y-1 text-gray-700">
                      {(scripts?.callEnding?.lines || []).map((l: string, idx: number) => (
                        <li key={idx}>{l}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {['A', 'B', 'C', 'D', 'E'].map((k) => (
                    <div key={k} className="border rounded p-4">
                      <div className="font-semibold mb-1">{scripts?.[k]?.title}</div>
                      <div className="text-gray-600 mb-2">Goal: {scripts?.[k]?.goal}</div>
                      <div className="text-gray-600 mb-2">Style: {(scripts?.[k]?.style || []).join(', ')}</div>
                      <ul className="list-disc ml-5 space-y-1 text-gray-700">
                        {(scripts?.[k]?.script || []).map((l: string, idx: number) => (
                          <li key={idx}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="border rounded p-4">
                    <div className="font-semibold mb-1">{scripts?.winBack?.title}</div>
                    <div className="text-gray-600 mb-2">Goal: {scripts?.winBack?.goal}</div>
                    <div className="text-gray-600 mb-2">Style: {(scripts?.winBack?.style || []).join(', ')}</div>
                    <ul className="list-disc ml-5 space-y-1 text-gray-700">
                      {(scripts?.winBack?.script || []).map((l: string, idx: number) => (
                        <li key={idx}>{l}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="border rounded p-4">
                    <div className="font-semibold mb-1">{scripts?.permanentDeclaration?.title}</div>
                    <div className="text-gray-600 mb-2">Goal: {scripts?.permanentDeclaration?.goal}</div>
                    <div className="text-gray-600 mb-2">Style: {(scripts?.permanentDeclaration?.style || []).join(', ')}</div>
                    <ul className="list-disc ml-5 space-y-1 text-gray-700">
                      {(scripts?.permanentDeclaration?.script || []).map((l: string, idx: number) => (
                        <li key={idx}>{l}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="border rounded p-4">
                    <div className="font-semibold mb-2">{scripts?.objectionHandling?.title}</div>
                    <div className="space-y-3">
                      {(scripts?.objectionHandling?.items || []).map((it: any, idx: number) => (
                        <div key={idx}>
                          <div className="font-medium">❓ {it.objection}</div>
                          <div className="text-gray-700">{it.reply}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  Universal flow: {(scripts?.universal?.flow || []).join(' → ')}
                </div>
              </>
            );
          })()}
        </div>

        {/* Agent Training Role Plays */}
        <div className="bg-white p-6 rounded-lg shadow mb-8" role="region" aria-label="Agent training role plays">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Agent Training (Role Play)</h2>
            {canEdit && (
              <button
                onClick={() => handleEditClick('trainingRolePlays', getConfigValue('trainingRolePlays', dashboard?.trainingRolePlays))}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                ✏️ Edit Training
              </button>
            )}
          </div>
          {(() => {
            const training = getConfigValue('trainingRolePlays', dashboard?.trainingRolePlays);
            return (
              <>
                <div className="text-sm text-gray-600 mb-4">
                  {training?.title} — {training?.format}
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {(training?.rolePlays || []).map((rp: any) => (
                    <div key={rp.id} className="border rounded p-4">
                      <div className="font-semibold mb-2">{rp.title}</div>
                      <div className="text-gray-600 mb-2">
                        Training Goal: {(rp.trainingGoal || []).join(' • ')}
                      </div>
                      <div className="space-y-2">
                        {(rp.script || []).map((line: any, idx: number) => (
                          <div key={idx}>
                            <span className="font-medium">{line.speaker}: </span>
                            <span className="text-gray-700">{line.line}</span>
                          </div>
                        ))}
                      </div>
                      {(rp.notes || []).length > 0 && (
                        <div className="mt-3 text-gray-600">
                          Notes: {(rp.notes || []).join(' • ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm mt-6">
                  <div className="border rounded p-4">
                    <div className="font-semibold mb-2">Common Training Mistakes</div>
                    <ul className="list-disc ml-5 space-y-1 text-gray-700">
                      {(training?.commonMistakes || []).map((m: string, idx: number) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="border rounded p-4">
                    <div className="font-semibold mb-2">Golden Rules</div>
                    <ul className="list-disc ml-5 space-y-1 text-gray-700">
                      {(training?.goldenRules || []).map((m: string, idx: number) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Recent Escalations */}
        {(() => {
          const allEscalations: Escalation[] = dashboard?.recentEscalations ?? [];
          const totalEscPages = Math.max(1, Math.ceil(allEscalations.length / ITEMS_PER_PAGE));
          const pagedEscalations = allEscalations.slice((escalationsPage - 1) * ITEMS_PER_PAGE, escalationsPage * ITEMS_PER_PAGE);
          return (
            <div className="bg-white p-6 rounded-lg shadow" role="region" aria-label="Recent escalations">
              <h2 className="text-xl font-bold mb-4">Recent Escalations</h2>
              {pagedEscalations.length > 0 ? (
                <div className="space-y-3">
                  {pagedEscalations.map((escalation) => (
                    <div key={escalation.id} className="border-l-4 border-red-500 pl-4 py-2">
                      <div className="font-semibold">{escalation.name}</div>
                      <div className="text-sm text-gray-600">{escalation.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Escalated: {new Date(escalation.escalated_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No recent escalations</p>
              )}
              {allEscalations.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t text-sm">
                  <span className="text-gray-600">Page {escalationsPage} of {totalEscPages} ({allEscalations.length} escalations)</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEscalationsPage(p => Math.max(1, p - 1))} disabled={escalationsPage === 1} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Prev</button>
                    <button onClick={() => setEscalationsPage(p => Math.min(totalEscPages, p + 1))} disabled={escalationsPage === totalEscPages} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Next</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
      
      {/* Edit Modal */}
      {editingSection && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingSection === 'scripts' ? 'Edit call scripts' : 'Edit training content'}
          onKeyDown={(e) => { if (e.key === 'Escape') handleCancelEdit(); }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCancelEdit(); }}
          ref={(el) => el?.focus()}
          tabIndex={-1}
        >
          {editingSection === 'scripts' ? (
            <ScriptEditor
              value={editValue}
              onChange={setEditValue}
              onSave={handleSaveConfig}
              onCancel={handleCancelEdit}
              saving={saving}
            />
          ) : (
            <TrainingEditor
              value={editValue}
              onChange={setEditValue}
              onSave={handleSaveConfig}
              onCancel={handleCancelEdit}
              saving={saving}
            />
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default SalesTeamLeaderDashboard;
