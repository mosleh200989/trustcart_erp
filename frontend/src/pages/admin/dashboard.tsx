import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDhakaDate, formatDhakaDateTime } from '@/utils/dhakaDate';
import {
  Activity,
  ArrowRight,
  Boxes,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock3,
  Headphones,
  LayoutDashboard,
  PackageCheck,
  PhoneCall,
  RefreshCw,
  ShoppingCart,
  TriangleAlert,
  Truck,
  UsersRound,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Summary = {
  totalOrders: number;
  ordersToday: number;
  ordersYesterday: number;
  ordersThisMonth: number;
  ordersPreviousMonth: number;
  pendingOrders: number;
  approvedOrders: number;
  sentOrders: number;
  deliveredThisMonth: number;
  adminCancelledThisMonth: number;
  cancelledReturnedThisMonth: number;
  activeProducts: number;
  lowStockProducts: number;
  fulfillmentRate: number;
  deliveredShare: number;
};

type DashboardData = {
  generatedAt: string;
  summary: Summary;
  trend: Array<{ date: string; orders: number; delivered: number }>;
  statuses: Array<{ status: string; count: number }>;
  sources: Array<{ source: string; count: number }>;
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    customerName: string | null;
    customerPhone: string | null;
    amount: number;
    status: string;
    source: string | null;
    orderDate: string | null;
    createdAt: string;
  }>;
};

type QuickAction = {
  label: string;
  detail: string;
  href: string;
  icon: typeof ShoppingCart;
  permission?: string;
  tone: string;
};

const numberFormatter = new Intl.NumberFormat('en-BD');
const moneyFormatter = new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 });

function number(value: unknown) {
  return numberFormatter.format(Number(value) || 0);
}

function money(value: unknown) {
  return `৳${moneyFormatter.format(Number(value) || 0)}`;
}

function percentageChange(current: number, previous: number) {
  if (!previous) return current ? 'New activity' : 'No change';
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
}

function statusTone(status: string) {
  const normalized = String(status || '').toLowerCase().replace(/_/g, ' ');
  if (normalized === 'delivered') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
  if (normalized === 'partial delivered') return 'bg-lime-50 text-lime-700 ring-lime-600/20';
  if (normalized === 'approved' || normalized === 'sent') return 'bg-blue-50 text-blue-700 ring-blue-600/20';
  if (normalized === 'pending' || normalized === 'processing') return 'bg-amber-50 text-amber-700 ring-amber-600/20';
  if (normalized.includes('cancel') || normalized.includes('reject') || normalized === 'returned') {
    return 'bg-red-50 text-red-700 ring-red-600/20';
  }
  return 'bg-gray-100 text-gray-700 ring-gray-500/20';
}

