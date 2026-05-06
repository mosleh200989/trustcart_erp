import { useEffect, useState, useCallback, useMemo } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  FaCalendarAlt,
  FaShoppingCart,
  FaUsers,
  FaChartLine,
  FaSyncAlt,
  FaGlobe,
  FaCheckCircle,
  FaTimesCircle,
  FaBoxOpen,
  FaTag,
  FaTrophy,
  FaFilter,
} from 'react-icons/fa';

/* ========== TYPES ========== */
interface LPSummary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  upsellAccepted: number;
  upsellRate: number;
  pendingOrders: number;
  approvedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  uniqueCustomers: number;
}

interface HourlyItem {
  hour: number;
  label: string;
  orders: number;
  revenue: number;
  upsellAccepted: number;
}

interface DailyItem {
  date: string;
  orders: number;
  revenue: number;
  upsellAccepted: number;
}

interface PerPageItem {
  slug: string;
  title: string;
  orders: number;
  revenue: number;
  upsellAccepted: number;
  upsellRate: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

interface TrafficSource {
  source: string;
  orders: number;
  revenue: number;
}

interface StatusBreakdown {
  status: string;
  orders: number;
  revenue: number;
}

interface ProductRow {
  productId: number;
  productName: string;
  totalOrders: number;
  totalQty: number;
  totalRevenue: number;
}

interface LPReport {
  startDate: string;
  endDate: string;
  slug: string | null;
  summary: LPSummary;
  hourly: HourlyItem[];
  daily: DailyItem[];
  perPage: PerPageItem[];
  trafficSources: TrafficSource[];
  statusBreakdown: StatusBreakdown[];
  products: ProductRow[];
}

interface LandingPage {
  id: number;
  title: string;
  slug: string;
}

/* ========== COLORS ========== */
const PALETTE = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#a855f7',
  pink: '#ec4899',
  orange: '#f97316',
  teal: '#14b8a6',
  slate: '#64748b',
};

const PIE_COLORS = [
  PALETTE.primary, PALETTE.success, PALETTE.warning,
  PALETTE.danger, PALETTE.info, PALETTE.purple,
  PALETTE.pink, PALETTE.orange, PALETTE.teal,
];

const STATUS_COLORS: Record<string, string> = {
  pending: PALETTE.warning,
  approved: PALETTE.info,
  processing: PALETTE.pink,
  shipped: PALETTE.purple,
  delivered: PALETTE.success,
  cancelled: PALETTE.danger,
  admin_cancelled: PALETTE.danger,
  returned: PALETTE.orange,
};

/* ========== HELPERS ========== */
const fmt = (n: number) => new Intl.NumberFormat('en-BD').format(Math.round(n));
const fmtDec = (n: number) => new Intl.NumberFormat('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
};

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s;

type ActiveTab = 'overview' | 'hourly' | 'daily' | 'upsell' | 'products' | 'pages';

