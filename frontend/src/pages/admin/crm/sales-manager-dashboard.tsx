import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaBolt,
  FaChartLine,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFilter,
  FaLayerGroup,
  FaPhone,
  FaRandom,
  FaShieldAlt,
  FaSitemap,
  FaSyncAlt,
  FaTasks,
  FaUserCheck,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';

type CountItem = { label: string; count: number; averageScore?: number };

type TeamLeaderStat = {
  id: number;
  name: string;
  email?: string;
  totalCustomers: number;
  leads: number;
  converted: number;
  conversionRate: number;
  agentsCount: number;
  escalated: number;
};

type AgentPerformance = {
  id: number;
  name: string;
  teamLeaderName: string;
  assignedLeads: number;
  contactedLeads: number;
  convertedLeads: number;
  callsToday: number;
  callsMonth: number;
  conversionRate: number;
};

type RecentActivity = {
  type: string;
  customerName: string;
  customerPhone?: string | null;
  detail?: string;
  actorName?: string;
  activityAt?: string | null;
};

type DuplicateLead = {
  kind: string;
  matchKey: string;
  count: number;
  customers: Array<{ id: number; name?: string | null; phone?: string | null; email?: string | null }>;
};

type VerificationStats = {
  total: number;
  phonePresent: number;
  emailPresent: number;
  addressPresent: number;
  namePresent: number;
  contacted: number;
  verified: number;
  verificationRate: number;
};

type DashboardData = {
  overview: {
    totalCustomers: number;
    totalLeads: number;
    totalConverted: number;
    conversionRate: number;
    unassignedLeads: number;
    escalatedCount: number;
    totalTeamLeaders: number;
  };
  teamLeaderStats: TeamLeaderStat[];
  analytics?: {
    leadsBySource: CountItem[];
    leadStatusFunnel: CountItem[];
    topTeamLeaders: TeamLeaderStat[];
    agentPerformance: AgentPerformance[];
    leadQualityDistribution: CountItem[];
    unassignedQueueBreakdown: {
      bySource: CountItem[];
      byAge: CountItem[];
    };
    recentActivities: RecentActivity[];
    duplicateLeads: DuplicateLead[];
    leadVerification: VerificationStats;
    leadScoring: CountItem[];
    lossReasonAnalysis: CountItem[];
  };
};

const emptyVerification: VerificationStats = {
  total: 0,
  phonePresent: 0,
  emailPresent: 0,
  addressPresent: 0,
  namePresent: 0,
  contacted: 0,
  verified: 0,
  verificationRate: 0,
};

const colors = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-teal-500',
];

