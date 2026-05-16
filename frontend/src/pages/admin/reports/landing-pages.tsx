import { useEffect, useState, useCallback, useMemo } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { addDhakaDays, getDhakaDateString } from '@/utils/dhakaDate';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  FaCalendarAlt,
  FaShoppingCart,
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
  upsellAccepted: number;
  upsellRate: number;
  crossSellQty: number;
  crossSellOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  cancelledReturnedOrders?: number;
  rejectedOrders?: number;
}

interface HourlyItem {
  hour: number;
  label: string;
  orders: number;
  upsellAccepted: number;
  crossSellQty: number;
  crossSellOrders: number;
}

interface DailyItem {
  date: string;
  orders: number;
  upsellAccepted: number;
  crossSellQty: number;
  crossSellOrders: number;
}

interface PerPageItem {
  slug: string;
  title: string;
  orders: number;
  upsellAccepted: number;
  upsellRate: number;
  crossSellQty: number;
  crossSellOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  cancelledReturnedOrders?: number;
  rejectedOrders?: number;
}

interface StatusBreakdown {
  status: string;
  orders: number;
}

interface ProductRow {
  productId: number;
  productName: string;
  totalOrders: number;
  totalQty: number;
}

interface LPReport {
  startDate: string;
  endDate: string;
  slug: string | null;
  summary: LPSummary;
  hourly: HourlyItem[];
  daily: DailyItem[];
  perPage: PerPageItem[];
  statusBreakdown: StatusBreakdown[];
  products: ProductRow[];
  crossSellProducts: ProductRow[];
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
  rejected: PALETTE.danger,
  returned: PALETTE.orange,
};

/* ========== HELPERS ========== */
const fmt = (n: number) => new Intl.NumberFormat('en-BD').format(Math.round(n));
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s;
const statusLabel = (s: string) => s === 'admin_cancelled' ? 'Rejected' : capitalize(s);

type ActiveTab = 'overview' | 'hourly' | 'products';

/* ========== COMPONENT ========== */
export default function LandingPageReportsPage() {
  const today = getDhakaDateString();
  const weekAgo = addDhakaDays(-6);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedSlug, setSelectedSlug] = useState('Harbora-kosthogut');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [data, setData] = useState<LPReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productSort, setProductSort] = useState<'totalOrders' | 'totalQty'>('totalOrders');

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
    if (!data?.crossSellProducts) return [];
    let rows = [...data.crossSellProducts];
    if (productSearch.trim()) {
      rows = rows.filter((p) => p.productName.toLowerCase().includes(productSearch.toLowerCase()));
    }
    return rows.sort((a, b) => b[productSort] - a[productSort]);
  }, [data?.crossSellProducts, productSearch, productSort]);

  const rejectedOrders = useMemo(() => {
    if (!data) return 0;
    return data.summary.rejectedOrders ?? data.statusBreakdown.find((s) => s.status === 'admin_cancelled')?.orders ?? 0;
  }, [data]);

  const cancelledReturnedOrders = useMemo(() => {
    if (!data) return 0;
    return data.summary.cancelledReturnedOrders ?? Math.max(data.summary.cancelledOrders - rejectedOrders, 0);
  }, [data, rejectedOrders]);

  const upsellPieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Upsell Accepted', value: data.summary.upsellAccepted },
      { name: 'Not Accepted', value: data.summary.totalOrders - data.summary.upsellAccepted },
    ];
  }, [data]);

  const crossSellPieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Cross-Sell Orders', value: data.summary.crossSellOrders },
      { name: 'Without Cross-Sell', value: Math.max(data.summary.totalOrders - data.summary.crossSellOrders, 0) },
    ];
  }, [data]);

  const statusPieData = useMemo(() => {
    if (!data) return [];
    return data.statusBreakdown.filter((s) => s.orders > 0).map((s) => ({
      name: statusLabel(s.status),
      value: s.orders,
    }));
  }, [data]);

  const TABS: { id: ActiveTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'hourly', label: 'Hourly' },
    { id: 'products', label: 'Products' },
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
                { label: '30 Days', start: addDhakaDays(-29), end: today },
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
                { icon: FaTag, label: 'Cross Sell Qty', value: fmt(data.summary.crossSellQty), color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' },
                { icon: FaTrophy, label: 'Upsell Qty', value: fmt(data.summary.upsellAccepted), color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                { icon: FaCheckCircle, label: 'Delivered', value: fmt(data.summary.deliveredOrders), color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                { icon: FaTimesCircle, label: 'Cancelled / Returned', value: fmt(cancelledReturnedOrders), color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                { icon: FaTimesCircle, label: 'Rejected', value: fmt(rejectedOrders), color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm`}>
                  <div className={`${color} text-2xl mb-2`}><Icon /></div>
                  <div className="text-xl font-bold text-gray-800 dark:text-white">{value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Order Status Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Pending', value: data.summary.pendingOrders, color: 'text-yellow-600' },
                { label: 'Approved', value: data.summary.approvedOrders, color: 'text-blue-500' },
                { label: 'Shipped', value: data.summary.shippedOrders, color: 'text-purple-600' },
                { label: 'Delivered', value: data.summary.deliveredOrders, color: 'text-green-600' },
                { label: 'Cancelled / Returned', value: cancelledReturnedOrders, color: 'text-red-500' },
                { label: 'Rejected', value: rejectedOrders, color: 'text-rose-600' },
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
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      {/* Upsell Pie */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Upsell Quantity</h3>
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

                      {/* Cross-sell Pie */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Cross-Sell Orders</h3>
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie
                              data={crossSellPieData}
                              cx="50%" cy="50%"
                              innerRadius={60} outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              <Cell fill={PALETTE.pink} />
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
                        <Tooltip formatter={(v: number | undefined, name: string | undefined) => [fmt(v ?? 0), name ?? '']} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="orders" name="Orders" fill={PALETTE.primary} radius={[3, 3, 0, 0]} />
                        <Bar yAxisId="left" dataKey="upsellAccepted" name="Upsell Accepted" fill={PALETTE.purple} radius={[3, 3, 0, 0]} />
                        <Bar yAxisId="left" dataKey="crossSellQty" name="Cross-Sell Qty" fill={PALETTE.pink} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Hourly table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-3">Hour</th>
                            <th className="px-4 py-3 text-right">Orders</th>
                            <th className="px-4 py-3 text-right">Upsells</th>
                            <th className="px-4 py-3 text-right">Cross-Sell Qty</th>
                            <th className="px-4 py-3 text-right">Upsell Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {data.hourly.filter((h) => h.orders > 0).map((h) => (
                            <tr key={h.hour} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">{h.label}</td>
                              <td className="px-4 py-2 text-right">{fmt(h.orders)}</td>
                              <td className="px-4 py-2 text-right text-purple-600">{fmt(h.upsellAccepted)}</td>
                              <td className="px-4 py-2 text-right text-pink-600">{fmt(h.crossSellQty)}</td>
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
                {/* PRODUCTS TAB */}
                {activeTab === 'products' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Search cross-sell products..."
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
                        <option value="totalQty">Sort by Quantity</option>
                      </select>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3 text-right">Cross-Sell Orders</th>
                            <th className="px-4 py-3 text-right">Cross-Sell Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {sortedProducts.map((p, idx) => (
                            <tr key={p.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">{p.productName}</td>
                              <td className="px-4 py-2 text-right">{fmt(p.totalOrders)}</td>
                              <td className="px-4 py-2 text-right">{fmt(p.totalQty)}</td>
                            </tr>
                          ))}
                          {sortedProducts.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No cross-sell products found</td>
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