/* ========== COMPONENT ========== */
export default function LandingPageReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [selectedSlug, setSelectedSlug] = useState('Harbora-kosthogut');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [data, setData] = useState<LPReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productSort, setProductSort] = useState<'totalOrders' | 'totalRevenue' | 'totalQty'>('totalOrders');

  // Fetch landing page list for slug dropdown
  useEffect(() => {
    apiClient.get('/landing-pages?limit=100&fields=id,title,slug')
      .then(res => {
        const rows: LandingPage[] = res.data?.data || res.data || [];
        setLandingPages(rows.filter((p) => p.slug));
      })
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (selectedSlug) params.append('slug', selectedSlug);
      const res = await apiClient.get(`/sales/landing-page-report?${params.toString()}`);
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedSlug]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const sortedProducts = useMemo(() => {
    if (!data?.products) return [];
    let rows = [...data.products];
    if (productSearch.trim()) {
      rows = rows.filter((p) => p.productName.toLowerCase().includes(productSearch.toLowerCase()));
    }
    return rows.sort((a, b) => b[productSort] - a[productSort]);
  }, [data?.products, productSearch, productSort]);

  const upsellPieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Upsell Accepted', value: data.summary.upsellAccepted },
      { name: 'Not Accepted', value: data.summary.totalOrders - data.summary.upsellAccepted },
    ];
  }, [data]);

  const statusPieData = useMemo(() => {
    if (!data) return [];
    return data.statusBreakdown.filter((s) => s.orders > 0).map((s) => ({
      name: capitalize(s.status),
      value: s.orders,
    }));
  }, [data]);

  const TABS: { id: ActiveTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'hourly', label: 'Hourly' },
    { id: 'daily', label: 'Daily Trend' },
    { id: 'upsell', label: 'Upsell Analysis' },
    { id: 'products', label: 'Products' },
    { id: 'pages', label: 'Per Page' },
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaGlobe className="text-indigo-500" />
              Landing Page Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">Herbolin.com &amp; all landing page analytics</p>
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FaCalendarAlt className="text-indigo-400" /> From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FaCalendarAlt className="text-indigo-400" /> To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FaFilter className="text-indigo-400" /> Landing Page
              </label>
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Landing Pages</option>
                <option value="Harbora-kosthogut">herbolin.com (Harbora-kosthogut)</option>
                {landingPages
                  .filter((p) => p.slug !== 'Harbora-kosthogut')
                  .map((p) => (
                    <option key={p.id} value={p.slug}>{p.title} ({p.slug})</option>
                  ))}
              </select>
            </div>
            {/* Quick range buttons */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Today', start: today, end: today },
                { label: '7 Days', start: weekAgo, end: today },
                { label: '30 Days', start: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), end: today },
              ].map(({ label, start, end }) => (
                <button
                  key={label}
                  onClick={() => { setStartDate(start); setEndDate(end); }}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    startDate === start && endDate === end
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        )}

        {!loading && data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { icon: FaShoppingCart, label: 'Total Orders', value: fmt(data.summary.totalOrders), color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                { icon: FaChartLine, label: 'Total Revenue', value: '৳' + fmt(data.summary.totalRevenue), color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                { icon: FaTag, label: 'Avg Order Value', value: '৳' + fmt(data.summary.avgOrderValue), color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                { icon: FaTrophy, label: 'Upsell Rate', value: data.summary.upsellRate + '%', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                { icon: FaCheckCircle, label: 'Delivered', value: fmt(data.summary.deliveredOrders), color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                { icon: FaUsers, label: 'Unique Customers', value: fmt(data.summary.uniqueCustomers), color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm`}>
                  <div className={`${color} text-2xl mb-2`}><Icon /></div>
                  <div className="text-xl font-bold text-gray-800 dark:text-white">{value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Order Status Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[
                { label: 'Pending', value: data.summary.pendingOrders, color: 'text-yellow-600' },
                { label: 'Approved', value: data.summary.approvedOrders, color: 'text-blue-500' },
                { label: 'Shipped', value: data.summary.shippedOrders, color: 'text-purple-600' },
                { label: 'Delivered', value: data.summary.deliveredOrders, color: 'text-green-600' },
                { label: 'Cancelled', value: data.summary.cancelledOrders, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className={`font-bold text-sm ${color}`}>{fmt(value)}</span>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 md:p-6">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Upsell Pie */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Upsell (Thank You Offer) Acceptance</h3>
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie
                              data={upsellPieData}
                              cx="50%" cy="50%"
                              innerRadius={60} outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              <Cell fill={PALETTE.purple} />
                              <Cell fill={PALETTE.slate} />
                            </Pie>
                            <Tooltip formatter={(v: number | undefined) => [fmt(v ?? 0), 'Orders']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Order Status Pie */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Order Status Breakdown</h3>
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie
                              data={statusPieData}
                              cx="50%" cy="50%"
                              innerRadius={60} outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {statusPieData.map((entry, index) => (
                                <Cell
                                  key={entry.name}
                                  fill={STATUS_COLORS[entry.name.toLowerCase().replace(/ /g, '_')] || PIE_COLORS[index % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number | undefined) => [fmt(v ?? 0), 'Orders']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Traffic Sources */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Traffic Sources</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data.trafficSources} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number | undefined, name: string | undefined) => [name === 'revenue' ? '৳' + fmt(v ?? 0) : fmt(v ?? 0), name === 'revenue' ? 'Revenue' : 'Orders']} />
                          <Legend />
                          <Bar dataKey="orders" name="Orders" fill={PALETTE.primary} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="revenue" name="Revenue (৳)" fill={PALETTE.teal} radius={[4, 4, 0, 0]} yAxisId={1} hide />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* HOURLY TAB */}
                {activeTab === 'hourly' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Hourly distribution. For multi-day ranges, this aggregates across all days.</p>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={data.hourly} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v: number | undefined, name: string | undefined) => [
                            name === 'Revenue' ? '৳' + fmt(v ?? 0) : fmt(v ?? 0),
                            name ?? '',
                          ]}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="orders" name="Orders" fill={PALETTE.primary} radius={[3, 3, 0, 0]} />
                        <Bar yAxisId="left" dataKey="upsellAccepted" name="Upsell Accepted" fill={PALETTE.purple} radius={[3, 3, 0, 0]} />
                        <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill={PALETTE.teal} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Hourly table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-3">Hour</th>
                            <th className="px-4 py-3 text-right">Orders</th>
                            <th className="px-4 py-3 text-right">Revenue</th>
                            <th className="px-4 py-3 text-right">Upsells</th>
                            <th className="px-4 py-3 text-right">Upsell Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {data.hourly.filter((h) => h.orders > 0).map((h) => (
                            <tr key={h.hour} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">{h.label}</td>
                              <td className="px-4 py-2 text-right">{fmt(h.orders)}</td>
                              <td className="px-4 py-2 text-right text-green-600">৳{fmt(h.revenue)}</td>
                              <td className="px-4 py-2 text-right text-purple-600">{fmt(h.upsellAccepted)}</td>
                              <td className="px-4 py-2 text-right">
                                {h.orders > 0 ? Math.round((h.upsellAccepted / h.orders) * 100) : 0}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* DAILY TREND TAB */}
                {activeTab === 'daily' && (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={data.daily} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={PALETTE.primary} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={PALETTE.primary} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={PALETTE.teal} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={PALETTE.teal} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="upsellGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={PALETTE.purple} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={PALETTE.purple} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                        <Tooltip
                          labelFormatter={(l) => l}
                          formatter={(v: number | undefined, name: string | undefined) => [
                            name === 'Revenue' ? '৳' + fmt(v ?? 0) : fmt(v ?? 0),
                            name ?? '',
                          ]}
                        />
                        <Legend />
                        <Area yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke={PALETTE.primary} fill="url(#ordersGrad)" strokeWidth={2} />
                        <Area yAxisId="left" type="monotone" dataKey="upsellAccepted" name="Upsell Accepted" stroke={PALETTE.purple} fill="url(#upsellGrad)" strokeWidth={2} />
                        <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke={PALETTE.teal} fill="url(#revenueGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>

                    {/* Daily table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3 text-right">Orders</th>
                            <th className="px-4 py-3 text-right">Revenue</th>
                            <th className="px-4 py-3 text-right">Upsells</th>
                            <th className="px-4 py-3 text-right">Upsell Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {[...data.daily].reverse().map((d) => (
                            <tr key={d.date} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">{d.date}</td>
                              <td className="px-4 py-2 text-right">{fmt(d.orders)}</td>
                              <td className="px-4 py-2 text-right text-green-600">৳{fmt(d.revenue)}</td>
                              <td className="px-4 py-2 text-right text-purple-600">{fmt(d.upsellAccepted)}</td>
                              <td className="px-4 py-2 text-right">
                                {d.orders > 0 ? Math.round((d.upsellAccepted / d.orders) * 100) : 0}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-700 font-semibold">
                          <tr>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-200">Total</td>
                            <td className="px-4 py-2 text-right">{fmt(data.summary.totalOrders)}</td>
                            <td className="px-4 py-2 text-right text-green-600">৳{fmt(data.summary.totalRevenue)}</td>
                            <td className="px-4 py-2 text-right text-purple-600">{fmt(data.summary.upsellAccepted)}</td>
                            <td className="px-4 py-2 text-right">{data.summary.upsellRate}%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* UPSELL ANALYSIS TAB */}
                {activeTab === 'upsell' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                        <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{fmt(data.summary.upsellAccepted)}</div>
                        <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">Upsells Accepted</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                        <div className="text-3xl font-bold text-gray-700 dark:text-gray-200">
                          {fmt(data.summary.totalOrders - data.summary.upsellAccepted)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upsells Declined</div>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
                        <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{data.summary.upsellRate}%</div>
                        <div className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">Upsell Acceptance Rate</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Upsell acceptance pie */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Acceptance vs Decline</h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={upsellPieData}
                              cx="50%" cy="50%"
                              outerRadius={100}
                              dataKey="value"
                              label={({ name, value, percent }) => `${name}: ${fmt(value)} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                            >
                              <Cell fill={PALETTE.purple} />
                              <Cell fill={PALETTE.slate} />
                            </Pie>
                            <Tooltip formatter={(v: number | undefined) => [fmt(v ?? 0), 'Orders']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Upsell trend over days */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Daily Upsell Trend</h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <LineChart data={data.daily} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip labelFormatter={(l) => l} formatter={(v: number | undefined, name: string | undefined) => [fmt(v ?? 0), name ?? '']} />
                            <Legend />
                            <Line type="monotone" dataKey="orders" name="Total Orders" stroke={PALETTE.primary} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="upsellAccepted" name="Upsell Accepted" stroke={PALETTE.purple} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* PRODUCTS TAB */}
                {activeTab === 'products' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
                      />
                      <select
                        value={productSort}
                        onChange={(e) => setProductSort(e.target.value as typeof productSort)}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="totalOrders">Sort by Orders</option>
                        <option value="totalRevenue">Sort by Revenue</option>
                        <option value="totalQty">Sort by Quantity</option>
                      </select>
                    </div>

                    {/* Product chart */}
                    {sortedProducts.length > 0 && (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={sortedProducts.slice(0, 10)}
                          margin={{ top: 0, right: 10, left: 0, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="productName"
                            tick={{ fontSize: 10 }}
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number | undefined, name: string | undefined) => [name === 'Revenue' ? '৳' + fmt(v ?? 0) : fmt(v ?? 0), name ?? '']} />
                          <Legend />
                          <Bar dataKey="totalOrders" name="Orders" fill={PALETTE.primary} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="totalQty" name="Qty Sold" fill={PALETTE.teal} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3 text-right">Orders</th>
                            <th className="px-4 py-3 text-right">Qty Sold</th>
                            <th className="px-4 py-3 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {sortedProducts.map((p, idx) => (
                            <tr key={p.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">{p.productName}</td>
                              <td className="px-4 py-2 text-right">{fmt(p.totalOrders)}</td>
                              <td className="px-4 py-2 text-right">{fmt(p.totalQty)}</td>
                              <td className="px-4 py-2 text-right text-green-600">৳{fmt(p.totalRevenue)}</td>
                            </tr>
                          ))}
                          {sortedProducts.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No products found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* PER PAGE TAB */}
                {activeTab === 'pages' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Breakdown by landing page slug (utm_source)</p>

                    {data.perPage.length > 0 && (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={data.perPage.slice(0, 10)}
                          margin={{ top: 0, right: 10, left: 0, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="slug"
                            tick={{ fontSize: 10 }}
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number | undefined, name: string | undefined) => [(name ?? '').includes('Revenue') ? '৳' + fmt(v ?? 0) : fmt(v ?? 0), name ?? '']} />
                          <Legend />
                          <Bar dataKey="orders" name="Orders" fill={PALETTE.primary} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="upsellAccepted" name="Upsell Accepted" fill={PALETTE.purple} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-3">Landing Page</th>
                            <th className="px-4 py-3">Slug</th>
                            <th className="px-4 py-3 text-right">Orders</th>
                            <th className="px-4 py-3 text-right">Revenue</th>
                            <th className="px-4 py-3 text-right">Upsells</th>
                            <th className="px-4 py-3 text-right">Upsell Rate</th>
                            <th className="px-4 py-3 text-right">Delivered</th>
                            <th className="px-4 py-3 text-right">Cancelled</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {data.perPage.map((p) => (
                            <tr key={p.slug} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200 max-w-[140px] truncate" title={p.title}>{p.title}</td>
                              <td className="px-4 py-2 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.slug}</td>
                              <td className="px-4 py-2 text-right">{fmt(p.orders)}</td>
                              <td className="px-4 py-2 text-right text-green-600">৳{fmt(p.revenue)}</td>
                              <td className="px-4 py-2 text-right text-purple-600">{fmt(p.upsellAccepted)}</td>
                              <td className="px-4 py-2 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.upsellRate >= 30 ? 'bg-green-100 text-green-700' : p.upsellRate >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                  {p.upsellRate}%
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right text-green-600">{fmt(p.deliveredOrders)}</td>
                              <td className="px-4 py-2 text-right text-red-500">{fmt(p.cancelledOrders)}</td>
                            </tr>
                          ))}
                          {data.perPage.length === 0 && (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No data for this period</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!loading && !data && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FaBoxOpen className="text-5xl mb-3" />
            <p>No data available. Try changing the date range or filters.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
