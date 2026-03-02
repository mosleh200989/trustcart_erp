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
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,

} from 'recharts';
import {
  FaCalendarAlt,
  FaShoppingCart,
  FaTruck,
  FaUsers,
  FaChartLine,
  FaDownload,
  FaSyncAlt,
  FaBoxOpen,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,

} from 'react-icons/fa';

/* ========== TYPES ========== */
interface ProductRow {
  productId: number;
  productName: string;
  totalOrders: number;
  totalQty: number;
  totalRevenue: number;
  grossAmount: number;
  steadfastOrders: number;
  pathaoOrders: number;
  redxOrders: number;
  noCourierOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  shippedOrders: number;
}

interface Summary {
  totalOrders: number;
  totalRevenue: number;
  totalDiscount: number;
  avgOrderValue: number;
  pendingOrders: number;
  processingOrders: number;
  approvedOrders: number;
  holdOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  steadfastOrders: number;
  pathaoOrders: number;
  redxOrders: number;
  noCourierOrders: number;
  uniqueCustomers: number;
}

interface HourlyItem {
  hour: number;
  label: string;
  orders: number;
  revenue: number;
}

interface SourceItem {
  source: string;
  orders: number;
  revenue: number;
}

interface CourierStatusItem {
  status: string;
  orders: number;
}

interface SourceProductRow {
  productId: number;
  productName: string;
  totalOrders: number;
  totalQty: number;
  totalRevenue: number;
}

interface DailyReport {
  date: string;
  summary: Summary;
  products: ProductRow[];
  hourly: HourlyItem[];
  orderSources: SourceItem[];
  courierStatuses: CourierStatusItem[];
  landingPageProducts: SourceProductRow[];
  websiteProducts: SourceProductRow[];
}

/* ========== COLORS ========== */
const PALETTE = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  secondary: '#8b5cf6',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  danger: '#ef4444',
  dangerLight: '#f87171',
  info: '#06b6d4',
  infoLight: '#22d3ee',
  purple: '#a855f7',
  pink: '#ec4899',
  orange: '#f97316',
  teal: '#14b8a6',
  slate: '#64748b',
};

const PIE_COLORS = [PALETTE.primary, PALETTE.success, PALETTE.warning, PALETTE.danger, PALETTE.info, PALETTE.purple, PALETTE.pink, PALETTE.orange, PALETTE.teal];

const STATUS_COLORS: Record<string, string> = {
  processing: PALETTE.pink,
  pending: PALETTE.warning,
  approved: PALETTE.info,
  hold: PALETTE.orange,
  shipped: PALETTE.purple,
  delivered: PALETTE.success,
  cancelled: PALETTE.danger,
};

const COURIER_COLORS: Record<string, string> = {
  steadfast: '#2563eb',
  pathao: '#dc2626',
  redx: '#ea580c',
  none: PALETTE.slate,
};

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  admin_panel: 'Admin Panel',
  agent_dashboard: 'Agent Dashboard',
  landing_page: 'Landing Page',
  mobile: 'Mobile App',
  unknown: 'Unknown',
};

/* ========== HELPERS ========== */
const fmt = (n: number) => new Intl.NumberFormat('en-BD').format(n);

