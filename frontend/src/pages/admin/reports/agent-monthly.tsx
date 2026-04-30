import { useEffect, useState, useCallback, useRef } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaSyncAlt,
  FaUserTie,
  FaGlobe,
} from 'react-icons/fa';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

/* ========== TYPES ========== */
interface SourceSummary {
  total: number;
  delivered: number;
  cancelled: number;
}

interface WebsiteMonthlyData {
  month: number;
  year: number;
  daysInMonth: number;
  dailyChart: Array<{ day: number; website: number; landingPage: number }>;
  website: SourceSummary;
  landingPage: SourceSummary;
}

interface AgentMonthly {
  agentId: number;
  agentName: string;
  dailyOrders: Record<number, number>;
  total: number;
  delivered: number;
  cancelled: number;
}

interface MonthlyReportData {
  month: number;
  year: number;
  daysInMonth: number;
  agents: AgentMonthly[];
  grandTotal: number;
  grandDelivered: number;
  grandCancelled: number;
  grandCancelledRatio: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ========== COMPONENT ========== */
export default function AgentMonthlyReportPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  const [webData, setWebData] = useState<WebsiteMonthlyData | null>(null);
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState('');

  const fetchReport = useCallback(async (m: number, y: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/sales/agent-monthly-report?month=${m}&year=${y}`);
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWebReport = useCallback(async (m: number, y: number) => {
    setWebLoading(true);
    setWebError('');
    try {
      const res = await apiClient.get(`/sales/website-monthly-report?month=${m}&year=${y}`);
      setWebData(res.data);
    } catch (err: any) {
      setWebError(err?.response?.data?.message || err.message || 'Failed to load website report');
    } finally {
      setWebLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(month, year);
    fetchWebReport(month, year);
  }, [month, year, fetchReport, fetchWebReport]);

  const goToPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const getCancelledRatio = (agent: AgentMonthly) => {
    if (agent.total === 0) return '0%';
    return ((agent.cancelled / agent.total) * 100).toFixed(2) + '%';
  };

  const getCancelledRatioNum = (agent: AgentMonthly) => {
    if (agent.total === 0) return 0;
    return (agent.cancelled / agent.total) * 100;
  };

  /* ── Professional color logic ── */
  // Cell with orders: subtle blue-to-indigo gradient based on count
  const getDayCellStyle = (count: number): string => {
    if (!count) return '';
    if (count <= 5) return 'bg-blue-50 text-blue-700 font-medium';
    if (count <= 10) return 'bg-blue-100 text-blue-800 font-semibold';
    if (count <= 20) return 'bg-blue-200 text-blue-900 font-semibold';
    if (count <= 30) return 'bg-indigo-200 text-indigo-900 font-bold';
    return 'bg-indigo-300 text-indigo-950 font-bold';
  };

  // Cancelled ratio badge color
  const getCancelledBadge = (ratio: number): string => {
    if (ratio === 0) return 'bg-emerald-50 text-emerald-700';
    if (ratio <= 5) return 'bg-emerald-100 text-emerald-800';
    if (ratio <= 10) return 'bg-amber-50 text-amber-700';
    if (ratio <= 15) return 'bg-amber-100 text-amber-800';
    if (ratio <= 20) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  /* ── CSV Export ── */
  const exportCSV = () => {
    if (!data) return;
    const days = Array.from({ length: data.daysInMonth }, (_, i) => i + 1);
    const headers = ['Name', ...days.map(String), 'Total', 'Delivered', 'Cancelled', 'Cancelled Ratio'];
    const rows = data.agents.map(a => [
      a.agentName,
      ...days.map(d => a.dailyOrders[d] || ''),
      a.total,
      a.delivered,
      a.cancelled,
      getCancelledRatio(a),
    ]);
    // Grand total row
    rows.push([
      'TOTAL',
      ...days.map(d => data.agents.reduce((s, a) => s + (a.dailyOrders[d] || 0), 0) || ''),
      data.grandTotal,
      data.grandDelivered,
      data.grandCancelled,
      data.grandCancelledRatio + '%',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent_monthly_report_${year}_${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const days = data ? Array.from({ length: data.daysInMonth }, (_, i) => i + 1) : [];

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaUserTie className="text-indigo-600" />
              Individual Monthly Order Report
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Agent-wise daily order breakdown for the selected month
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchReport(month, year)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              disabled={!data || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <FaDownload />
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Month Navigator ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-center gap-4 shadow-sm">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          >
            <FaChevronLeft />
          </button>
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-500" />
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          >
            <FaChevronRight />
          </button>
        </div>

        {/* ── Summary Cards ── */}
        {data && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.agents.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Orders</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{data.grandTotal.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivered</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{data.grandDelivered.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cancelled Ratio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                <span className={`inline-block px-2 py-0.5 rounded-md text-lg ${getCancelledBadge(data.grandCancelledRatio)}`}>
                  {data.grandCancelledRatio}%
                </span>
              </p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        )}

        {/* ── Report Table ── */}
        {data && !loading && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-700">
                {MONTH_NAMES[month - 1]} {year} — Individual Monthly Order Report
              </h2>
            </div>
            <div ref={tableRef} className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="sticky left-0 z-10 bg-slate-800 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-r border-slate-700 min-w-[140px]">
                      Name
                    </th>
                    {days.map(d => (
                      <th
                        key={d}
                        className="px-1.5 py-2.5 text-center text-xs font-semibold min-w-[36px] border-r border-slate-700/50"
                      >
                        {d}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-l-2 border-slate-600 bg-slate-900 min-w-[60px]">
                      Total
                    </th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-emerald-900/70 min-w-[70px]">
                      Delivered
                    </th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-red-900/60 min-w-[72px]">
                      Cancelled
                    </th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-amber-900/50 min-w-[90px]">
                      Cancel %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.agents.length === 0 && (
                    <tr>
                      <td colSpan={days.length + 5} className="text-center py-12 text-gray-400">
                        No agent data found for this month.
                      </td>
                    </tr>
                  )}
                  {data.agents.map((agent, idx) => {
                    const cancelRatio = getCancelledRatioNum(agent);
                    return (
                      <tr
                        key={agent.agentId}
                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-indigo-50/40 transition-colors`}
                      >
                        <td className={`sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} px-3 py-2 font-medium text-gray-900 whitespace-nowrap border-r border-gray-200`}>
                          {agent.agentName}
                        </td>
                        {days.map(d => {
                          const count = agent.dailyOrders[d] || 0;
                          return (
                            <td
                              key={d}
                              className={`px-1 py-2 text-center text-xs tabular-nums border-r border-gray-100 ${getDayCellStyle(count)}`}
                            >
                              {count || ''}
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center font-bold text-sm tabular-nums text-slate-800 border-l-2 border-gray-200 bg-slate-50">
                          {agent.total || ''}
                        </td>
                        <td className="px-2 py-2 text-center font-semibold text-sm tabular-nums text-emerald-700 bg-emerald-50/50">
                          {agent.delivered || ''}
                        </td>
                        <td className="px-2 py-2 text-center font-semibold text-sm tabular-nums text-red-700 bg-red-50/40">
                          {agent.cancelled || ''}
                        </td>
                        <td className="px-2 py-2 text-center text-sm tabular-nums">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getCancelledBadge(cancelRatio)}`}>
                            {getCancelledRatio(agent)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* ── Grand Total Footer ── */}
                {data.agents.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-semibold">
                      <td className="sticky left-0 z-10 bg-slate-800 px-3 py-2.5 text-sm uppercase tracking-wider border-r border-slate-700">
                        Total
                      </td>
                      {days.map(d => {
                        const dayTotal = data.agents.reduce((s, a) => s + (a.dailyOrders[d] || 0), 0);
                        return (
                          <td key={d} className="px-1 py-2.5 text-center text-xs tabular-nums border-r border-slate-700/30">
                            {dayTotal || ''}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2.5 text-center text-sm tabular-nums border-l-2 border-slate-600 bg-slate-900">
                        {data.grandTotal}
                      </td>
                      <td className="px-2 py-2.5 text-center text-sm tabular-nums bg-emerald-900/70">
                        {data.grandDelivered}
                      </td>
                      <td className="px-2 py-2.5 text-center text-sm tabular-nums bg-red-900/60">
                        {data.grandCancelled}
                      </td>
                      <td className="px-2 py-2.5 text-center text-sm tabular-nums bg-amber-900/50">
                        {data.grandCancelledRatio}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ── Website & Landing Page Chart ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaGlobe className="text-sky-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                {MONTH_NAMES[month - 1]} {year} — Website &amp; Landing Page Orders
              </h2>
            </div>
            {webLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-sky-200 border-t-sky-500" />
            )}
          </div>

          {webError && (
            <div className="m-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{webError}</div>
          )}

          {/* Summary Cards */}
          {webData && !webLoading && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Website */}
              <div className="col-span-1 bg-sky-50 border border-sky-200 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-sky-600 uppercase tracking-wide mb-1">Website Orders</p>
                <p className="text-xl font-bold text-sky-700">{webData.website.total.toLocaleString()}</p>
              </div>
              <div className="col-span-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Website Delivered</p>
                <p className="text-xl font-bold text-emerald-700">{webData.website.delivered.toLocaleString()}</p>
              </div>
              <div className="col-span-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">Website Cancelled</p>
                <p className="text-xl font-bold text-red-600">{webData.website.cancelled.toLocaleString()}</p>
              </div>
              {/* Landing Page */}
              <div className="col-span-1 bg-violet-50 border border-violet-200 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-violet-600 uppercase tracking-wide mb-1">Landing Page Orders</p>
                <p className="text-xl font-bold text-violet-700">{webData.landingPage.total.toLocaleString()}</p>
              </div>
              <div className="col-span-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">LP Delivered</p>
                <p className="text-xl font-bold text-emerald-700">{webData.landingPage.delivered.toLocaleString()}</p>
              </div>
              <div className="col-span-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">LP Cancelled</p>
                <p className="text-xl font-bold text-red-600">{webData.landingPage.cancelled.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Area Chart */}
          {webData && !webLoading && (
            <div className="px-4 pb-5">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={webData.dailyChart}
                  margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradWebsite" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="gradLanding" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(value: any, name: any) => [
                      value,
                      name === 'website' ? 'Website' : 'Landing Page',
                    ]}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ fontSize: 12, color: '#374151' }}>
                        {value === 'website' ? 'Website' : 'Landing Page'}
                      </span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="website"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#gradWebsite)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="landingPage"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#gradLanding)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {!webData && !webLoading && !webError && (
            <div className="py-10 text-center text-gray-400 text-sm">No website or landing page data for this month.</div>
          )}
        </div>

        {/* ── Legend ── */}
        {data && !loading && data.agents.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Color Legend — Daily Order Count</h3>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-gray-50 border border-gray-200" />
                No orders
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-blue-50 border border-blue-200" />
                1–5
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-blue-100 border border-blue-200" />
                6–10
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-blue-200 border border-blue-300" />
                11–20
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-200 border border-indigo-300" />
                21–30
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-300 border border-indigo-400" />
                31+
              </span>
            </div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-3">Cancelled Ratio</h3>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-50 border border-emerald-200" />
                0%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-100 border border-emerald-200" />
                &le; 5%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-amber-50 border border-amber-200" />
                &le; 10%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-amber-100 border border-amber-200" />
                &le; 15%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-orange-100 border border-orange-200" />
                &le; 20%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-red-100 border border-red-200" />
                &gt; 20%
              </span>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
