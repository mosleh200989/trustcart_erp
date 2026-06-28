import { useEffect, useState, useCallback, useMemo } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import AdminDateInput from '@/components/admin/AdminDateInput';
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

interface CombinedProductRow {
  key: string;
  source: 'agent' | 'landing_page' | 'website';
  sourceLabel: string;
  ownerLabel: string;
  productName: string;
  totalOrders: number;
  totalQty: number;
  totalRevenue: number;
}

interface DailyReport {
  date: string;
  startDate?: string;
  endDate?: string;
  summary: Summary;
  agentSummary?: Summary;
  products: ProductRow[];
  hourly: HourlyItem[];
  landingPageProducts: SourceProductRow[];
  websiteProducts: SourceProductRow[];
  agentProductBreakdown?: AgentProductRow[];
}

const PALETTE = ['#4f46e5', '#0f766e', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#16a34a', '#be185d'];
const fmt = (n: number) => new Intl.NumberFormat('en-BD').format(Math.round(Number(n) || 0));

const hasReadableText = (value?: string | null) => Boolean(value && value.replace(/[\s?]+/g, '').length > 0);
const isDeletedAgentLabel = (value?: string | null) => /^deleted\+/i.test(String(value || '').trim());
const agentLabel = (row: Pick<AgentProductRow, 'agentId' | 'agentName'>) =>
  hasReadableText(row.agentName) && !isDeletedAgentLabel(row.agentName) ? row.agentName : `Agent #${row.agentId ?? 'Unassigned'}`;
const productLabel = (row: Pick<AgentProductRow, 'productId' | 'productName'>) =>
  hasReadableText(row.productName) ? row.productName : `Product #${row.productId || 'Unknown'}`;

export default function TodaysReportPage() {
  const [date, setDate] = useState(() => getDhakaDateString());
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [data, setData] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'landing_page' | 'website'>('all');

  const isRangeMode = Boolean(rangeStartDate && rangeEndDate);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (isRangeMode) {
        const start = rangeStartDate <= rangeEndDate ? rangeStartDate : rangeEndDate;
        const end = rangeStartDate <= rangeEndDate ? rangeEndDate : rangeStartDate;
        params.set('startDate', start);
        params.set('endDate', end);
      } else {
        params.set('date', date);
      }
      const res = await apiClient.get(`/sales/daily-report?${params.toString()}`);
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [date, isRangeMode, rangeEndDate, rangeStartDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSingleDateChange = (value: string) => {
    setDate(value);
    setRangeStartDate('');
    setRangeEndDate('');
  };

  const handleToday = () => {
    setDate(getDhakaDateString());
    setRangeStartDate('');
    setRangeEndDate('');
  };

  const summaryCards = useMemo(() => {
    const buildCards = (summary?: Summary) => {
      if (!summary) return [];
      const remaining = Math.max(
        Number(summary.totalOrders || 0) -
        Number(summary.approvedOrders || 0) -
        Number(summary.rejectedOrders || 0) -
        Number(summary.holdOrders || 0),
        0,
      );
      return [
        { key: 'total', label: 'Total Orders', count: Number(summary.totalOrders || 0), color: 'indigo' },
        { key: 'approved', label: 'Approved', count: Number(summary.approvedOrders || 0), color: 'blue' },
        { key: 'rejected', label: 'Rejected', count: Number(summary.rejectedOrders || 0), color: 'red' },
        { key: 'hold', label: 'On Hold', count: Number(summary.holdOrders || 0), color: 'orange' },
        { key: 'remaining', label: 'In Progress', count: remaining, color: 'violet' },
      ];
    };
    return buildCards(data?.summary);
  }, [data]);

  const agentSummaryCards = useMemo(() => {
    const summary = data?.agentSummary;
    if (!summary) return [];
    const remaining = Math.max(
      Number(summary.totalOrders || 0) -
      Number(summary.approvedOrders || 0) -
      Number(summary.rejectedOrders || 0) -
      Number(summary.holdOrders || 0),
      0,
    );
    return [
      { key: 'total', label: 'Total Orders', count: Number(summary.totalOrders || 0), color: 'indigo' },
      { key: 'approved', label: 'Approved', count: Number(summary.approvedOrders || 0), color: 'blue' },
      { key: 'rejected', label: 'Rejected', count: Number(summary.rejectedOrders || 0), color: 'red' },
      { key: 'hold', label: 'On Hold', count: Number(summary.holdOrders || 0), color: 'orange' },
      { key: 'remaining', label: 'In Progress', count: remaining, color: 'violet' },
    ];
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

  const combinedProductRows = useMemo<CombinedProductRow[]>(() => {
    const rows: CombinedProductRow[] = [];
    (data?.agentProductBreakdown || [])
      .filter((row) => !isDeletedAgentLabel(row.agentName))
      .forEach((row) => rows.push({
        key: `agent-${row.agentId ?? 'unassigned'}-${row.productId}-${row.productName}`,
        source: 'agent' as const,
        sourceLabel: 'Agent',
        ownerLabel: 'Agent Orders',
        productName: productLabel(row),
        totalOrders: row.totalOrders,
        totalQty: row.totalQty,
        totalRevenue: row.totalRevenue,
      }));
    (data?.landingPageProducts || []).forEach((row) => rows.push({
      key: `landing-${row.productId}-${row.productName}`,
      source: 'landing_page' as const,
      sourceLabel: 'Landing Page',
      ownerLabel: 'Landing Page',
      productName: row.productName,
      totalOrders: row.totalOrders,
      totalQty: row.totalQty,
      totalRevenue: row.totalRevenue,
    }));
    (data?.websiteProducts || []).forEach((row) => rows.push({
      key: `website-${row.productId}-${row.productName}`,
      source: 'website' as const,
      sourceLabel: 'Website',
      ownerLabel: 'Website',
      productName: row.productName,
      totalOrders: row.totalOrders,
      totalQty: row.totalQty,
      totalRevenue: row.totalRevenue,
    }));
    const grouped = new Map<string, CombinedProductRow>();
    rows.forEach((row) => {
      const key = row.productName.toLowerCase();
      const current = grouped.get(key) || {
        ...row,
        key,
        source: 'agent' as const,
        sourceLabel: 'All Sources',
        ownerLabel: 'Combined',
        totalOrders: 0,
        totalQty: 0,
        totalRevenue: 0,
      };
      current.totalOrders += row.totalOrders;
      current.totalQty += row.totalQty;
      current.totalRevenue += row.totalRevenue;
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [data]);

  const reportRangeLabel = isRangeMode
    ? `${data?.startDate || rangeStartDate} to ${data?.endDate || rangeEndDate}`
    : data?.date || date;

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
    const exportDateLabel = isRangeMode
      ? `${data?.startDate || rangeStartDate}-to-${data?.endDate || rangeEndDate}`
      : data?.date || date;
    a.download = `daily-report-${exportDateLabel}.csv`;
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
            <p className="mt-1 text-sm text-gray-500">Order, product, source, and agent-product performance for {reportRangeLabel}.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Specific Date</span>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <AdminDateInput
                  value={date}
                  onValueChange={handleSingleDateChange}
                  className="rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Range Start</span>
              <AdminDateInput
                value={rangeStartDate}
                onValueChange={setRangeStartDate}
                className="w-36 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Range End</span>
              <AdminDateInput
                value={rangeEndDate}
                onValueChange={setRangeEndDate}
                className="w-36 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <button onClick={handleToday} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">Today</button>
            {isRangeMode && (
              <button onClick={() => { setRangeStartDate(''); setRangeEndDate(''); }} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Use Specific Date</button>
            )}
            <button onClick={fetchReport} disabled={loading} className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
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
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><FaBoxOpen className="text-indigo-600" /> Website &amp; Landing Page Order Snapshot</h2>
                <p className="mt-1 text-xs text-gray-500">Agent-created orders are excluded from these headline cards.</p>
              </div>
              <div className="space-y-5 p-5">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Website + Landing Page</div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                    {summaryCards.map((item) => (
                      <StatusCard key={item.key} label={item.label} count={item.count} total={data.summary.totalOrders} color={item.color} />
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Agent Orders</div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                    {agentSummaryCards.map((item) => (
                      <StatusCard key={item.key} label={item.label} count={item.count} total={data.agentSummary?.totalOrders || 0} color={item.color} />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <DataTableSection
              title="Product-wise Sales Breakdown"
              icon={<FaBoxOpen className="text-indigo-600" />}
              right={<input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 md:w-64" />}
            >
              <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-2 text-xs text-gray-500">
                Agent/admin order sources only. Website and landing page orders are excluded here.
              </div>
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

            <DataTableSection
              title="Agent-wise and Product-wise Sales"
              icon={<FaUserTie className="text-indigo-600" />}
              right={<span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Agent + Landing Page + Website</span>}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="min-w-[240px] px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-center">Orders</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {combinedProductRows.map((row, index) => (
                    <tr key={`${row.key}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.productName}</td>
                      <td className="px-4 py-3 text-center font-semibold">{row.totalOrders}</td>
                      <td className="px-4 py-3 text-center">{row.totalQty}</td>
                      <td className="px-4 py-3 text-right">{fmt(row.totalRevenue)}</td>
                    </tr>
                  ))}
                  {combinedProductRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">No combined product sales found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DataTableSection>

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
              <ChartCard title="Top Products by Quantity" subtitle="The strongest movers for the selected period.">
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