function n(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function pct(value: number | string | null | undefined) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function titleize(value?: string | null) {
  return String(value || 'Unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function maxCount(items: CountItem[]) {
  return Math.max(1, ...items.map((item) => Number(item.count || 0)));
}

export default function SalesManagerDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/crm/sales-manager/dashboard');
      setDashboard(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const analytics = dashboard?.analytics;
  const overview = dashboard?.overview;
  const leadVerification = analytics?.leadVerification || emptyVerification;
  const unassignedTotal = useMemo(
    () => (analytics?.unassignedQueueBreakdown?.byAge || []).reduce((sum, item) => sum + item.count, 0),
    [analytics?.unassignedQueueBreakdown?.byAge],
  );

  return (
    <AdminLayout>
      <div className="space-y-5 p-4 lg:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <FaSitemap className="text-indigo-600" />
              Data Analyst Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Lead movement, assignment quality, verification health, and team performance in one view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/admin/crm/sales-manager-leads"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <FaTasks /> Manage Leads
            </a>
            <button
              type="button"
              onClick={fetchDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !dashboard ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <span className="ml-3 text-sm font-medium text-gray-600">Loading sales manager dashboard...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <MetricCard icon={<FaUsers />} label="Total Customers" value={n(overview?.totalCustomers)} tone="blue" />
              <MetricCard icon={<FaFilter />} label="Total Leads" value={n(overview?.totalLeads)} tone="amber" />
              <MetricCard icon={<FaUserCheck />} label="Converted" value={n(overview?.totalConverted)} tone="emerald" />
              <MetricCard icon={<FaChartLine />} label="Conversion" value={`${overview?.conversionRate || 0}%`} tone="indigo" />
              <MetricCard icon={<FaExclamationTriangle />} label="Unassigned" value={n(overview?.unassignedLeads)} tone="rose" />
              <MetricCard icon={<FaUserTie />} label="Team Leaders" value={n(overview?.totalTeamLeaders)} tone="violet" />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel title="Leads by Source" icon={<FaLayerGroup />}>
                <BarList items={analytics?.leadsBySource || []} empty="No lead source data" />
              </Panel>

              <Panel title="Lead Status Funnel" icon={<FaChartLine />}>
                <FunnelList items={analytics?.leadStatusFunnel || []} />
              </Panel>

              <Panel title="Lead Quality Distribution" icon={<FaBolt />}>
                <QualityList items={analytics?.leadQualityDistribution || []} />
              </Panel>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel title="Top Performing Team Leaders" icon={<FaUserTie />}>
                <TeamLeaderTable rows={analytics?.topTeamLeaders || dashboard?.teamLeaderStats || []} />
              </Panel>

              <Panel title="Agent Performance Overview" icon={<FaUsers />}>
                <AgentPerformanceTable rows={analytics?.agentPerformance || []} />
              </Panel>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel title="Unassigned Queue Breakdown" icon={<FaExclamationTriangle />}>
                <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {n(unassignedTotal)} leads waiting for assignment
                </div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">By Age</h4>
                <BarList items={analytics?.unassignedQueueBreakdown?.byAge || []} empty="No unassigned age data" compact />
                <h4 className="mb-2 mt-4 text-xs font-semibold uppercase text-gray-500">By Source</h4>
                <BarList items={analytics?.unassignedQueueBreakdown?.bySource || []} empty="No unassigned source data" compact />
              </Panel>

              <Panel title="Lead Verification" icon={<FaShieldAlt />}>
                <VerificationPanel stats={leadVerification} />
              </Panel>

              <Panel title="Lead Scoring" icon={<FaBolt />}>
                <ScoreList items={analytics?.leadScoring || []} />
              </Panel>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel title="Recent Activities" icon={<FaPhone />} className="xl:col-span-1">
                <RecentActivities rows={analytics?.recentActivities || []} />
              </Panel>

              <Panel title="Duplicate Leads" icon={<FaRandom />} className="xl:col-span-1">
                <DuplicateLeads rows={analytics?.duplicateLeads || []} />
              </Panel>

              <Panel title="Loss Reason Analysis" icon={<FaExclamationTriangle />} className="xl:col-span-1">
                <BarList items={analytics?.lossReasonAnalysis || []} empty="No loss reason data" />
              </Panel>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: 'blue' | 'amber' | 'emerald' | 'indigo' | 'rose' | 'violet' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}

function Panel({ title, icon, children, className = '' }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className="text-indigo-600">{icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function BarList({ items, empty, compact = false }: { items: CountItem[]; empty: string; compact?: boolean }) {
  const max = maxCount(items);
  if (!items.length) return <EmptyText>{empty}</EmptyText>;
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-gray-700">{titleize(item.label)}</span>
            <span className="font-semibold tabular-nums text-gray-900">{n(item.count)}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full ${colors[index % colors.length]}`}
              style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FunnelList({ items }: { items: CountItem[] }) {
  const max = maxCount(items);
  if (!items.length) return <EmptyText>No funnel data</EmptyText>;
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">{titleize(item.label)}</span>
            <span className="font-bold text-gray-900">{n(item.count)}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white">
            <div className={`h-2 rounded-full ${colors[index % colors.length]}`} style={{ width: `${Math.max(6, (item.count / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function QualityList({ items }: { items: CountItem[] }) {
  const tone: Record<string, string> = {
    hot: 'bg-red-50 text-red-700 border-red-100',
    warm: 'bg-amber-50 text-amber-700 border-amber-100',
    cold: 'bg-sky-50 text-sky-700 border-sky-100',
    unrated: 'bg-gray-50 text-gray-700 border-gray-100',
  };
  if (!items.length) return <EmptyText>No lead quality data</EmptyText>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className={`rounded-lg border p-3 ${tone[item.label] || tone.unrated}`}>
          <div className="text-xs font-semibold uppercase">{titleize(item.label)}</div>
          <div className="mt-1 text-2xl font-bold">{n(item.count)}</div>
        </div>
      ))}
    </div>
  );
}

function TeamLeaderTable({ rows }: { rows: TeamLeaderStat[] }) {
  if (!rows.length) return <EmptyText>No team leader data</EmptyText>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-3">Team Leader</th>
            <th className="py-2 text-right">Leads</th>
            <th className="py-2 text-right">Converted</th>
            <th className="py-2 text-right">Conv.</th>
            <th className="py-2 text-right">Agents</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-2 pr-3 font-medium text-gray-900">{row.name}</td>
              <td className="py-2 text-right tabular-nums">{n(row.leads)}</td>
              <td className="py-2 text-right tabular-nums text-emerald-700">{n(row.converted)}</td>
              <td className="py-2 text-right tabular-nums">{pct(row.conversionRate)}</td>
              <td className="py-2 text-right tabular-nums">{n(row.agentsCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentPerformanceTable({ rows }: { rows: AgentPerformance[] }) {
  if (!rows.length) return <EmptyText>No agent performance data</EmptyText>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-3">Agent</th>
            <th className="py-2 text-right">Assigned</th>
            <th className="py-2 text-right">Contacted</th>
            <th className="py-2 text-right">Converted</th>
            <th className="py-2 text-right">Calls</th>
            <th className="py-2 text-right">Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-2 pr-3">
                <div className="font-medium text-gray-900">{row.name}</div>
                <div className="text-xs text-gray-500">{row.teamLeaderName}</div>
              </td>
              <td className="py-2 text-right tabular-nums">{n(row.assignedLeads)}</td>
              <td className="py-2 text-right tabular-nums">{n(row.contactedLeads)}</td>
              <td className="py-2 text-right tabular-nums text-emerald-700">{n(row.convertedLeads)}</td>
              <td className="py-2 text-right tabular-nums">{n(row.callsMonth)}</td>
              <td className="py-2 text-right tabular-nums">{pct(row.conversionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerificationPanel({ stats }: { stats: VerificationStats }) {
  const checks = [
    { label: 'Name', value: stats.namePresent },
    { label: 'Phone', value: stats.phonePresent },
    { label: 'Email', value: stats.emailPresent },
    { label: 'Address', value: stats.addressPresent },
    { label: 'Contacted', value: stats.contacted },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-emerald-50 p-4 text-center text-emerald-700">
        <div className="text-3xl font-bold">{pct(stats.verificationRate)}</div>
        <div className="text-xs font-semibold uppercase">Verification Rate</div>
        <div className="mt-1 text-xs">{n(stats.verified)} of {n(stats.total)} leads verified</div>
      </div>
      <div className="space-y-2">
        {checks.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-600">{item.label}</span>
            <span className="font-semibold text-gray-900">{n(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreList({ items }: { items: CountItem[] }) {
  if (!items.length) return <EmptyText>No lead scoring data</EmptyText>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800">{item.label}</span>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-indigo-700">
              Avg {item.averageScore || 0}
            </span>
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{n(item.count)}</div>
        </div>
      ))}
    </div>
  );
}

function RecentActivities({ rows }: { rows: RecentActivity[] }) {
  if (!rows.length) return <EmptyText>No recent activity</EmptyText>;
  return (
    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
      {rows.map((row, index) => (
        <div key={`${row.type}-${row.activityAt}-${index}`} className="rounded-lg border border-gray-100 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">{row.customerName}</div>
              <div className="text-xs text-gray-500">{row.customerPhone || 'No phone'}</div>
            </div>
            <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">
              {row.type}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-700">{row.detail || 'Activity recorded'}</div>
          <div className="mt-2 flex justify-between text-xs text-gray-400">
            <span>{row.actorName || 'System'}</span>
            <span>{formatDateTime(row.activityAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DuplicateLeads({ rows }: { rows: DuplicateLead[] }) {
  if (!rows.length) return <EmptyText>No duplicate leads detected</EmptyText>;
  return (
    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
      {rows.map((row) => (
        <div key={`${row.kind}-${row.matchKey}`} className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">{row.kind}: {row.matchKey}</div>
              <div className="text-xs text-gray-500">{row.count} matching records</div>
            </div>
            <FaExclamationTriangle className="shrink-0 text-amber-500" />
          </div>
          <div className="mt-2 space-y-1">
            {row.customers.slice(0, 3).map((customer) => (
              <div key={customer.id} className="truncate text-xs text-gray-600">
                #{customer.id} {customer.name || 'Unnamed'} {customer.phone ? `- ${customer.phone}` : ''}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
      {children}
    </div>
  );
}
