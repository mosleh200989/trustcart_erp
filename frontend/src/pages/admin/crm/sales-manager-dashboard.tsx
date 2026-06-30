import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaBolt,
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaFilter,
  FaGlobeAsia,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaPhone,
  FaRandom,
  FaRedo,
  FaShieldAlt,
  FaShoppingCart,
  FaSitemap,
  FaSyncAlt,
  FaTasks,
  FaTimesCircle,
  FaTruckLoading,
  FaUserCheck,
  FaUserClock,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';
import AdminDateInput from '@/components/admin/AdminDateInput';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';

type CountItem = { label: string; count: number; amount?: number; averageScore?: number; changePercent?: number };

type MetricTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'violet' | 'slate';

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

type AgentPerformance = {
  id: number;
  name: string;
  assignedLeads: number;
  totalDialed: number;
  connectedCustomers: number;
  interestedCustomers: number;
  orderConfirmed: number;
  conversionRate: number;
};

type TeamLeaderAgentGroup = {
  id: number;
  name: string;
  agents: AgentPerformance[];
};

type DashboardData = {
  filters?: {
    period: string;
    startDate: string;
    endDate: string;
    today: string;
  };
  topDashboard?: {
    totalCustomers: number;
    todaysNewCustomers: number;
    todaysCalls: number;
    successfulCalls: number;
    failedCalls: number;
    todaysOrders: number;
    conversionRate: number;
    repeatCustomers: number;
  };
  salesTrend?: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    revenueChangePercent: number;
    orderChangePercent: number;
    averageOrderValueChangePercent: number;
    daily: Array<{ date: string; orders: number; revenue: number }>;
    trendingProducts: CountItem[];
  };
  customerInsights?: {
    totalCustomers: number;
    newCustomers: number;
    repeatCustomers: number;
    foreignCustomers: number;
    blacklistedCustomers: number;
    tiers: CountItem[];
  };
  churn?: {
    noOrders30Days: number;
    noCalls30Days: number;
  };
  callAnalytics?: {
    outcomes: CountItem[];
    followUpCalls: number;
  };
  crossSell?: {
    success: number;
    failed: number;
  };
  upSell?: {
    success: number;
    failed: number;
  };
  productInsights?: {
    bestSelling: CountItem[];
    slowMoving: CountItem[];
  };
  locationInsights?: {
    districts: CountItem[];
    cities: CountItem[];
    foreignCustomers: number;
  };
  followUps?: {
    total: number;
    today: number;
    tomorrow: number;
    overdue: number;
    completed: number;
    reminders: number;
  };
  leaderAgentPerformance?: TeamLeaderAgentGroup[];
  analytics?: {
    leadsBySource: CountItem[];
    leadStatusFunnel: CountItem[];
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

const periodOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

const barColors = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-indigo-500'];

function n(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('en-BD');
}

function money(value: number | string | null | undefined) {
  return `BDT ${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
}

function pct(value: number | string | null | undefined) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getLocalDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

function firstDayOfMonth() {
  const today = getLocalDateString();
  return `${today.slice(0, 7)}-01`;
}

function titleize(value?: string | null) {
  return String(value || 'Unknown')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function maxCount(items: CountItem[]) {
  return Math.max(1, ...items.map((item) => Number(item.count || 0)));
}

export default function SalesManagerDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(() => getLocalDateString());

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      if (period === 'custom') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }
      const response = await api.get(`/crm/sales-manager/dashboard?${params.toString()}`);
      setDashboard(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load Data Analyst dashboard');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const analytics = dashboard?.analytics;
  const top = dashboard?.topDashboard;
  const sales = dashboard?.salesTrend;
  const customer = dashboard?.customerInsights;
  const verification = analytics?.leadVerification || emptyVerification;
  const unassignedTotal = useMemo(
    () => (analytics?.unassignedQueueBreakdown?.byAge || []).reduce((sum, item) => sum + Number(item.count || 0), 0),
    [analytics?.unassignedQueueBreakdown?.byAge],
  );
  const activeRange = dashboard?.filters ? `${dashboard.filters.startDate} to ${dashboard.filters.endDate}` : `${startDate} to ${endDate}`;

  return (
    <AdminLayout>
      <div className="space-y-5 p-4 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <FaSitemap className="text-indigo-600" />
              Data Analyst Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Customer, order, call, product, follow-up, and agent performance intelligence.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                    period === option.value ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Start Date</span>
                  <AdminDateInput value={startDate} onValueChange={setStartDate} className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">End Date</span>
                  <AdminDateInput value={endDate} onValueChange={setEndDate} className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </label>
              </>
            )}
            <a
              href="/admin/crm/sales-manager-leads"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
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

        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          Active range: <span className="font-bold">{activeRange}</span>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading && !dashboard ? (
          <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <span className="ml-3 text-sm font-medium text-gray-600">Loading Data Analyst dashboard...</span>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 2xl:grid-cols-8">
              <MetricCard icon={<FaUsers />} label="Total Customers" value={n(top?.totalCustomers)} tone="blue" />
              <MetricCard icon={<FaUserCheck />} label="Today's New Customers" value={n(top?.todaysNewCustomers)} tone="emerald" />
              <MetricCard icon={<FaPhone />} label="Today's Calls" value={n(top?.todaysCalls)} tone="indigo" />
              <MetricCard icon={<FaCheckCircle />} label="Successful Calls" value={n(top?.successfulCalls)} tone="emerald" />
              <MetricCard icon={<FaTimesCircle />} label="Failed Calls" value={n(top?.failedCalls)} tone="rose" />
              <MetricCard icon={<FaShoppingCart />} label="Today's Orders" value={n(top?.todaysOrders)} tone="amber" />
              <MetricCard icon={<FaChartLine />} label="Conversion Rate" value={pct(top?.conversionRate)} tone="violet" />
              <MetricCard icon={<FaRedo />} label="Repeat Customers" value={n(top?.repeatCustomers)} tone="slate" />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel title="Sales Trend Overview" icon={<FaChartLine />} className="xl:col-span-2">
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <TrendStat label="Total Revenue" value={money(sales?.totalRevenue)} change={sales?.revenueChangePercent || 0} />
                  <TrendStat label="Total Orders" value={n(sales?.totalOrders)} change={sales?.orderChangePercent || 0} />
                  <TrendStat label="Average Order Value" value={money(sales?.averageOrderValue)} change={sales?.averageOrderValueChangePercent || 0} />
                </div>
                <SalesTrendChart rows={sales?.daily || []} />
              </Panel>

              <Panel title="Top Trending Products" icon={<FaTruckLoading />}>
                <TrendingProducts items={sales?.trendingProducts || []} />
              </Panel>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel title="Customer Base" icon={<FaUsers />}>
                <CompactMetricGrid
                  items={[
                    ['All Customers', customer?.totalCustomers || 0],
                    ['New Customers', customer?.newCustomers || 0],
                    ['Repeat Customers', customer?.repeatCustomers || 0],
                    ['Foreign Customers', customer?.foreignCustomers || 0],
                    ['Blacklisted Customers', customer?.blacklistedCustomers || 0],
                  ]}
                />
                <div className="mt-4">
                  <SectionLabel>Tier Distribution</SectionLabel>
                  <BarList items={customer?.tiers || []} empty="No tier data" compact />
                </div>
              </Panel>

              <Panel title="Churn Watch" icon={<FaUserClock />}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <RiskBox label="30+ Days Without Orders" value={dashboard?.churn?.noOrders30Days || 0} />
                  <RiskBox label="30+ Days Without Calls" value={dashboard?.churn?.noCalls30Days || 0} />
                </div>
              </Panel>

              <Panel title="Lead Status Funnel" icon={<FaFilter />}>
                <FunnelList items={analytics?.leadStatusFunnel || []} />
              </Panel>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <Panel title="Call Outcome Mix" icon={<FaPhone />} className="xl:col-span-2">
                <BarList items={analytics?.leadStatusFunnel?.length ? dashboard?.callAnalytics?.outcomes || [] : dashboard?.callAnalytics?.outcomes || []} empty="No call outcome data" />
              </Panel>

              <Panel title="Cross Sell" icon={<FaLayerGroup />}>
                <SuccessFailureCard success={dashboard?.crossSell?.success || 0} failed={dashboard?.crossSell?.failed || 0} successLabel="Success" failedLabel="Failed" />
              </Panel>

              <Panel title="Up Sell" icon={<FaBolt />}>
                <SuccessFailureCard success={dashboard?.upSell?.success || 0} failed={dashboard?.upSell?.failed || 0} successLabel="Success" failedLabel="Failed" />
              </Panel>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel title="Products" icon={<FaShoppingCart />}>
                <SectionLabel>Best Selling</SectionLabel>
                <RankedList items={dashboard?.productInsights?.bestSelling || []} valueFormatter={(item) => `${n(item.count)} sold`} />
                <SectionLabel className="mt-4">Slow Moving</SectionLabel>
                <RankedList items={dashboard?.productInsights?.slowMoving || []} valueFormatter={(item) => `${n(item.count)} sold`} />
              </Panel>

              <Panel title="Location" icon={<FaMapMarkerAlt />}>
                <div className="mb-3 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
                  Foreign customer signals: {n(dashboard?.locationInsights?.foreignCustomers || 0)}
                </div>
                <SectionLabel>Districts</SectionLabel>
                <BarList items={dashboard?.locationInsights?.districts || []} empty="No district data" compact />
                <SectionLabel className="mt-4">Cities</SectionLabel>
                <BarList items={dashboard?.locationInsights?.cities || []} empty="No city data" compact />
              </Panel>

              <Panel title="Follow-up Queue" icon={<FaClipboardList />}>
                <CompactMetricGrid
                  items={[
                    ['Total Follow-ups', dashboard?.followUps?.total || 0],
                    ['Today', dashboard?.followUps?.today || 0],
                    ['Tomorrow', dashboard?.followUps?.tomorrow || 0],
                    ['Overdue', dashboard?.followUps?.overdue || 0],
                    ['Completed', dashboard?.followUps?.completed || 0],
                    ['Reminders', dashboard?.followUps?.reminders || 0],
                  ]}
                />
              </Panel>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel title="Leads by Source" icon={<FaGlobeAsia />}>
                <BarList items={analytics?.leadsBySource || []} empty="No lead source data" />
              </Panel>

              <Panel title="Lead Quality Distribution" icon={<FaBolt />}>
                <QualityList items={analytics?.leadQualityDistribution || []} />
              </Panel>

              <Panel title="Unassigned Queue Breakdown" icon={<FaExclamationTriangle />}>
                <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {n(unassignedTotal)} leads waiting for assignment
                </div>
                <SectionLabel>By Age</SectionLabel>
                <BarList items={analytics?.unassignedQueueBreakdown?.byAge || []} empty="No unassigned age data" compact />
                <SectionLabel className="mt-4">By Source</SectionLabel>
                <BarList items={analytics?.unassignedQueueBreakdown?.bySource || []} empty="No unassigned source data" compact />
              </Panel>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel title="Lead Verification" icon={<FaShieldAlt />}>
                <VerificationPanel stats={verification} />
              </Panel>

              <Panel title="Lead Scoring" icon={<FaBolt />}>
                <ScoreList items={analytics?.leadScoring || []} />
              </Panel>

              <Panel title="Loss Reason Analysis" icon={<FaExclamationTriangle />}>
                <BarList items={analytics?.lossReasonAnalysis || []} empty="No loss reason data" />
              </Panel>
            </section>

            <Panel title="Agent Performance by Team Leader" icon={<FaUserTie />}>
              <LeaderAgentPerformance groups={dashboard?.leaderAgentPerformance || []} />
            </Panel>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel title="Duplicate Leads" icon={<FaRandom />}>
                <DuplicateLeads rows={analytics?.duplicateLeads || []} />
              </Panel>

              <Panel title="Recent Activities" icon={<FaPhone />}>
                <RecentActivities rows={analytics?.recentActivities || []} />
              </Panel>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: MetricTone }) {
  const tones: Record<MetricTone, string> = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    rose: 'border-rose-100 bg-rose-50 text-rose-700',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    violet: 'border-violet-100 bg-violet-50 text-violet-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="mb-3 text-lg">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}

function Panel({ title, icon, children, className = '' }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className="text-indigo-600">{icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function TrendStat({ label, value, change }: { label: string; value: string; change: number }) {
  const positive = change >= 0;
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="text-xs font-semibold uppercase text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-gray-900">{value}</div>
      <div className={`mt-1 text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
        {positive ? '+' : ''}{pct(change)} vs previous period
      </div>
    </div>
  );
}

