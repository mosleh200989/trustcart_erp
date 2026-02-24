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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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
  FaUserTie,
  FaArrowUp,

  FaTrophy,
  FaPercent,

  FaExchangeAlt,
} from 'react-icons/fa';

/* ========== TYPES ========== */
interface AgentRow {
  agentId: number;
  agentName: string;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalDiscount: number;
  uniqueCustomers: number;
  upsellOrders: number;
  upsellRevenue: number;
  upsellRate: number;
  pendingOrders: number;
  approvedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  steadfastOrders: number;
  pathaoOrders: number;
  redxOrders: number;
  conversionRate: number;
  cancelRate: number;
}

interface AgentSummary {
  totalOrders: number;
  totalRevenue: number;
  totalDiscount: number;
  totalUpsellOrders: number;
  totalUpsellRevenue: number;
  totalUniqueCustomers: number;
  activeAgents: number;
}

interface DailyTrend {
  date: string;
  orders: number;
  revenue: number;
  upsells: number;
}

interface HourlyItem {
  hour: number;
  label: string;
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

interface AgentReport {
  startDate: string;
  endDate: string;
  summary: AgentSummary;
  agents: AgentRow[];
  dailyTrend: DailyTrend[];
  hourly: HourlyItem[];
  products: ProductRow[];
}

interface UserItem {
  id: number;
  name: string;
  lastName?: string;
  last_name?: string;
  email?: string;
  roleId?: number;
  role_id?: number;
  status?: string;
}

/* ========== COLORS ========== */
const AGENT_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4',
  '#a855f7', '#ec4899', '#f97316', '#14b8a6', '#64748b',
  '#8b5cf6', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#06b6d4',
  shipped: '#a855f7',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

/* ========== HELPERS ========== */
const fmt = (n: number) => new Intl.NumberFormat('en-BD').format(n);

/* ========== MAIN COMPONENT ========== */
export default function AgentWiseReportPage() {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [data, setData] = useState<AgentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [sortKey, setSortKey] = useState<keyof AgentRow>('totalOrders');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'products'>('overview');

  // Fetch users list
  useEffect(() => {
    apiClient
      .get('/users')
      .then((res) => {
        const list: UserItem[] = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setUsers(list.filter((u) => u.status !== 'inactive'));
      })
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(
    async (sd: string, ed: string, agentId?: number | null) => {
      setLoading(true);
      setError('');
      try {
        let url = `/sales/agent-wise-report?startDate=${sd}&endDate=${ed}`;
        if (agentId) url += `&agentId=${agentId}`;
        const res = await apiClient.get(url);
        setData(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchReport(startDate, endDate, selectedAgentId);
  }, [startDate, endDate, selectedAgentId, fetchReport]);

  // Quick date presets
  const setToday = () => {
    const t = new Date().toISOString().slice(0, 10);
    setStartDate(t);
    setEndDate(t);
  };
  const setThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    setStartDate(monday.toISOString().slice(0, 10));
    setEndDate(new Date().toISOString().slice(0, 10));
  };
  const setThisMonth = () => {
    const now = new Date();
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    setEndDate(now.toISOString().slice(0, 10));
  };
  const setLast7Days = () => {
    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - 6);
    setStartDate(past.toISOString().slice(0, 10));
    setEndDate(now.toISOString().slice(0, 10));
  };

  // Sorting
  const handleSort = (key: keyof AgentRow) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedAgents = useMemo(() => {
    if (!data?.agents) return [];
    return [...data.agents].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data?.agents, sortKey, sortDir]);

  // Comparison data
  const comparedAgents = useMemo(() => {
    if (!data?.agents || compareIds.length === 0) return [];
    return data.agents.filter((a) => compareIds.includes(a.agentId));
  }, [data?.agents, compareIds]);

  const radarData = useMemo(() => {
    if (comparedAgents.length === 0) return [];
    const maxOrders = Math.max(...comparedAgents.map((a) => a.totalOrders), 1);
    const maxCustomers = Math.max(...comparedAgents.map((a) => a.uniqueCustomers), 1);
    const maxUpsells = Math.max(...comparedAgents.map((a) => a.upsellOrders), 1);

    const metrics = [
      { metric: 'Orders' },
      { metric: 'Customers' },
      { metric: 'Upsells' },
      { metric: 'Conversion %' },
    ];

    return metrics.map((m) => {
      const entry: any = { metric: m.metric };
      comparedAgents.forEach((a) => {
        let val = 0;
        switch (m.metric) {
          case 'Orders': val = (a.totalOrders / maxOrders) * 100; break;
          case 'Customers': val = (a.uniqueCustomers / maxCustomers) * 100; break;
          case 'Upsells': val = (a.upsellOrders / maxUpsells) * 100; break;
          case 'Conversion %': val = a.conversionRate; break;
        }
        entry[a.agentName] = Math.round(val);
      });
      return entry;
    });
  }, [comparedAgents]);

  // Product data
  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    if (!productSearch.trim()) return data.products;
    const q = productSearch.toLowerCase();
    return data.products.filter((p) => p.productName.toLowerCase().includes(q));
  }, [data?.products, productSearch]);

  // Top agents for chart
  const topAgentsByOrders = useMemo(() => {
    if (!data?.agents) return [];
    return [...data.agents].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 10);
  }, [data?.agents]);

