import { useEffect, useState, useMemo, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

/* ───────────── types ───────────── */
interface TierStats {
  new: number; repeat: number; silver: number; gold: number;
  platinum: number; vip: number; blacklist: number; rejected: number; no_tier: number;
}

interface Overview {
  totalCustomers: number;
  repeatRate: number;
  vipRetention30: number;
  pendingFromPreviousDays: number;
}

interface AgentReport {
  id: number;
  name: string;
  activities: { total: number; calls: number };
  tasks: { total: number; completed: number; pending: number };
  telephony: { totalCalls: number; completedCalls: number; failedCalls: number; totalTalkTime: number; avgCallDuration: number };
  customers: { totalAssigned: number; converted: number };
}

interface AgentsSummary {
  totalAgents: number;
  totalActivities: number;
  totalCalls: number;
  completedCalls: number;
  totalTasks: number;
  completedTasks: number;
  totalCustomersAssigned: number;
}

interface DateWiseRow {
  date: string;
  newCustomers: number;
  totalOrders: number;
  revenue: number;
}

interface CustomerReportSummary {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
}

interface MissedFollowup {
  customer_name: string;
  customer_id: number;
  days_overdue: number;
  priority: string;
  assigned_to: string;
}

interface LeadAging { [bucket: string]: number }

/* ───────────── helpers ───────────── */
const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  vip:       { label: 'VIP',       color: 'text-yellow-800', bg: 'bg-yellow-50',  ring: 'ring-yellow-200' },
  platinum:  { label: 'Platinum',  color: 'text-indigo-800', bg: 'bg-indigo-50',  ring: 'ring-indigo-200' },
  gold:      { label: 'Gold',      color: 'text-amber-800',  bg: 'bg-amber-50',   ring: 'ring-amber-200' },
  silver:    { label: 'Silver',    color: 'text-gray-700',   bg: 'bg-gray-50',    ring: 'ring-gray-200' },
  repeat:    { label: 'Repeat',    color: 'text-blue-800',   bg: 'bg-blue-50',    ring: 'ring-blue-200' },
  new:       { label: 'New',       color: 'text-emerald-800',bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  blacklist: { label: 'Blacklist', color: 'text-red-800',    bg: 'bg-red-50',     ring: 'ring-red-200' },
  rejected:  { label: 'Rejected',  color: 'text-rose-800',   bg: 'bg-rose-50',    ring: 'ring-rose-200' },
  no_tier:   { label: 'Unassigned',color: 'text-slate-600',  bg: 'bg-slate-50',   ring: 'ring-slate-200' },
};

const TIER_BAR_COLORS: Record<string, string> = {
  vip: 'bg-yellow-500', platinum: 'bg-indigo-500', gold: 'bg-amber-500', silver: 'bg-gray-400',
  repeat: 'bg-blue-500', new: 'bg-emerald-500', blacklist: 'bg-red-500', rejected: 'bg-rose-400', no_tier: 'bg-slate-300',
};

const AGING_COLORS = ['bg-emerald-500', 'bg-lime-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `৳${(amount / 1000).toFixed(0)}K`;
  if (amount >= 1000) return `৳${(amount / 1000).toFixed(1)}K`;
  return `৳${amount.toFixed(0)}`;
}

function getDateRange(preset: string): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  switch (preset) {
    case '7d':  from.setDate(to.getDate() - 7); break;
    case '14d': from.setDate(to.getDate() - 14); break;
    case '30d': from.setDate(to.getDate() - 30); break;
    case '90d': from.setDate(to.getDate() - 90); break;
    default:    from.setDate(to.getDate() - 30);
  }
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
}