/* ========== COMPONENT ========== */
export default function TodaysReportPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<keyof ProductRow>('totalOrders');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReport = useCallback(async (reportDate: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/sales/daily-report?date=${reportDate}`);
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(date);
  }, [date, fetchReport]);

  const handleSort = (key: keyof ProductRow) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedProducts = useMemo(() => {
    if (!data?.products) return [];
    let filtered = data.products;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => p.productName.toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data?.products, sortKey, sortDir, searchTerm]);

  // Chart data preparations
  const statusPieData = useMemo(() => {
    if (!data) return [];
    const s = data.summary;
    return [
      { name: 'Processing', value: s.processingOrders, color: STATUS_COLORS.processing },
      { name: 'Pending', value: s.pendingOrders, color: STATUS_COLORS.pending },
      { name: 'Approved', value: s.approvedOrders, color: STATUS_COLORS.approved },
      { name: 'On Hold', value: s.holdOrders, color: STATUS_COLORS.hold },
      { name: 'Shipped', value: s.shippedOrders, color: STATUS_COLORS.shipped },
      { name: 'Delivered', value: s.deliveredOrders, color: STATUS_COLORS.delivered },
      { name: 'Cancelled', value: s.cancelledOrders, color: STATUS_COLORS.cancelled },
    ].filter((d) => d.value > 0);
  }, [data]);

  const courierPieData = useMemo(() => {
    if (!data) return [];
    const s = data.summary;
    return [
      { name: 'Steadfast', value: s.steadfastOrders, color: COURIER_COLORS.steadfast },
      { name: 'Pathao', value: s.pathaoOrders, color: COURIER_COLORS.pathao },
      { name: 'RedX', value: s.redxOrders, color: COURIER_COLORS.redx },
      { name: 'No Courier', value: s.noCourierOrders, color: COURIER_COLORS.none },
    ].filter((d) => d.value > 0);
  }, [data]);

  const topProducts = useMemo(() => {
    if (!data?.products) return [];
    return [...data.products].sort((a, b) => b.totalQty - a.totalQty).slice(0, 10);
  }, [data]);

  const sourceData = useMemo(() => {
    if (!data?.orderSources) return [];
    return data.orderSources.map((s) => ({
      ...s,
      label: SOURCE_LABELS[s.source] || s.source,
    }));
  }, [data]);

  const handleExportCSV = () => {
    if (!data?.products?.length) return;
    const headers = ['Product Name', 'Total Orders', 'Total Qty', 'Steadfast', 'Pathao', 'RedX', 'No Courier', 'Delivered', 'Cancelled', 'Pending', 'Approved', 'Shipped'];
    const rows = data.products.map((p) => [
      `"${p.productName}"`, p.totalOrders, p.totalQty,
      p.steadfastOrders, p.pathaoOrders, p.redxOrders, p.noCourierOrders,
      p.deliveredOrders, p.cancelledOrders, p.pendingOrders, p.approvedOrders, p.shippedOrders,
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${data.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: keyof ProductRow }) => {
    if (sortKey !== field) return <span className="text-gray-400 ml-1">↕</span>;
    return <span className="text-indigo-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ===== HEADER ===== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <FaChartLine className="text-white" />
              </div>
              Today&apos;s Report
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Product-wise order analytics &amp; performance insights
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-gray-400"
              />
            </div>
            <button
              onClick={() => setDate(new Date().toISOString().slice(0, 10))}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => fetchReport(date)}
              disabled={loading}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!data?.products?.length}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FaDownload /> Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500">Loading report...</span>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* ===== KPI CARDS ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard icon={<FaShoppingCart />} label="Total Orders" value={fmt(data.summary.totalOrders)} color="indigo" />
              <KPICard icon={<FaUsers />} label="Unique Customers" value={fmt(data.summary.uniqueCustomers)} color="violet" />
              <KPICard icon={<FaCheckCircle />} label="Delivered" value={fmt(data.summary.deliveredOrders)} color="green" />
              <KPICard icon={<FaTimesCircle />} label="Cancelled" value={fmt(data.summary.cancelledOrders)} color="red" />
            </div>

            {/* ===== STATUS & COURIER SUMMARY CARDS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Status Mini Cards */}
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-5">
                <h3 className="text-gray-800 font-semibold mb-3 flex items-center gap-2">
                  <FaBoxOpen className="text-indigo-500" /> Order Status Breakdown
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  <MiniStatusCard label="Processing" count={data.summary.processingOrders} total={data.summary.totalOrders} color="pink" />
                  <MiniStatusCard label="On Hold" count={data.summary.holdOrders} total={data.summary.totalOrders} color="orange" />
                  <MiniStatusCard label="Approved" count={data.summary.approvedOrders} total={data.summary.totalOrders} color="cyan" />
                  <MiniStatusCard label="Cancelled" count={data.summary.cancelledOrders} total={data.summary.totalOrders} color="red" />
                </div>
              </div>

              {/* Courier Distribution Mini Cards */}
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-5">
                <h3 className="text-gray-800 font-semibold mb-3 flex items-center gap-2">
                  <FaTruck className="text-blue-500" /> Courier Distribution
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  <MiniStatusCard label="Steadfast" count={data.summary.steadfastOrders} total={data.summary.totalOrders} color="blue" />
                  <MiniStatusCard label="Pathao" count={data.summary.pathaoOrders} total={data.summary.totalOrders} color="red" />
                  <MiniStatusCard label="RedX" count={data.summary.redxOrders} total={data.summary.totalOrders} color="orange" />
                  <MiniStatusCard label="No Courier" count={data.summary.noCourierOrders} total={data.summary.totalOrders} color="slate" />
                </div>
              </div>
            </div>

            {/* ===== PRODUCT-WISE TABLE ===== */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2">
                  <FaBoxOpen className="text-indigo-500" /> Product-wise Sales Breakdown
                  <span className="text-sm text-gray-500 font-normal ml-2">({data.products.length} products)</span>
                </h3>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full md:w-64"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 sticky left-0 bg-gray-50 z-10">#</th>
                      <th
                        className="text-left px-4 py-3 sticky left-8 bg-gray-50 z-10 cursor-pointer hover:text-indigo-600 transition-colors min-w-[200px]"
                        onClick={() => handleSort('productName')}
                      >
                        Product Name <SortIcon field="productName" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('totalOrders')}>
                        Orders <SortIcon field="totalOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('totalQty')}>
                        Qty <SortIcon field="totalQty" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('steadfastOrders')}>
                        <span className="text-blue-600">Steadfast</span> <SortIcon field="steadfastOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('pathaoOrders')}>
                        <span className="text-red-600">Pathao</span> <SortIcon field="pathaoOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('redxOrders')}>
                        <span className="text-orange-600">RedX</span> <SortIcon field="redxOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('noCourierOrders')}>
                        No Courier <SortIcon field="noCourierOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('pendingOrders')}>
                        <span className="text-amber-600">Pending</span> <SortIcon field="pendingOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('approvedOrders')}>
                        <span className="text-cyan-600">Approved</span> <SortIcon field="approvedOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('shippedOrders')}>
                        <span className="text-purple-600">Shipped</span> <SortIcon field="shippedOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('deliveredOrders')}>
                        <span className="text-emerald-600">Delivered</span> <SortIcon field="deliveredOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('cancelledOrders')}>
                        <span className="text-red-600">Cancelled</span> <SortIcon field="cancelledOrders" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="px-4 py-12 text-center text-gray-500">
                          {searchTerm ? 'No products match your search' : 'No product data for this date'}
                        </td>
                      </tr>
                    ) : (
                      sortedProducts.map((p, idx) => (
                        <tr key={p.productId || idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 sticky left-0 bg-white text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium sticky left-8 bg-white max-w-[250px] truncate" title={p.productName}>
                            {p.productName}
                          </td>
                          <td className="px-3 py-3 text-center font-semibold text-gray-900">{p.totalOrders}</td>
                          <td className="px-3 py-3 text-center text-gray-600">{p.totalQty}</td>
                          <td className="px-3 py-3 text-center">
                            <CourierBadge value={p.steadfastOrders} color="blue" />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <CourierBadge value={p.pathaoOrders} color="red" />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <CourierBadge value={p.redxOrders} color="orange" />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <CourierBadge value={p.noCourierOrders} color="gray" />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatusBadge value={p.pendingOrders} color="amber" />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatusBadge value={p.approvedOrders} color="cyan" />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatusBadge value={p.shippedOrders} color="purple" />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatusBadge value={p.deliveredOrders} color="emerald" />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatusBadge value={p.cancelledOrders} color="red" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {sortedProducts.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 font-semibold text-gray-900 border-t-2 border-indigo-200">
                        <td className="px-4 py-3 sticky left-0 bg-gray-50" />
                        <td className="px-4 py-3 sticky left-8 bg-gray-50 text-indigo-600">TOTAL</td>
                        <td className="px-3 py-3 text-center">{sortedProducts.reduce((s, p) => s + p.totalOrders, 0)}</td>
                        <td className="px-3 py-3 text-center">{sortedProducts.reduce((s, p) => s + p.totalQty, 0)}</td>
                        <td className="px-3 py-3 text-center text-blue-600">{sortedProducts.reduce((s, p) => s + p.steadfastOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-red-600">{sortedProducts.reduce((s, p) => s + p.pathaoOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-orange-600">{sortedProducts.reduce((s, p) => s + p.redxOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-gray-500">{sortedProducts.reduce((s, p) => s + p.noCourierOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-amber-600">{sortedProducts.reduce((s, p) => s + p.pendingOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-cyan-600">{sortedProducts.reduce((s, p) => s + p.approvedOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-purple-600">{sortedProducts.reduce((s, p) => s + p.shippedOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-emerald-600">{sortedProducts.reduce((s, p) => s + p.deliveredOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-red-600">{sortedProducts.reduce((s, p) => s + p.cancelledOrders, 0)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ===== LANDING PAGE SALES BREAKDOWN ===== */}
            <SourceProductTable
              title="Landing Page wise Sales Breakdown"
              icon={<FaChartLine className="text-purple-500" />}
              products={data.landingPageProducts}
              emptyMessage="No landing page orders for this date"
            />

            {/* ===== WEBSITE SALES BREAKDOWN ===== */}
            <SourceProductTable
              title="Website wise Sales Breakdown"
              icon={<FaChartLine className="text-teal-500" />}
              products={data.websiteProducts}
              emptyMessage="No website orders for this date"
            />

            {/* ===== CHARTS SECTION ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Orders Area Chart */}
              <ChartCard title="Hourly Order Distribution" subtitle="Orders placed throughout the day">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.hourly} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE.primary} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={PALETTE.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE.success} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={PALETTE.success} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} interval={2} />
                    <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                      labelStyle={{ color: '#6b7280' }}
                    />
                    <Legend wrapperStyle={{ color: '#374151' }} />
                    <Area yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke={PALETTE.primary} fill="url(#gradOrders)" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue (৳)" stroke={PALETTE.success} fill="url(#gradRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Top Products Bar Chart */}
              <ChartCard title="Top 10 Products by Quantity Sold" subtitle="Most sold products by quantity">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="productName"
                      type="category"
                      width={130}
                      stroke="#6b7280"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                    />
                    <Bar dataKey="totalQty" name="Qty Sold" fill={PALETTE.primary} radius={[0, 4, 4, 0]} barSize={18}>
                      {topProducts.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Order Status Pie Chart */}
              <ChartCard title="Order Status Distribution" subtitle="Breakdown by current status">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#6b7280' }}
                    >
                      {statusPieData.map((d, i) => (
                        <Cell key={i} fill={d.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                    />
                    <Legend wrapperStyle={{ color: '#374151' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Courier Distribution Pie Chart */}
              <ChartCard title="Courier Distribution" subtitle="Orders by courier company">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={courierPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#6b7280' }}
                    >
                      {courierPieData.map((d, i) => (
                        <Cell key={i} fill={d.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                    />
                    <Legend wrapperStyle={{ color: '#374151' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Order Source Bar Chart */}
              <ChartCard title="Order Sources" subtitle="Where orders originated from">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sourceData} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                    />
                    <Legend wrapperStyle={{ color: '#374151' }} />
                    <Bar dataKey="orders" name="Orders" fill={PALETTE.primary} radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="revenue" name="Revenue (৳)" fill={PALETTE.success} radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Courier Status Breakdown (if courier data exists) */}
              {data.courierStatuses.length > 0 && (
                <ChartCard title="Courier Status Breakdown" subtitle="Delivery status of shipped orders">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.courierStatuses} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="status" stroke="#6b7280" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                      />
                      <Bar dataKey="orders" name="Orders" fill={PALETTE.info} radius={[4, 4, 0, 0]} barSize={40}>
                        {data.courierStatuses.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

/* ========== SUB-COMPONENTS ========== */

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-600',
    violet: 'bg-violet-50 border-violet-200 text-violet-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
  };
  const classes = colorMap[color] || colorMap.indigo;

  return (
    <div className={`${classes} border rounded-xl p-4`}>
      <div className={`text-lg mb-2 opacity-80`}>{icon}</div>
      <div className="text-gray-900 text-lg md:text-xl font-bold truncate">{value}</div>
      <div className="text-gray-500 text-xs mt-1">{label}</div>
    </div>
  );
}

function MiniStatusCard({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    pink: 'bg-pink-50 text-pink-700 border-pink-200',
  };
  return (
    <div className={`${colorClasses[color] || colorClasses.amber} border rounded-lg p-2 text-center`}>
      <div className="text-lg font-bold">{count}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-[10px] opacity-60 mt-0.5">{pct}%</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <h3 className="text-gray-800 font-semibold">{title}</h3>
        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function CourierBadge({ value, color }: { value: number; color: string }) {
  if (value === 0) return <span className="text-gray-400">—</span>;
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    orange: 'bg-orange-50 text-orange-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color] || colorClasses.gray}`}>
      {value}
    </span>
  );
}