function sourceLabel(source: string | null) {
  const normalized = String(source || '').toLowerCase();
  if (normalized === 'landing_page') return 'Landing Page';
  if (normalized === 'website') return 'Website';
  if (normalized === 'admin_panel' || normalized === 'agent_dashboard') return 'Admin / Agent';
  return source || 'Other';
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof ShoppingCart;
  accent: string;
  loading: boolean;
}) {
  return (
    <div className="min-h-[142px] rounded-lg border border-gray-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
          {loading ? (
            <div className="mt-4 h-9 w-28 animate-pulse rounded bg-gray-100" />
          ) : (
            <p className="mt-3 text-3xl font-bold text-gray-950">{value}</p>
          )}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent}`}>
          <Icon aria-hidden="true" size={21} strokeWidth={2} />
        </div>
      </div>
      <p className="mt-4 truncate text-xs font-medium text-gray-500">{loading ? 'Refreshing data...' : detail}</p>
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-6 text-center">
      <Activity className="mb-3 text-gray-300" size={28} />
      <p className="text-sm font-medium text-gray-500">{children}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, hasPermission, isLoading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [supportStats, setSupportStats] = useState<any>(null);
  const [telephonyStats, setTelephonyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [overviewResult, supportResult, telephonyResult] = await Promise.allSettled([
        apiClient.get('/sales/dashboard-overview'),
        apiClient.get('/support/stats?rangeDays=30'),
        apiClient.get('/telephony/stats?rangeDays=30'),
      ]);

      if (overviewResult.status === 'fulfilled') {
        setDashboard(overviewResult.value.data);
      } else {
        setError(
          overviewResult.reason?.response?.data?.message
            || overviewResult.reason?.message
            || 'The dashboard could not be refreshed.',
        );
      }

      setSupportStats(supportResult.status === 'fulfilled' ? supportResult.value.data : null);
      setTelephonyStats(telephonyResult.status === 'fulfilled' ? telephonyResult.value.data : null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void loadDashboard();
  }, [authLoading, loadDashboard, user]);

  const summary = dashboard?.summary;
  const maxStatusCount = Math.max(1, ...(dashboard?.statuses || []).map((item) => Number(item.count) || 0));
  const maxSourceCount = Math.max(1, ...(dashboard?.sources || []).map((item) => Number(item.count) || 0));

  const trendData = useMemo(() => (
    (dashboard?.trend || []).map((item) => ({
      ...item,
      label: formatDhakaDate(item.date, 'en-GB', { weekday: 'short' }),
      fullLabel: formatDhakaDate(item.date, 'en-GB', { day: '2-digit', month: 'short' }),
    }))
  ), [dashboard?.trend]);

  const quickActions: QuickAction[] = [
    { label: 'Orders', detail: 'Manage order flow', href: '/admin/sales', icon: ShoppingCart, permission: 'view-sales-orders', tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Customers', detail: 'Open customer records', href: '/admin/customers', icon: UsersRound, permission: 'view-customers', tone: 'bg-blue-50 text-blue-700' },
    { label: 'Products', detail: 'Manage the catalogue', href: '/admin/products', icon: Boxes, permission: 'view-products', tone: 'bg-orange-50 text-orange-700' },
    { label: 'Reports', detail: 'Review performance', href: '/admin/reports/dashboard', icon: ChartNoAxesCombined, permission: 'view-reports-dashboard', tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Inventory', detail: 'Check stock health', href: '/admin/inventory', icon: PackageCheck, permission: 'view-inventory', tone: 'bg-violet-50 text-violet-700' },
    { label: 'Check In / Out', detail: 'Manage your presence', href: '/admin/presence', icon: Clock3, tone: 'bg-gray-100 text-gray-700' },
  ];

  const visibleQuickActions = quickActions.filter((item) => !item.permission || hasPermission(item.permission));
  const currentHour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    hour12: false,
  }).format(new Date()));
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';

  return (
    <AdminLayout>
      <div className="space-y-5 pb-8">
        <section className="overflow-hidden rounded-lg border border-[#285949] bg-[#326b58] text-white shadow-[0_14px_36px_rgba(25,69,55,0.16)]">
          <div className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white sm:flex">
                <LayoutDashboard size={23} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-50">{greeting}, {firstName}</p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Business overview</h1>
                <p className="mt-1 text-sm text-emerald-50/80">
                  {formatDhakaDate(new Date(), 'en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {dashboard?.generatedAt && (
                <p className="text-xs text-emerald-50/80">
                  Updated {formatDhakaDateTime(dashboard.generatedAt, 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              <button
                type="button"
                onClick={() => void loadDashboard(true)}
                disabled={refreshing}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/30 bg-white px-4 text-sm font-semibold text-[#285949] shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} aria-hidden="true" />
                Refresh
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-white/15 sm:grid-cols-4">
            {[
              ['Month orders', number(summary?.ordersThisMonth)],
              ['Delivered', number(summary?.deliveredThisMonth)],
              ['Admin Cancelled', number(summary?.adminCancelledThisMonth)],
              ['Fulfillment', `${Number(summary?.fulfillmentRate || 0).toFixed(1)}%`],
            ].map(([label, value]) => (
              <div key={label} className="border-r border-white/15 px-5 py-4 last:border-r-0">
                <p className="text-xs font-medium uppercase text-emerald-50/75">{label}</p>
                <p className="mt-1 text-xl font-bold">{loading ? '—' : value}</p>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            <TriangleAlert className="mt-0.5 shrink-0" size={17} />
            <span>{error} The last available figures remain visible.</span>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Orders Today"
            value={number(summary?.ordersToday)}
            detail={`${percentageChange(Number(summary?.ordersToday || 0), Number(summary?.ordersYesterday || 0))} vs yesterday`}
            icon={ShoppingCart}
            accent="bg-emerald-50 text-emerald-700"
            loading={loading}
          />
          <MetricCard
            label="Delivered This Month"
            value={number(summary?.deliveredThisMonth)}
            detail={`${Number(summary?.deliveredShare || 0).toFixed(1)}% of this month's orders`}
            icon={PackageCheck}
            accent="bg-blue-50 text-blue-700"
            loading={loading}
          />
          <MetricCard
            label="Pending Queue"
            value={number(summary?.pendingOrders)}
            detail={`${number(summary?.approvedOrders)} approved · ${number(summary?.sentOrders)} sent`}
            icon={Truck}
            accent="bg-amber-50 text-amber-700"
            loading={loading}
          />
          <MetricCard
            label="Active Products"
            value={number(summary?.activeProducts)}
            detail={`${number(summary?.lowStockProducts)} products at low stock`}
            icon={Boxes}
            accent="bg-orange-50 text-orange-700"
            loading={loading}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)] xl:col-span-2">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ChartNoAxesCombined size={18} className="text-emerald-700" />
                  <h2 className="text-base font-bold text-gray-950">Seven-day sales pulse</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">Daily orders and deliveries in Dhaka time</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
                <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Orders</span>
                <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Delivered</span>
              </div>
            </div>
            <div className="h-[280px] w-full">
              {loading ? (
                <div className="h-full animate-pulse rounded-lg bg-gray-50" />
              ) : trendData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis yAxisId="orders" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis yAxisId="delivered" orientation="right" hide />
                    <Tooltip
                      cursor={{ stroke: '#d1d5db', strokeDasharray: '4 4' }}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 12px 30px rgba(15,23,42,.10)' }}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                      formatter={(value: number | undefined, name: string | undefined) => [number(value), name || 'Value']}
                    />
                    <Area yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#059669" fill="#d1fae5" fillOpacity={0.65} strokeWidth={2.5} activeDot={{ r: 4 }} />
                    <Area yAxisId="delivered" type="monotone" dataKey="delivered" name="Delivered" stroke="#2563eb" fill="#dbeafe" fillOpacity={0.35} strokeWidth={2} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState>No order activity is available for this week.</EmptyState>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-blue-700" />
              <h2 className="text-base font-bold text-gray-950">Order health</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">Current month status distribution</p>

            <div className="mt-6 space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-9 animate-pulse rounded bg-gray-100" />)
              ) : dashboard?.statuses?.length ? (
                dashboard.statuses.slice(0, 6).map((item) => {
                  const width = Math.max(4, (Number(item.count) / maxStatusCount) * 100);
                  return (
                    <div key={item.status}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-gray-700">{item.status}</span>
                        <span className="font-bold text-gray-950">{number(item.count)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState>No status data is available.</EmptyState>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-gray-100 pt-5">
              <div className="rounded-lg bg-emerald-50 p-3">
                <CheckCircle2 size={16} className="text-emerald-700" />
                <p className="mt-2 text-lg font-bold text-emerald-900">{Number(summary?.fulfillmentRate || 0).toFixed(1)}%</p>
                <p className="text-xs font-medium text-emerald-700">Fulfillment rate</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <TriangleAlert size={16} className="text-red-700" />
                <p className="mt-2 text-lg font-bold text-red-900">{number(summary?.cancelledReturnedThisMonth)}</p>
                <p className="text-xs font-medium text-red-700">Cancelled + returned</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)] xl:col-span-2">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-950">Recent orders</h2>
                <p className="mt-0.5 text-sm text-gray-500">Latest activity across every sales source</p>
              </div>
              {hasPermission('view-sales-orders') && (
                <Link href="/admin/sales" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                  View all <ArrowRight size={15} />
                </Link>
              )}
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase text-gray-500">
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}><td colSpan={5} className="px-5 py-3"><div className="h-10 animate-pulse rounded bg-gray-50" /></td></tr>
                    ))
                  ) : dashboard?.recentOrders?.length ? (
                    dashboard.recentOrders.map((order) => (
                      <tr key={order.id} className="transition hover:bg-emerald-50/40">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#12372a] text-xs font-bold text-white">
                              {(order.customerName || 'C').trim().charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate text-sm font-semibold text-gray-900">{order.customerName || 'Guest customer'}</p>
                              <p className="text-xs text-gray-500">{order.customerPhone || 'No phone'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-gray-800">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">{formatDhakaDate(order.orderDate || order.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">{sourceLabel(order.source)}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusTone(order.status)}`}>
                            {String(order.status || 'Unknown').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm font-bold text-gray-950">{money(order.amount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5}><EmptyState>No recent orders were found.</EmptyState></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
              <h2 className="text-base font-bold text-gray-950">Order sources</h2>
              <p className="mt-1 text-sm text-gray-500">Where this month&apos;s orders started</p>
              <div className="mt-5 space-y-4">
                {dashboard?.sources?.length ? dashboard.sources.map((item, index) => {
                  const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-orange-500', 'bg-gray-500'];
                  const width = Math.max(4, (Number(item.count) / maxSourceCount) * 100);
                  return (
                    <div key={item.source}>
                      <div className="mb-1.5 flex justify-between gap-3 text-sm">
                        <span className="font-medium text-gray-700">{item.source}</span>
                        <span className="font-bold text-gray-950">{number(item.count)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className={`h-full rounded-full ${colors[index % colors.length]}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                }) : <p className="py-5 text-center text-sm text-gray-500">No source data available.</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <Headphones size={18} className="text-blue-700" />
                <p className="mt-3 text-2xl font-bold text-gray-950">{supportStats?.totalOpen != null ? number(supportStats.totalOpen) : '—'}</p>
                <p className="text-xs font-medium text-gray-500">Open tickets</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <PhoneCall size={18} className="text-orange-600" />
                <p className="mt-3 text-2xl font-bold text-gray-950">{telephonyStats?.total != null ? number(telephonyStats.total) : '—'}</p>
                <p className="text-xs font-medium text-gray-500">Calls · 30 days</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center gap-2">
            <LayoutDashboard size={18} className="text-emerald-700" />
            <div>
              <h2 className="text-base font-bold text-gray-950">Quick access</h2>
              <p className="text-sm text-gray-500">Shortcuts based on your current permissions</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {visibleQuickActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-h-[92px] items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-sm"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-gray-900 group-hover:text-emerald-800">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{item.detail}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