/* ───────────── skeleton loaders ───────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-24 mb-4" />
      <div className="h-7 bg-gray-200 rounded w-16 mb-2" />
      <div className="h-2 bg-gray-100 rounded w-32" />
    </div>
  );
}

function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-3 bg-gray-100 rounded flex-1" />
          <div className="h-3 bg-gray-100 rounded w-16" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

/* ───────────── main component ───────────── */
export default function CrmReportsPage() {
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('30d');

  // Dashboard data
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tierStats, setTierStats] = useState<TierStats | null>(null);

  // Date-ranged data
  const [customerSummary, setCustomerSummary] = useState<CustomerReportSummary | null>(null);
  const [dateWise, setDateWise] = useState<DateWiseRow[]>([]);
  const [agentReports, setAgentReports] = useState<AgentReport[]>([]);
  const [agentsSummary, setAgentsSummary] = useState<AgentsSummary | null>(null);

  // Static data
  const [leadAging, setLeadAging] = useState<LeadAging | null>(null);
  const [missedFollowups, setMissedFollowups] = useState<MissedFollowup[]>([]);

  const loadReports = useCallback(async (preset?: string) => {
    const p = preset || datePreset;
    const { from, to } = getDateRange(p);
    try {
      setLoading(true);
      const [dashRes, custRes, agentsRes, agingRes, missedRes] = await Promise.all([
        apiClient.get('/crm/team/dashboard'),
        apiClient.get(`/crm/team/customer-report?from=${from}&to=${to}`),
        apiClient.get(`/crm/team/agents/report?from=${from}&to=${to}`),
        apiClient.get('/crm/team/lead-aging'),
        apiClient.get('/crm/team/missed-followups'),
      ]);

      // Dashboard
      const dash = dashRes.data;
      setOverview(dash?.overview || null);
      setTierStats(dash?.tierStats || null);

      // Customer report
      const cust = custRes.data;
      setCustomerSummary(cust?.summary || null);
      setDateWise(Array.isArray(cust?.dateWise) ? cust.dateWise : []);

      // Agent reports
      const ar = agentsRes.data;
      setAgentReports(Array.isArray(ar?.agents) ? ar.agents : []);
      setAgentsSummary(ar?.summary || null);

      // Static
      setLeadAging(agingRes.data && typeof agingRes.data === 'object' ? agingRes.data : null);
      setMissedFollowups(Array.isArray(missedRes.data) ? missedRes.data : []);
    } catch (err) {
      console.error('Failed to load CRM reports', err);
    } finally {
      setLoading(false);
    }
  }, [datePreset]);

  useEffect(() => { loadReports(); }, []);

  const handlePresetChange = (p: string) => {
    setDatePreset(p);
    loadReports(p);
  };

  /* ── derived: tier distribution ── */
  const tierTotal = useMemo(() => {
    if (!tierStats) return 0;
    return Object.values(tierStats).reduce((a, b) => a + b, 0);
  }, [tierStats]);

  const sortedTiers = useMemo(() => {
    if (!tierStats) return [];
    return Object.entries(tierStats)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a);
  }, [tierStats]);

  /* ── derived: sparkline max for date-wise chart ── */
  const maxRevenue = useMemo(() => Math.max(...dateWise.map(d => d.revenue), 1), [dateWise]);
  const maxOrders = useMemo(() => Math.max(...dateWise.map(d => d.totalOrders), 1), [dateWise]);
  const maxNewCust = useMemo(() => Math.max(...dateWise.map(d => d.newCustomers), 1), [dateWise]);

  /* ── derived: aging max ── */
  const agingEntries = useMemo(() => {
    if (!leadAging) return [];
    return Object.entries(leadAging).sort((a, b) => {
      const order = ['0-7 days', '8-14 days', '15-25 days', '26-30 days', '30+ days'];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    });
  }, [leadAging]);
  const agingMax = useMemo(() => Math.max(...agingEntries.map(([, v]) => v as number), 1), [agingEntries]);

  /* ── derived: sorted agents by total calls ── */
  const sortedAgents = useMemo(() =>
    [...agentReports].sort((a, b) => b.telephony.totalCalls - a.telephony.totalCalls),
    [agentReports]
  );

  const DATE_PRESETS = [
    { value: '7d', label: '7 Days' },
    { value: '14d', label: '14 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
  ];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* ═══ HEADER ═══ */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">CRM Reports</h1>
              <p className="text-sm text-gray-500 mt-0.5">Insights across customers, agents and engagement</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-white rounded-lg border border-gray-200 p-0.5">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePresetChange(p.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      datePreset === p.value
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => loadReports()}
                disabled={loading}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* ═══ KPI CARDS ═══ */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{overview?.totalCustomers ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">Under your team</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Repeat Rate</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{overview?.repeatRate ?? 0}%</p>
                <p className="text-xs text-gray-400 mt-1">2+ orders placed</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">VIP Retention</p>
                <p className="text-2xl font-bold text-amber-600 mt-2">{overview?.vipRetention30 ?? 0}%</p>
                <p className="text-xs text-gray-400 mt-1">Active in last 30d</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(customerSummary?.totalRevenue ?? 0)}</p>
                <p className="text-xs text-gray-400 mt-1">{customerSummary?.totalOrders ?? 0} orders</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Tasks</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{overview?.pendingFromPreviousDays ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">From previous days</p>
              </div>
            </div>
          )}

          {/* ═══ TIER DISTRIBUTION + CUSTOMER TREND ═══ */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Tier Distribution — 2 cols */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5">Customer Tier Distribution</h2>
              {loading ? <SkeletonTable rows={6} /> : !tierStats || tierTotal === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No tier data available</p>
              ) : (
                <div className="space-y-3">
                  {sortedTiers.map(([key, count]) => {
                    const cfg = TIER_CONFIG[key] || TIER_CONFIG.no_tier;
                    const pct = ((count / tierTotal) * 100).toFixed(1);
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ring-1 ${cfg.bg} ${cfg.color} ${cfg.ring}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${TIER_BAR_COLORS[key] || 'bg-slate-400'}`}
                            style={{ width: `${Math.max(Number(pct), 1)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                    <span>Total customers</span>
                    <span className="font-semibold text-gray-700">{tierTotal}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Customer & Revenue Trend — 3 cols */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5">Customer & Revenue Trend</h2>
              {loading ? <SkeletonTable rows={5} /> : dateWise.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No data for selected period</p>
              ) : (
                <>
                  {/* Mini bar chart */}
                  <div className="flex items-end gap-px h-32 mb-4">
                    {dateWise.slice(-30).map((d, i) => {
                      const revH = (d.revenue / maxRevenue) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" title={`${d.date}\n৳${d.revenue.toLocaleString()} | ${d.totalOrders} orders | ${d.newCustomers} new`}>
                          <div className="w-full rounded-t transition-all duration-200 group-hover:opacity-80 bg-emerald-400" style={{ height: `${Math.max(revH, 2)}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Revenue</span>
                    <span>Showing last {Math.min(dateWise.length, 30)} days</span>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{customerSummary?.totalCustomers ?? 0}</p>
                      <p className="text-xs text-gray-500">New Customers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{customerSummary?.totalOrders ?? 0}</p>
                      <p className="text-xs text-gray-500">Orders</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(customerSummary?.totalRevenue ?? 0)}</p>
                      <p className="text-xs text-gray-500">Revenue</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ═══ LEAD AGING + MISSED FOLLOW-UPS ═══ */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Lead Aging */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5">Lead Aging</h2>
              {loading ? <SkeletonTable rows={5} /> : agingEntries.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No aging data</p>
              ) : (
                <div className="space-y-4">
                  {agingEntries.map(([bucket, value], idx) => {
                    const count = value as number;
                    const pct = (count / agingMax) * 100;
                    const color = AGING_COLORS[idx] || AGING_COLORS[AGING_COLORS.length - 1];
                    return (
                      <div key={bucket}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-gray-700 font-medium">{bucket}</span>
                          <span className="text-sm font-bold text-gray-900">{count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div className={`h-2.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Missed Follow-ups */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Missed Follow-ups</h2>
                {missedFollowups.length > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    {missedFollowups.length}
                  </span>
                )}
              </div>
              {loading ? <SkeletonTable rows={4} /> : missedFollowups.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">All follow-ups are on track</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {missedFollowups.map((item, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                      item.days_overdue > 7 ? 'border-red-200 bg-red-50/50' : 'border-orange-200 bg-orange-50/50'
                    }`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.customer_name || `Customer #${item.customer_id}`}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.assigned_to || 'Unassigned'}</p>
                      </div>
                      <div className="ml-3 flex-shrink-0 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                          item.days_overdue > 7 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {item.days_overdue}d overdue
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══ AGENT PERFORMANCE OVERVIEW ═══ */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Agent Performance</h2>
              {agentsSummary && (
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span><strong className="text-gray-700">{agentsSummary.totalAgents}</strong> agents</span>
                  <span className="text-gray-300">|</span>
                  <span><strong className="text-gray-700">{agentsSummary.totalCalls}</strong> calls</span>
                  <span className="text-gray-300">|</span>
                  <span><strong className="text-gray-700">{agentsSummary.completedTasks}</strong>/{agentsSummary.totalTasks} tasks</span>
                </div>
              )}
            </div>
            {loading ? <SkeletonTable rows={5} /> : sortedAgents.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No agent data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customers</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Calls</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Failed</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Talk Time</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks Done</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Activities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedAgents.map((agent, idx) => {
                      const callRate = agent.telephony.totalCalls > 0
                        ? Math.round((agent.telephony.completedCalls / agent.telephony.totalCalls) * 100) : 0;
                      const taskRate = agent.tasks.total > 0
                        ? Math.round((agent.tasks.completed / agent.tasks.total) * 100) : 0;
                      return (
                        <tr key={agent.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                {idx + 1}
                              </div>
                              <span className="font-medium text-gray-900">{agent.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-semibold text-gray-800">{agent.customers.totalAssigned}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-semibold text-gray-800">{agent.telephony.totalCalls}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-medium text-emerald-700">{agent.telephony.completedCalls}</span>
                              {callRate > 0 && (
                                <span className="text-xs text-gray-400">({callRate}%)</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`font-medium ${agent.telephony.failedCalls > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              {agent.telephony.failedCalls}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-gray-700">{formatDuration(agent.telephony.totalTalkTime)}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-medium text-gray-800">{agent.tasks.completed}/{agent.tasks.total}</span>
                              {taskRate > 0 && (
                                <span className="text-xs text-gray-400">({taskRate}%)</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-gray-700">{agent.activities.total}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
