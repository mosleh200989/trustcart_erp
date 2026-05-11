import { useEffect, useState, useCallback, useMemo } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  FaCalendarAlt,
  FaChartLine,
  FaDownload,
  FaSyncAlt,
  FaBoxOpen,
  FaLayerGroup,
  FaUserTie,
} from 'react-icons/fa';
import { getDhakaDateString } from '@/utils/dhakaDate';

interface ProductRow {
  productId: number;
  productName: string;
  totalOrders: number;
  totalQty: number;
  totalRevenue: number;
  grossAmount: number;
  deliveredOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  approvedOrders: number;
}

interface Summary {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  approvedOrders: number;
  sentOrders?: number;
  holdOrders: number;
  inReviewOrders?: number;
  pickedOrders?: number;
  inTransitOrders?: number;
  partialDeliveredOrders?: number;
  shippedOrders: number;
  deliveredOrders: number;
  completedOrders?: number;
  returnedOrders?: number;
  rejectedOrders?: number;
  cancelledOrders: number;
  steadfastOrders: number;
  pathaoOrders: number;
  redxOrders: number;
  noCourierOrders: number;
}

interface HourlyItem {
  hour: number;
  label: string;
  orders: number;
  revenue: number;
}

interface SourceProductRow {
  productId: number;
  productName: string;
  totalOrders: number;
  totalQty: number;
  totalRevenue: number;
}

interface AgentProductRow {
  agentId: number | null;
  agentName: string;
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
  landingPageProducts: SourceProductRow[];
  websiteProducts: SourceProductRow[];
  agentProductBreakdown?: AgentProductRow[];
}