function StatusBadge({ value, color }: { value: number; color: string }) {
  if (value === 0) return <span className="text-gray-400">—</span>;
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    purple: 'bg-purple-50 text-purple-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color] || ''}`}>
      {value}
    </span>
  );
}

function SourceProductTable({
  title,
  icon,
  products,
  emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  products: { productId: number; productName: string; totalOrders: number; totalQty: number; totalRevenue: number }[];
  emptyMessage: string;
}) {
  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2">
          {icon} {title}
          <span className="text-sm text-gray-500 font-normal ml-2">({products.length} products)</span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 w-10">#</th>
              <th className="text-left px-4 py-3 min-w-[200px]">Product Name</th>
              <th className="px-4 py-3 text-center">Orders</th>
              <th className="px-4 py-3 text-center">Qty</th>
              <th className="px-4 py-3 text-right">Revenue (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              products.map((p, idx) => (
                <tr key={p.productId || idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium max-w-[300px] truncate" title={p.productName}>
                    {p.productName}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">{p.totalOrders}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{p.totalQty}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(p.totalRevenue)}</td>
                </tr>
              ))
            )}
          </tbody>
          {products.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold text-gray-900 border-t-2 border-indigo-200">
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-indigo-600">TOTAL</td>
                <td className="px-4 py-3 text-center">{products.reduce((s, p) => s + p.totalOrders, 0)}</td>
                <td className="px-4 py-3 text-center">{products.reduce((s, p) => s + p.totalQty, 0)}</td>
                <td className="px-4 py-3 text-right">{fmt(products.reduce((s, p) => s + p.totalRevenue, 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
