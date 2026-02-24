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
  FaMoneyBillWave,
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
  approvedOrders: number;
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

interface DailyReport {
  date: string;
  summary: Summary;
  products: ProductRow[];
  hourly: HourlyItem[];
  orderSources: SourceItem[];
  courierStatuses: CourierStatusItem[];
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
  pending: PALETTE.warning,
  approved: PALETTE.info,
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
const fmtCurrency = (n: number) => `৳${new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;

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
      { name: 'Pending', value: s.pendingOrders, color: STATUS_COLORS.pending },
      { name: 'Approved', value: s.approvedOrders, color: STATUS_COLORS.approved },
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
    return [...data.products].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);
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
    const headers = ['Product Name', 'Total Orders', 'Total Qty', 'Revenue', 'Steadfast', 'Pathao', 'RedX', 'No Courier', 'Delivered', 'Cancelled', 'Pending', 'Approved', 'Shipped'];
    const rows = data.products.map((p) => [
      `"${p.productName}"`, p.totalOrders, p.totalQty, p.totalRevenue.toFixed(2),
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
        {/* ===== HEADER ===== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <FaChartLine className="text-white" />
              </div>
              Today&apos;s Report
            </h1>
            <p className="text-gray-400 text-sm mt-1">
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
                className="bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-gray-600"
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
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
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
          <div className="mb-6 p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400">Loading report...</span>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* ===== KPI CARDS ===== */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <KPICard icon={<FaShoppingCart />} label="Total Orders" value={fmt(data.summary.totalOrders)} color="indigo" />
              <KPICard icon={<FaMoneyBillWave />} label="Total Revenue" value={fmtCurrency(data.summary.totalRevenue)} color="emerald" />
              <KPICard icon={<FaChartLine />} label="Avg Order Value" value={fmtCurrency(data.summary.avgOrderValue)} color="cyan" />
              <KPICard icon={<FaUsers />} label="Unique Customers" value={fmt(data.summary.uniqueCustomers)} color="violet" />
              <KPICard icon={<FaCheckCircle />} label="Delivered" value={fmt(data.summary.deliveredOrders)} color="green" />
              <KPICard icon={<FaTimesCircle />} label="Cancelled" value={fmt(data.summary.cancelledOrders)} color="red" />
            </div>

            {/* ===== STATUS & COURIER SUMMARY CARDS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Order Status Mini Cards */}
              <div className="bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaBoxOpen className="text-indigo-400" /> Order Status Breakdown
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  <MiniStatusCard label="Pending" count={data.summary.pendingOrders} total={data.summary.totalOrders} color="amber" />
                  <MiniStatusCard label="Approved" count={data.summary.approvedOrders} total={data.summary.totalOrders} color="cyan" />
                  <MiniStatusCard label="Shipped" count={data.summary.shippedOrders} total={data.summary.totalOrders} color="purple" />
                  <MiniStatusCard label="Delivered" count={data.summary.deliveredOrders} total={data.summary.totalOrders} color="emerald" />
                  <MiniStatusCard label="Cancelled" count={data.summary.cancelledOrders} total={data.summary.totalOrders} color="red" />
                </div>
              </div>

              {/* Courier Distribution Mini Cards */}
              <div className="bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaTruck className="text-blue-400" /> Courier Distribution
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
            <div className="bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-xl mb-6 overflow-hidden">
              <div className="p-5 border-b border-gray-700/50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <FaBoxOpen className="text-indigo-400" /> Product-wise Sales Breakdown
                  <span className="text-sm text-gray-400 font-normal ml-2">({data.products.length} products)</span>
                </h3>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full md:w-64"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900/80 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 sticky left-0 bg-gray-900/95 z-10">#</th>
                      <th
                        className="text-left px-4 py-3 sticky left-8 bg-gray-900/95 z-10 cursor-pointer hover:text-indigo-400 transition-colors min-w-[200px]"
                        onClick={() => handleSort('productName')}
                      >
                        Product Name <SortIcon field="productName" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('totalOrders')}>
                        Orders <SortIcon field="totalOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('totalQty')}>
                        Qty <SortIcon field="totalQty" />
                      </th>
                      <th className="px-3 py-3 text-right cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('totalRevenue')}>
                        Revenue <SortIcon field="totalRevenue" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('steadfastOrders')}>
                        <span className="text-blue-400">Steadfast</span> <SortIcon field="steadfastOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('pathaoOrders')}>
                        <span className="text-red-400">Pathao</span> <SortIcon field="pathaoOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('redxOrders')}>
                        <span className="text-orange-400">RedX</span> <SortIcon field="redxOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('noCourierOrders')}>
                        No Courier <SortIcon field="noCourierOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('pendingOrders')}>
                        <span className="text-amber-400">Pending</span> <SortIcon field="pendingOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('approvedOrders')}>
                        <span className="text-cyan-400">Approved</span> <SortIcon field="approvedOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('shippedOrders')}>
                        <span className="text-purple-400">Shipped</span> <SortIcon field="shippedOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('deliveredOrders')}>
                        <span className="text-emerald-400">Delivered</span> <SortIcon field="deliveredOrders" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort('cancelledOrders')}>
                        <span className="text-red-400">Cancelled</span> <SortIcon field="cancelledOrders" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {sortedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="px-4 py-12 text-center text-gray-500">
                          {searchTerm ? 'No products match your search' : 'No product data for this date'}
                        </td>
                      </tr>
                    ) : (
                      sortedProducts.map((p, idx) => (
                        <tr key={p.productId || idx} className="hover:bg-gray-700/20 transition-colors">
                          <td className="px-4 py-3 text-gray-500 sticky left-0 bg-gray-800/95 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 text-white font-medium sticky left-8 bg-gray-800/95 max-w-[250px] truncate" title={p.productName}>
                            {p.productName}
                          </td>
                          <td className="px-3 py-3 text-center font-semibold text-white">{p.totalOrders}</td>
                          <td className="px-3 py-3 text-center text-gray-300">{p.totalQty}</td>
                          <td className="px-3 py-3 text-right text-emerald-400 font-medium">{fmtCurrency(p.totalRevenue)}</td>
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
                      <tr className="bg-gray-900/80 font-semibold text-white border-t-2 border-indigo-500/30">
                        <td className="px-4 py-3 sticky left-0 bg-gray-900/95" />
                        <td className="px-4 py-3 sticky left-8 bg-gray-900/95 text-indigo-400">TOTAL</td>
                        <td className="px-3 py-3 text-center">{sortedProducts.reduce((s, p) => s + p.totalOrders, 0)}</td>
                        <td className="px-3 py-3 text-center">{sortedProducts.reduce((s, p) => s + p.totalQty, 0)}</td>
                        <td className="px-3 py-3 text-right text-emerald-400">{fmtCurrency(sortedProducts.reduce((s, p) => s + p.totalRevenue, 0))}</td>
                        <td className="px-3 py-3 text-center text-blue-400">{sortedProducts.reduce((s, p) => s + p.steadfastOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-red-400">{sortedProducts.reduce((s, p) => s + p.pathaoOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-orange-400">{sortedProducts.reduce((s, p) => s + p.redxOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-gray-400">{sortedProducts.reduce((s, p) => s + p.noCourierOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-amber-400">{sortedProducts.reduce((s, p) => s + p.pendingOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-cyan-400">{sortedProducts.reduce((s, p) => s + p.approvedOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-purple-400">{sortedProducts.reduce((s, p) => s + p.shippedOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-emerald-400">{sortedProducts.reduce((s, p) => s + p.deliveredOrders, 0)}</td>
                        <td className="px-3 py-3 text-center text-red-400">{sortedProducts.reduce((s, p) => s + p.cancelledOrders, 0)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ===== CHARTS SECTION ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 11 }} interval={2} />
                    <YAxis yAxisId="left" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Legend wrapperStyle={{ color: '#d1d5db' }} />
                    <Area yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke={PALETTE.primary} fill="url(#gradOrders)" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue (৳)" stroke={PALETTE.success} fill="url(#gradRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Top Products Bar Chart */}
              <ChartCard title="Top 10 Products by Revenue" subtitle="Highest revenue generating products">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="productName"
                      type="category"
                      width={130}
                      stroke="#9ca3af"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: any) => fmtCurrency(Number(value))}
                    />
                    <Bar dataKey="totalRevenue" name="Revenue" fill={PALETTE.primary} radius={[0, 4, 4, 0]} barSize={18}>
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
                      labelLine={{ stroke: '#9ca3af' }}
                    >
                      {statusPieData.map((d, i) => (
                        <Cell key={i} fill={d.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ color: '#d1d5db' }} />
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
                      labelLine={{ stroke: '#9ca3af' }}
                    >
                      {courierPieData.map((d, i) => (
                        <Cell key={i} fill={d.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ color: '#d1d5db' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Order Source Bar Chart */}
              <ChartCard title="Order Sources" subtitle="Where orders originated from">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sourceData} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ color: '#d1d5db' }} />
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="status" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
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

            {/* ===== DISCOUNT SUMMARY ===== */}
            {data.summary.totalDiscount > 0 && (
              <div className="bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-xl p-5 mb-6">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <FaMoneyBillWave className="text-amber-400" /> Discount Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-amber-400 text-lg font-bold">{fmtCurrency(data.summary.totalDiscount)}</div>
                    <div className="text-gray-400 text-xs mt-1">Total Discount Given</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-emerald-400 text-lg font-bold">{fmtCurrency(data.summary.totalRevenue)}</div>
                    <div className="text-gray-400 text-xs mt-1">Net Revenue</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-indigo-400 text-lg font-bold">
                      {data.summary.totalRevenue > 0 ? ((data.summary.totalDiscount / (data.summary.totalRevenue + data.summary.totalDiscount)) * 100).toFixed(1) : '0'}%
                    </div>
                    <div className="text-gray-400 text-xs mt-1">Discount Rate</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-cyan-400 text-lg font-bold">{fmtCurrency(data.summary.avgOrderValue)}</div>
                    <div className="text-gray-400 text-xs mt-1">Avg Order Value</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

/* ========== SUB-COMPONENTS ========== */

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'from-indigo-600/20 to-indigo-600/5 border-indigo-500/30 text-indigo-400',
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
    cyan: 'from-cyan-600/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
    violet: 'from-violet-600/20 to-violet-600/5 border-violet-500/30 text-violet-400',
    green: 'from-green-600/20 to-green-600/5 border-green-500/30 text-green-400',
    red: 'from-red-600/20 to-red-600/5 border-red-500/30 text-red-400',
  };
  const classes = colorMap[color] || colorMap.indigo;

  return (
    <div className={`bg-gradient-to-br ${classes} border rounded-xl p-4 backdrop-blur`}>
      <div className={`text-lg mb-2 opacity-80`}>{icon}</div>
      <div className="text-white text-lg md:text-xl font-bold truncate">{value}</div>
      <div className="text-gray-400 text-xs mt-1">{label}</div>
    </div>
  );
}

function MiniStatusCard({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
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
    <div className="bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-gray-700/30">
        <h3 className="text-white font-semibold">{title}</h3>
        {subtitle && <p className="text-gray-400 text-xs mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function CourierBadge({ value, color }: { value: number; color: string }) {
  if (value === 0) return <span className="text-gray-600">—</span>;
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/15 text-blue-400',
    red: 'bg-red-500/15 text-red-400',
    orange: 'bg-orange-500/15 text-orange-400',
    gray: 'bg-gray-500/15 text-gray-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color] || colorClasses.gray}`}>
      {value}
    </span>
  );
}

function StatusBadge({ value, color }: { value: number; color: string }) {
  if (value === 0) return <span className="text-gray-600">—</span>;
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-500/15 text-amber-400',
    cyan: 'bg-cyan-500/15 text-cyan-400',
    purple: 'bg-purple-500/15 text-purple-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    red: 'bg-red-500/15 text-red-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color] || ''}`}>
      {value}
    </span>
  );
}