function SalesTrendChart({ rows }: { rows: Array<{ date: string; orders: number; revenue: number }> }) {
  const width = 760;
  const height = 220;
  const padding = 24;
  const maxRevenue = Math.max(1, ...rows.map((row) => row.revenue || 0));
  const maxOrders = Math.max(1, ...rows.map((row) => row.orders || 0));
  const pointFor = (value: number, max: number, index: number) => {
    const x = rows.length <= 1 ? width / 2 : padding + (index * (width - padding * 2)) / (rows.length - 1);
    const y = height - padding - (Number(value || 0) / max) * (height - padding * 2);
    return `${x},${y}`;
  };
  const revenuePoints = rows.map((row, index) => pointFor(row.revenue, maxRevenue, index)).join(' ');
  const orderPoints = rows.map((row, index) => pointFor(row.orders, maxOrders, index)).join(' ');

  if (!rows.length) return <EmptyText>No sales trend data</EmptyText>;

  return (
    <div>
      <div className="h-64 w-full overflow-hidden rounded-lg border border-gray-100 bg-white">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {[0, 1, 2, 3].map((line) => {
            const y = padding + (line * (height - padding * 2)) / 3;
            return <line key={line} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
          })}
          <polyline fill="none" points={revenuePoints} stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline fill="none" points={orderPoints} stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-gray-600">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded bg-blue-600" /> Revenue</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded bg-orange-500" /> Orders</span>
      </div>
    </div>
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
              className={`h-2 rounded-full ${barColors[index % barColors.length]}`}
              style={{ width: `${Math.max(4, (Number(item.count || 0) / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FunnelList({ items }: { items: CountItem[] }) {
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
            <div className={`h-2 rounded-full ${barColors[index % barColors.length]}`} style={{ width: `${Math.max(6, (Number(item.count || 0) / maxCount(items)) * 100)}%` }} />
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

function TrendingProducts({ items }: { items: CountItem[] }) {
  if (!items.length) return <EmptyText>No trending products</EmptyText>;
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase text-gray-400">#{index + 1}</div>
              <div className="font-semibold text-gray-900">{item.label}</div>
              <div className="mt-1 text-xs text-gray-500">{n(item.count)} units, {money(item.amount || 0)}</div>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${Number(item.changePercent || 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {Number(item.changePercent || 0) >= 0 ? '+' : ''}{pct(item.changePercent || 0)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankedList({ items, valueFormatter }: { items: CountItem[]; valueFormatter: (item: CountItem) => string }) {
  if (!items.length) return <EmptyText>No product data</EmptyText>;
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm">
          <span className="min-w-0 truncate font-medium text-gray-800">{index + 1}. {item.label}</span>
          <span className="shrink-0 font-semibold text-gray-600">{valueFormatter(item)}</span>
        </div>
      ))}
    </div>
  );
}

function CompactMetricGrid({ items }: { items: Array<[string, number]> }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <div className="text-xs font-semibold uppercase text-gray-500">{label}</div>
          <div className="mt-1 text-xl font-bold text-gray-900">{n(value)}</div>
        </div>
      ))}
    </div>
  );
}

function RiskBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-rose-100 bg-rose-50 p-4 text-rose-700">
      <div className="text-xs font-semibold uppercase">{label}</div>
      <div className="mt-2 text-3xl font-bold">{n(value)}</div>
    </div>
  );
}

function SuccessFailureCard({ success, failed, successLabel, failedLabel }: { success: number; failed: number; successLabel: string; failedLabel: string }) {
  const total = success + failed;
  const successRate = total ? (success / total) * 100 : 0;
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-emerald-50 p-4 text-center text-emerald-700">
        <div className="text-3xl font-bold">{pct(successRate)}</div>
        <div className="text-xs font-semibold uppercase">Success Rate</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-emerald-100 px-3 py-2">
          <div className="text-xs font-semibold uppercase text-emerald-700">{successLabel}</div>
          <div className="text-xl font-bold text-gray-900">{n(success)}</div>
        </div>
        <div className="rounded-lg border border-red-100 px-3 py-2">
          <div className="text-xs font-semibold uppercase text-red-700">{failedLabel}</div>
          <div className="text-xl font-bold text-gray-900">{n(failed)}</div>
        </div>
      </div>
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
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-gray-800">{item.label}</span>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-indigo-700">Avg {item.averageScore || 0}</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{n(item.count)}</div>
        </div>
      ))}
    </div>
  );
}

function LeaderAgentPerformance({ groups }: { groups: TeamLeaderAgentGroup[] }) {
  if (!groups.length) return <EmptyText>No agent performance data</EmptyText>;
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id} className="overflow-hidden rounded-lg border border-gray-200">
          <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
            <h3 className="font-bold text-gray-900">{group.name}</h3>
            <span className="text-xs font-semibold uppercase text-gray-500">{n(group.agents.length)} agents</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-white text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-3 text-left">Agent</th>
                  <th className="px-3 py-3 text-right">Assigned Leads</th>
                  <th className="px-3 py-3 text-right">Total Dialed</th>
                  <th className="px-3 py-3 text-right">Connected</th>
                  <th className="px-3 py-3 text-right">Interested</th>
                  <th className="px-3 py-3 text-right">Order Confirmed</th>
                  <th className="px-3 py-3 text-right">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-indigo-50/40">
                    <td className="px-3 py-3 font-semibold text-gray-900">{agent.name}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{n(agent.assignedLeads)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{n(agent.totalDialed)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{n(agent.connectedCustomers)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-amber-700">{n(agent.interestedCustomers)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-indigo-700">{n(agent.orderConfirmed)}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">{pct(agent.conversionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">{row.type}</span>
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

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h4 className={`mb-2 text-xs font-semibold uppercase text-gray-500 ${className}`}>{children}</h4>;
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
      {children}
    </div>
  );
}