const PALETTE = ['#4f46e5', '#0f766e', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#16a34a', '#be185d'];
const fmt = (n: number) => new Intl.NumberFormat('en-BD').format(Math.round(Number(n) || 0));

const statusMeta = [
  { key: 'processingOrders', label: 'Processing', color: 'pink' },
  { key: 'pendingOrders', label: 'Pending', color: 'amber' },
  { key: 'approvedOrders', label: 'Approved', color: 'blue' },
  { key: 'sentOrders', label: 'Sent', color: 'cyan' },
  { key: 'holdOrders', label: 'On Hold', color: 'orange' },
  { key: 'inReviewOrders', label: 'In Review', color: 'yellow' },
  { key: 'pickedOrders', label: 'Picked', color: 'teal' },
  { key: 'inTransitOrders', label: 'In Transit', color: 'violet' },
  { key: 'partialDeliveredOrders', label: 'Partial Delivered', color: 'lime' },
  { key: 'deliveredOrders', label: 'Delivered', color: 'green' },
  { key: 'completedOrders', label: 'Completed', color: 'emerald' },
  { key: 'cancelledOrders', label: 'Cancelled + Returned', color: 'red' },
] as const;

export default function TodaysReportPage() {
  const [date, setDate] = useState(() => getDhakaDateString());
  const [data, setData] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'landing_page' | 'website'>('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [agentMetric, setAgentMetric] = useState<'totalQty' | 'totalOrders'>('totalQty');
  const [agentTop, setAgentTop] = useState(12);

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

  const statusCards = useMemo(() => {
    const summary = data?.summary;
    if (!summary) return [];
    return statusMeta.map((item) => ({
      ...item,
      count: Number(summary[item.key] || 0),
    }));
  }, [data]);

  const productRows = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return (data?.products || [])
      .filter((p) => !q || p.productName.toLowerCase().includes(q))
      .sort((a, b) => b.totalQty - a.totalQty);
  }, [data, productSearch]);

  const sourceRows = useMemo(() => {
    const rows = [
      ...(data?.landingPageProducts || []).map((p) => ({ ...p, source: 'landing_page' as const, sourceLabel: 'Landing Page' })),
      ...(data?.websiteProducts || []).map((p) => ({ ...p, source: 'website' as const, sourceLabel: 'Website' })),
    ];
    return rows
      .filter((row) => sourceFilter === 'all' || row.source === sourceFilter)
      .sort((a, b) => b.totalQty - a.totalQty);
  }, [data, sourceFilter]);

  const agents = useMemo(() => {
    const names = new Map<string, string>();
    (data?.agentProductBreakdown || []).forEach((row) => {
      names.set(String(row.agentId ?? 'unassigned'), row.agentName);
    });
    return Array.from(names.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const agentProductChart = useMemo(() => {
    const grouped = new Map<string, any>();
    (data?.agentProductBreakdown || [])
      .filter((row) => agentFilter === 'all' || String(row.agentId ?? 'unassigned') === agentFilter)
      .forEach((row) => {
        const key = `${row.agentName} - ${row.productName}`;
        const current = grouped.get(key) || {
          label: key.length > 34 ? `${key.slice(0, 34)}...` : key,
          fullLabel: key,
          totalOrders: 0,
          totalQty: 0,
          totalRevenue: 0,
        };
        current.totalOrders += row.totalOrders;
        current.totalQty += row.totalQty;
        current.totalRevenue += row.totalRevenue;
        grouped.set(key, current);
      });
    return Array.from(grouped.values()).sort((a, b) => b[agentMetric] - a[agentMetric]).slice(0, agentTop);
  }, [data, agentFilter, agentMetric, agentTop]);

  const handleExportCSV = () => {
    if (!productRows.length) return;
    const headers = ['Product Name', 'Total Orders', 'Total Qty', 'Delivered', 'Cancelled + Returned', 'Pending', 'Approved'];
    const rows = productRows.map((p) => [
      `"${p.productName}"`,
      p.totalOrders,
      p.totalQty,
      p.deliveredOrders,
      p.cancelledOrders,
      p.pendingOrders,
      p.approvedOrders,
    ].join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${data?.date || date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 md:text-3xl">
              <span className="rounded-lg bg-indigo-600 p-2 text-white"><FaChartLine /></span>
              Today&apos;s Report
            </h1>
            <p className="mt-1 text-sm text-gray-500">Daily order, product, source, and agent-product performance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button onClick={() => setDate(getDhakaDateString())} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">Today</button>
            <button onClick={() => fetchReport(date)} disabled={loading} className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={handleExportCSV} disabled={!productRows.length} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              <FaDownload /> Export CSV
            </button>
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading && !data && <div className="flex h-64 items-center justify-center text-gray-500">Loading report...</div>}

        {data && (
          <>
            <section className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
              <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-5">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><FaBoxOpen className="text-indigo-600" /> Order Status Breakdown</h2>
                <p className="mt-1 text-xs text-gray-500">Cancelled includes cancelled, rejected, and returned orders.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-3 xl:grid-cols-4">
                {statusCards.map((item) => (
                  <StatusCard key={item.key} label={item.label} count={item.count} total={data.summary.totalOrders} color={item.color} />
                ))}
              </div>
            </section>

            <DataTableSection
              title="Product-wise Sales Breakdown"
              icon={<FaBoxOpen className="text-indigo-600" />}
              right={<input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 md:w-64" />}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="min-w-[240px] px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-center">Orders</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-center">Pending</th>
                    <th className="px-4 py-3 text-center">Approved</th>
                    <th className="px-4 py-3 text-center">Delivered</th>
                    <th className="px-4 py-3 text-center">Cancelled + Returned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productRows.map((p, index) => (
                    <tr key={`${p.productId}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.productName}</td>
                      <td className="px-4 py-3 text-center font-semibold">{p.totalOrders}</td>
                      <td className="px-4 py-3 text-center">{p.totalQty}</td>
                      <td className="px-4 py-3 text-center"><Badge color="amber" value={p.pendingOrders} /></td>
                      <td className="px-4 py-3 text-center"><Badge color="blue" value={p.approvedOrders} /></td>
                      <td className="px-4 py-3 text-center"><Badge color="green" value={p.deliveredOrders} /></td>
                      <td className="px-4 py-3 text-center"><Badge color="red" value={p.cancelledOrders} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableSection>

            <DataTableSection
              title="Landing Page / Website wise Sales Breakdown"
              icon={<FaLayerGroup className="text-teal-600" />}
              right={
                <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500">
                  <option value="all">All Sources</option>
                  <option value="landing_page">Landing Page</option>
                  <option value="website">Website</option>
                </select>
              }
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="min-w-[240px] px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-center">Orders</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sourceRows.map((p, index) => (
                    <tr key={`${p.source}-${p.productId}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${p.source === 'website' ? 'bg-teal-50 text-teal-700' : 'bg-purple-50 text-purple-700'}`}>{p.sourceLabel}</span></td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.productName}</td>
                      <td className="px-4 py-3 text-center font-semibold">{p.totalOrders}</td>
                      <td className="px-4 py-3 text-center">{p.totalQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableSection>

            <ChartCard title="Agent-wise and Product-wise Sales" subtitle="Filter by agent, metric, and top result count." icon={<FaUserTie className="text-indigo-600" />}>
              <div className="mb-4 flex flex-wrap gap-3">
                <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="min-w-44 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                  <option value="all">All Agents</option>
                  {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                  {!agents.length && <option value="none" disabled>No agent sales found</option>}
                </select>
                <select value={agentMetric} onChange={(e) => setAgentMetric(e.target.value as any)} className="min-w-36 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                  <option value="totalQty">Quantity</option>
                  <option value="totalOrders">Orders</option>
                </select>
                <select value={agentTop} onChange={(e) => setAgentTop(Number(e.target.value))} className="min-w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                  <option value={8}>Top 8</option>
                  <option value={12}>Top 12</option>
                  <option value={20}>Top 20</option>
                </select>
              </div>
              {agentProductChart.length ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={agentProductChart} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="label" width={220} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: any) => fmt(Number(value))} labelFormatter={(_, payload: any) => payload?.[0]?.payload?.fullLabel || ''} />
                    <Bar dataKey={agentMetric} name={agentMetric === 'totalOrders' ? 'Orders' : 'Quantity'} radius={[0, 6, 6, 0]}>
                      {agentProductChart.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
                  No agent-product sales found for the selected date.
                </div>
              )}
            </ChartCard>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ChartCard title="Hourly Order Distribution" subtitle="Orders throughout the day.">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.hourly}>
                    <defs>
                      <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="orders" name="Orders" stroke="#4f46e5" fill="url(#ordersGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Top Products by Quantity" subtitle="The strongest movers for the selected day.">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productRows.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="productName" type="category" width={150} tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.length > 20 ? `${v.slice(0, 20)}...` : v} />
                    <Tooltip />
                    <Bar dataKey="totalQty" name="Qty Sold" radius={[0, 6, 6, 0]}>
                      {productRows.slice(0, 10).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function StatusCard({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colorMap: Record<string, string> = {
    pink: 'from-pink-500 to-rose-500',
    amber: 'from-amber-500 to-yellow-500',
    blue: 'from-blue-500 to-indigo-500',
    cyan: 'from-cyan-500 to-sky-500',
    orange: 'from-orange-500 to-amber-500',
    yellow: 'from-yellow-500 to-orange-500',
    teal: 'from-teal-500 to-emerald-500',
    violet: 'from-violet-500 to-purple-500',
    lime: 'from-lime-500 to-green-500',
    green: 'from-green-500 to-emerald-500',
    emerald: 'from-emerald-500 to-teal-500',
    red: 'from-red-500 to-rose-600',
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-2xl font-bold text-gray-900">{fmt(count)}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
        </div>
        <div className="text-xs font-bold text-gray-400">{pct}%</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full bg-gradient-to-r ${colorMap[color] || colorMap.blue}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function DataTableSection({ title, icon, right, children }: { title: string; icon: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">{icon} {title}</h2>
        {right}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function ChartCard({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">{icon} {title}</h2>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Badge({ value, color }: { value: number; color: 'amber' | 'blue' | 'green' | 'red' }) {
  if (!value) return <span className="text-gray-300">-</span>;
  const map = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
  };
  return <span className={`inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[color]}`}>{fmt(value)}</span>;
}