  const toggleCompare = (id: number) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 5 ? [...prev, id] : prev,
    );
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data?.agents?.length) return;
    const headers = [
      'Agent Name', 'Total Orders', 'Unique Customers',
      'Upsell Orders', 'Upsell Rate %', 'Delivered', 'Cancelled',
      'Conversion %', 'Cancel %', 'Steadfast', 'Pathao', 'RedX',
    ];
    const rows = data.agents.map((a) =>
      [
        `"${a.agentName}"`, a.totalOrders,
        a.uniqueCustomers, a.upsellOrders, a.upsellRate,
        a.deliveredOrders, a.cancelledOrders, a.conversionRate, a.cancelRate,
        a.steadfastOrders, a.pathaoOrders, a.redxOrders,
      ].join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-report-${data.startDate}-to-${data.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: keyof AgentRow }) => {
    if (sortKey !== field) return <span className="text-gray-500 ml-1 text-[10px]">↕</span>;
    return <span className="text-indigo-400 ml-1 text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const getUserName = (u: UserItem) => [u.name, u.lastName || u.last_name].filter(Boolean).join(' ');

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ===== HEADER ===== */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-violet-600 rounded-lg">
                <FaUserTie className="text-white" />
              </div>
              Agent-wise Report
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Sales executor performance, upsells &amp; comparison analytics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={setToday} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">Today</button>
            <button onClick={setLast7Days} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">Last 7 Days</button>
            <button onClick={setThisWeek} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">This Week</button>
            <button onClick={setThisMonth} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">This Month</button>
          </div>
        </div>

        {/* ===== FILTERS ===== */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-gray-500 text-xs mb-1">Start Date</label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-gray-300 text-gray-900 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">End Date</label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-gray-300 text-gray-900 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Agent</label>
              <select
                value={selectedAgentId ?? ''}
                onChange={(e) => setSelectedAgentId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none min-w-[180px]"
              >
                <option value="">All Agents</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {getUserName(u)}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => fetchReport(startDate, endDate, selectedAgentId)}
              disabled={loading}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!data?.agents?.length}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FaDownload /> Export
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500">Loading agent report...</span>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* ===== KPI CARDS ===== */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <KPICard icon={<FaUsers />} label="Active Agents" value={fmt(data.summary.activeAgents)} color="violet" />
              <KPICard icon={<FaShoppingCart />} label="Total Orders" value={fmt(data.summary.totalOrders)} color="indigo" />
              <KPICard icon={<FaArrowUp />} label="Upsell Orders" value={fmt(data.summary.totalUpsellOrders)} color="amber" />
              <KPICard icon={<FaPercent />} label="Upsell Rate" value={`${data.summary.totalOrders > 0 ? Math.round((data.summary.totalUpsellOrders / data.summary.totalOrders) * 100) : 0}%`} color="cyan" />
              <KPICard icon={<FaUsers />} label="Unique Customers" value={fmt(data.summary.totalUniqueCustomers)} color="teal" />
            </div>

            {/* ===== TAB NAVIGATION ===== */}
            <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-xl p-1 w-fit">
              {(['overview', 'comparison', 'products'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-violet-600 text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                  }`}
                >
                  {tab === 'overview' && <><FaChartLine className="inline mr-2" />Overview</>}
                  {tab === 'comparison' && <><FaExchangeAlt className="inline mr-2" />Comparison</>}
                  {tab === 'products' && <><FaBoxOpen className="inline mr-2" />Products</>}
                </button>
              ))}
            </div>

            {/* ===== TAB: OVERVIEW ===== */}
            {activeTab === 'overview' && (
              <>
                {/* Agent Performance Table */}
                <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2">
                      <FaUserTie className="text-violet-500" /> Agent Performance
                      <span className="text-sm text-gray-500 font-normal ml-2">({data.agents.length} agents)</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">Select agents to compare:</span>
                      {compareIds.length > 0 && (
                        <button
                          onClick={() => { setShowCompare(true); setActiveTab('comparison'); }}
                          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <FaExchangeAlt /> Compare ({compareIds.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider">
                          <th className="px-3 py-3 text-center w-10">
                            <FaExchangeAlt className="mx-auto text-[10px]" />
                          </th>
                          <th className="px-3 py-3 text-center w-8">#</th>
                          <th className="text-left px-3 py-3 cursor-pointer hover:text-violet-600 min-w-[150px]" onClick={() => handleSort('agentName')}>
                            Agent <SortIcon field="agentName" />
                          </th>
                          <th className="px-3 py-3 text-center cursor-pointer hover:text-violet-600" onClick={() => handleSort('totalOrders')}>
                            Orders <SortIcon field="totalOrders" />
                          </th>
                          <th className="px-3 py-3 text-center cursor-pointer hover:text-violet-600" onClick={() => handleSort('uniqueCustomers')}>
                            Customers <SortIcon field="uniqueCustomers" />
                          </th>
                          <th className="px-3 py-3 text-center cursor-pointer hover:text-violet-600" onClick={() => handleSort('upsellOrders')}>
                            <span className="text-amber-600">Upsells</span> <SortIcon field="upsellOrders" />
                          </th>
                          <th className="px-3 py-3 text-center cursor-pointer hover:text-violet-600" onClick={() => handleSort('upsellRate')}>
                            <span className="text-amber-600">Upsell %</span> <SortIcon field="upsellRate" />
                          </th>
                          <th className="px-3 py-3 text-center cursor-pointer hover:text-violet-600" onClick={() => handleSort('deliveredOrders')}>
                            <span className="text-emerald-600">Delivered</span> <SortIcon field="deliveredOrders" />
                          </th>
                          <th className="px-3 py-3 text-center cursor-pointer hover:text-violet-600" onClick={() => handleSort('cancelledOrders')}>
                            <span className="text-red-600">Cancelled</span> <SortIcon field="cancelledOrders" />
                          </th>
                          <th className="px-3 py-3 text-center cursor-pointer hover:text-violet-600" onClick={() => handleSort('conversionRate')}>
                            Conv % <SortIcon field="conversionRate" />
                          </th>
                          <th className="px-3 py-3 text-center cursor-pointer hover:text-violet-600" onClick={() => handleSort('steadfastOrders')}>
                            <span className="text-blue-600">SF</span> <SortIcon field="steadfastOrders" />
                          </th>
                          <th className="px-3 py-3 text-center cursor-pointer hover:text-violet-600" onClick={() => handleSort('pathaoOrders')}>
                            <span className="text-red-600">PT</span> <SortIcon field="pathaoOrders" />
                          </th>
                          <th className="px-3 py-3 text-center cursor-pointer hover:text-violet-600" onClick={() => handleSort('redxOrders')}>
                            <span className="text-orange-600">RX</span> <SortIcon field="redxOrders" />
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sortedAgents.length === 0 ? (
                          <tr>
                            <td colSpan={13} className="px-4 py-16 text-center text-gray-500">
                              No agent data for the selected period
                            </td>
                          </tr>
                        ) : (
                          sortedAgents.map((a, idx) => {
                            const isTop = idx === 0 && sortKey === 'totalOrders' && sortDir === 'desc';
                            return (
                              <tr key={a.agentId} className={`hover:bg-gray-50 transition-colors ${isTop ? 'bg-violet-50/50' : ''}`}>
                                <td className="px-3 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={compareIds.includes(a.agentId)}
                                    onChange={() => toggleCompare(a.agentId)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-violet-500 focus:ring-violet-500 bg-white cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-3 text-center text-gray-500 text-xs">
                                  {idx === 0 && isTop ? <FaTrophy className="text-yellow-400 mx-auto" /> : idx + 1}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                      style={{ backgroundColor: AGENT_COLORS[idx % AGENT_COLORS.length] }}
                                    >
                                      {a.agentName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-gray-900 font-medium truncate max-w-[120px]" title={a.agentName}>
                                      {a.agentName}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center font-semibold text-gray-900">{a.totalOrders}</td>
                                <td className="px-3 py-3 text-center text-gray-600">{a.uniqueCustomers}</td>
                                <td className="px-3 py-3 text-center">
                                  <Badge value={a.upsellOrders} color="amber" />
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <PercentBadge value={a.upsellRate} />
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <Badge value={a.deliveredOrders} color="emerald" />
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <Badge value={a.cancelledOrders} color="red" />
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <ConversionBadge value={a.conversionRate} />
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <Badge value={a.steadfastOrders} color="blue" />
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <Badge value={a.pathaoOrders} color="red" />
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <Badge value={a.redxOrders} color="orange" />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {sortedAgents.length > 1 && (
                        <tfoot>
                          <tr className="bg-gray-50 font-semibold text-gray-900 border-t-2 border-violet-200">
                            <td className="px-3 py-3" />
                            <td className="px-3 py-3" />
                            <td className="px-3 py-3 text-violet-600">TOTAL</td>
                            <td className="px-3 py-3 text-center">{sortedAgents.reduce((s, a) => s + a.totalOrders, 0)}</td>
                            <td className="px-3 py-3 text-center">{sortedAgents.reduce((s, a) => s + a.uniqueCustomers, 0)}</td>
                            <td className="px-3 py-3 text-center text-amber-600">{sortedAgents.reduce((s, a) => s + a.upsellOrders, 0)}</td>
                            <td className="px-3 py-3 text-center">—</td>
                            <td className="px-3 py-3 text-center text-emerald-600">{sortedAgents.reduce((s, a) => s + a.deliveredOrders, 0)}</td>
                            <td className="px-3 py-3 text-center text-red-600">{sortedAgents.reduce((s, a) => s + a.cancelledOrders, 0)}</td>
                            <td className="px-3 py-3 text-center">—</td>
                            <td className="px-3 py-3 text-center text-blue-600">{sortedAgents.reduce((s, a) => s + a.steadfastOrders, 0)}</td>
                            <td className="px-3 py-3 text-center text-red-600">{sortedAgents.reduce((s, a) => s + a.pathaoOrders, 0)}</td>
                            <td className="px-3 py-3 text-center text-orange-600">{sortedAgents.reduce((s, a) => s + a.redxOrders, 0)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* ===== CHARTS: OVERVIEW ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Daily Trend */}
                  {data.dailyTrend.length > 1 && (
                    <ChartCard title="Daily Orders Trend" subtitle="Orders over the selected period">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data.dailyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="agGradOrders" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }} />
                          <Legend wrapperStyle={{ color: '#374151' }} />
                          <Area type="monotone" dataKey="orders" name="Orders" stroke="#6366f1" fill="url(#agGradOrders)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {/* Upsell Trend */}
                  {data.dailyTrend.length > 1 && (
                    <ChartCard title="Daily Upsell Trend" subtitle="Upsell conversions over time">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data.dailyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="agGradUpsell" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }} />
                          <Area type="monotone" dataKey="upsells" name="Upsell Orders" stroke="#f59e0b" fill="url(#agGradUpsell)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {/* Top Agents by Orders */}
                  <ChartCard title="Top Agents by Orders" subtitle="Agents with most orders">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topAgentsByOrders} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
                        <YAxis
                          dataKey="agentName"
                          type="category"
                          width={110}
                          stroke="#6b7280"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + '…' : v}
                        />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }} />
                        <Bar dataKey="totalOrders" name="Orders" radius={[0, 4, 4, 0]} barSize={18}>
                          {topAgentsByOrders.map((_, i) => (
                            <Cell key={i} fill={AGENT_COLORS[i % AGENT_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Agent Orders Distribution Pie */}
                  <ChartCard title="Orders Distribution" subtitle="Share of orders per agent">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.agents.slice(0, 10) as any[]}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={105}
                          paddingAngle={2}
                          dataKey="totalOrders"
                          nameKey="agentName"
                          label={({ name, percent }: any) => `${name?.length > 10 ? name.slice(0, 10) + '…' : name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={{ stroke: '#6b7280' }}
                        >
                          {data.agents.slice(0, 10).map((_, i) => (
                            <Cell key={i} fill={AGENT_COLORS[i % AGENT_COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }} />
                        <Legend wrapperStyle={{ color: '#374151', fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Hourly Activity */}
                  <ChartCard title="Hourly Activity" subtitle="Agent order activity by hour">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.hourly} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 10 }} interval={2} />
                        <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }} />
                        <Legend wrapperStyle={{ color: '#374151' }} />
                        <Bar dataKey="orders" name="Orders" fill="#6366f1" radius={[3, 3, 0, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Agent Upsell Leaderboard */}
                  <ChartCard title="Upsell Leaderboard" subtitle="Agents ranked by upsell performance">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[...data.agents].sort((a, b) => b.upsellOrders - a.upsellOrders).slice(0, 10)}
                        margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="agentName"
                          stroke="#6b7280"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + '…' : v}
                        />
                        <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }} />
                        <Legend wrapperStyle={{ color: '#374151' }} />
                        <Bar dataKey="upsellOrders" name="Upsell Orders" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} />
                        <Bar dataKey="upsellRate" name="Upsell Rate %" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </>
            )}

            {/* ===== TAB: COMPARISON ===== */}
            {activeTab === 'comparison' && (
              <div className="space-y-6">
                {compareIds.length < 2 ? (
                  <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-12 text-center">
                    <FaExchangeAlt className="text-4xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-gray-800 font-semibold text-lg mb-2">Select Agents to Compare</h3>
                    <p className="text-gray-500 text-sm">
                      Go to the Overview tab and check at least 2 agents from the table to compare their performance side by side.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Comparison Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {comparedAgents.map((a, i) => (
                        <div key={a.agentId} className="bg-white shadow-sm border border-gray-200 rounded-xl p-4 relative overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: AGENT_COLORS[i % AGENT_COLORS.length] }} />
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: AGENT_COLORS[i % AGENT_COLORS.length] }}
                            >
                              {a.agentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-gray-900 font-semibold text-sm truncate max-w-[120px]">{a.agentName}</div>
                              <div className="text-gray-500 text-[10px]">{a.totalOrders} orders</div>
                            </div>
                          </div>
                          <div className="space-y-2 text-xs">
                            <MetricRow label="Customers" value={fmt(a.uniqueCustomers)} />
                            <MetricRow label="Upsells" value={`${a.upsellOrders} (${a.upsellRate}%)`} highlight />
                            <MetricRow label="Delivered" value={`${a.deliveredOrders} (${a.conversionRate}%)`} />
                            <MetricRow label="Cancelled" value={`${a.cancelledOrders} (${a.cancelRate}%)`} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Radar Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ChartCard title="Performance Radar" subtitle="Multi-dimensional comparison (normalized %)">
                        <ResponsiveContainer width="100%" height={350}>
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="metric" stroke="#6b7280" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#9ca3af" tick={{ fontSize: 9 }} />
                            {comparedAgents.map((a, i) => (
                              <Radar
                                key={a.agentId}
                                name={a.agentName}
                                dataKey={a.agentName}
                                stroke={AGENT_COLORS[i % AGENT_COLORS.length]}
                                fill={AGENT_COLORS[i % AGENT_COLORS.length]}
                                fillOpacity={0.15}
                                strokeWidth={2}
                              />
                            ))}
                            <Legend wrapperStyle={{ color: '#374151', fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </ChartCard>

                      {/* Comparison Bar */}
                      <ChartCard title="Orders & Upsell Comparison" subtitle="Side-by-side comparison">
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={comparedAgents} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="agentName"
                              stroke="#6b7280"
                              tick={{ fontSize: 10 }}
                              tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                            />
                            <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }} />
                            <Legend wrapperStyle={{ color: '#374151' }} />
                            <Bar dataKey="totalOrders" name="Orders" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                            <Bar dataKey="upsellOrders" name="Upsells" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} />
                            <Bar dataKey="uniqueCustomers" name="Customers" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={28} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>

                    {/* Conversion & Cancel Comparison */}
                    <ChartCard title="Conversion & Cancel Rate Comparison" subtitle="Delivery success vs cancellation rates">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comparedAgents} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="agentName"
                            stroke="#6b7280"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                          />
                          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }} formatter={(v: any) => `${v}%`} />
                          <Legend wrapperStyle={{ color: '#374151' }} />
                          <Bar dataKey="conversionRate" name="Conversion %" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={30} />
                          <Bar dataKey="upsellRate" name="Upsell %" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
                          <Bar dataKey="cancelRate" name="Cancel %" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </>
                )}
              </div>
            )}

            {/* ===== TAB: PRODUCTS ===== */}
            {activeTab === 'products' && (
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2">
                    <FaBoxOpen className="text-violet-500" /> Products Sold by Agent(s)
                    <span className="text-sm text-gray-500 font-normal ml-2">({data.products.length} products)</span>
                  </h3>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none w-full md:w-64"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left w-10">#</th>
                        <th className="px-4 py-3 text-left min-w-[200px]">Product Name</th>
                        <th className="px-4 py-3 text-center">Orders</th>
                        <th className="px-4 py-3 text-center">Qty Sold</th>
                        <th className="px-4 py-3 text-center">Qty Sold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                            {productSearch ? 'No products match your search' : 'No product data'}
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p, idx) => (
                          <tr key={p.productId || idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-500 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 text-gray-900 font-medium truncate max-w-[250px]" title={p.productName}>{p.productName}</td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-900">{p.totalOrders}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{p.totalQty}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredProducts.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50 font-semibold text-gray-900 border-t-2 border-violet-200">
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 text-violet-600">TOTAL</td>
                          <td className="px-4 py-3 text-center">{filteredProducts.reduce((s, p) => s + p.totalOrders, 0)}</td>
                          <td className="px-4 py-3 text-center">{filteredProducts.reduce((s, p) => s + p.totalQty, 0)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Product chart */}
                {data.products.length > 0 && (
                  <div className="p-5 border-t border-gray-200">
                    <h4 className="text-gray-800 font-semibold mb-4">Top 10 Products by Quantity Sold</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[...data.products].sort((a, b) => b.totalQty - a.totalQty).slice(0, 10)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                      >
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
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }} />
                        <Bar dataKey="totalQty" name="Qty Sold" radius={[0, 4, 4, 0]} barSize={18}>
                          {[...data.products].sort((a, b) => b.totalQty - a.totalQty).slice(0, 10).map((_, i) => (
                            <Cell key={i} fill={AGENT_COLORS[i % AGENT_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
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
    violet: 'bg-violet-50 border-violet-200 text-violet-600',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    pink: 'bg-pink-50 border-pink-200 text-pink-600',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-600',
    teal: 'bg-teal-50 border-teal-200 text-teal-600',
  };
  const classes = colorMap[color] || colorMap.violet;
  return (
    <div className={`${classes} border rounded-xl p-4`}>
      <div className="text-lg mb-2 opacity-80">{icon}</div>
      <div className="text-gray-900 text-lg font-bold truncate">{value}</div>
      <div className="text-gray-500 text-[11px] mt-1">{label}</div>
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

function Badge({ value, color }: { value: number; color: string }) {
  if (value === 0) return <span className="text-gray-400">—</span>;
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color] || colorClasses.gray}`}>
      {value}
    </span>
  );
}

function PercentBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-400">0%</span>;
  const color = value >= 20 ? 'text-emerald-700 bg-emerald-50' : value >= 10 ? 'text-amber-700 bg-amber-50' : 'text-gray-600 bg-gray-100';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{value}%</span>;
}

function ConversionBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-400">0%</span>;
  const color = value >= 70 ? 'text-emerald-700 bg-emerald-50' : value >= 40 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{value}%</span>;
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`${highlight ? 'text-amber-600' : 'text-gray-500'}`}>{label}</span>
      <span className={`font-medium ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}
