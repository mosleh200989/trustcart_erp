import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminDateInput from '@/components/admin/AdminDateInput';
import apiClient from '@/services/api';
import { getDhakaDateString } from '@/utils/dhakaDate';
import { FaChartBar, FaDownload, FaMoneyBillWave, FaRedo, FaSyncAlt, FaTruck, FaUndo, FaUserTie } from 'react-icons/fa';

type DashboardRow = {
  agentId: number;
  agent: string;
  orders: number;
  products: number;
  grossSales: number;
  delivered: number;
  deliveryPercent: number;
  cancel: number;
  cancelPercent: number;
  reject: number;
  rejectPercent: number;
  return: number;
  returnAmount: number;
  netRevenue: number;
};

type DashboardData = {
  startDate: string;
  endDate: string;
  rows: DashboardRow[];
  totals: Omit<DashboardRow, 'agentId' | 'agent'>;
};

const fmt = (value: number) => new Intl.NumberFormat('en-BD').format(Math.round(Number(value) || 0));
const money = (value: number) => `৳${new Intl.NumberFormat('en-BD').format(Math.round(Number(value) || 0))}`;
const percent = (value: number) => `${Number(value || 0).toFixed(1)}%`;

function firstDayOfMonth() {
  const today = getDhakaDateString();
  return today ? `${today.slice(0, 7)}-01` : '';
}

function ratioClass(value: number, goodHigh = true) {
  if (goodHigh) {
    if (value >= 90) return 'bg-emerald-50 text-emerald-700';
    if (value >= 75) return 'bg-lime-50 text-lime-700';
    if (value >= 60) return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-700';
  }
  if (value <= 3) return 'bg-emerald-50 text-emerald-700';
  if (value <= 7) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export default function ReportsDashboardPage() {
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(() => getDhakaDateString());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const response = await apiClient.get(`/sales/reports-dashboard?${params.toString()}`);
      setData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load report dashboard');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const rows = data?.rows || [];
  const totals = data?.totals;

  const topNetRevenue = useMemo(() => {
    return [...rows].sort((a, b) => b.netRevenue - a.netRevenue)[0];
  }, [rows]);

  const exportCsv = () => {
    if (!data) return;
    const headers = ['Agent', 'Orders', 'Products', 'Gross Sales', 'Delivered', 'Delivery %', 'Cancel', 'Cancel %', 'Reject', 'Reject %', 'Return', 'Return Amount', 'Net Revenue'];
    const csvRows = rows.map((row) => [
      row.agent,
      row.orders,
      row.products,
      row.grossSales,
      row.delivered,
      `${row.deliveryPercent}%`,
      row.cancel,
      `${row.cancelPercent}%`,
      row.reject,
      `${row.rejectPercent}%`,
      row.return,
      row.returnAmount,
      row.netRevenue,
    ]);
    if (totals) {
      csvRows.push([
        'TOTAL',
        totals.orders,
        totals.products,
        totals.grossSales,
        totals.delivered,
        `${totals.deliveryPercent}%`,
        totals.cancel,
        `${totals.cancelPercent}%`,
        totals.reject,
        `${totals.rejectPercent}%`,
        totals.return,
        totals.returnAmount,
        totals.netRevenue,
      ]);
    }
    const csv = [headers, ...csvRows].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-dashboard-${startDate || 'start'}-${endDate || 'end'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-5 p-4 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <FaChartBar className="text-indigo-600" />
              Reports Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">Agent-level order quality, revenue, cancellation, rejection, and return performance.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Start Date</span>
              <AdminDateInput value={startDate} onValueChange={setStartDate} className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">End Date</span>
              <AdminDateInput value={endDate} onValueChange={setEndDate} className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!data || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <FaDownload /> Export
            </button>
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard icon={<FaUserTie />} label="Agents" value={fmt(rows.length)} />
          <MetricCard icon={<FaTruck />} label="Delivered" value={fmt(totals?.delivered || 0)} />
          <MetricCard icon={<FaMoneyBillWave />} label="Gross Sales" value={money(totals?.grossSales || 0)} />
          <MetricCard icon={<FaUndo />} label="Return Amount" value={money(totals?.returnAmount || 0)} />
          <MetricCard icon={<FaRedo />} label="Net Revenue" value={money(totals?.netRevenue || 0)} accent />
        </div>

        {topNetRevenue && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Top net revenue: <span className="font-bold">{topNetRevenue.agent}</span> with <span className="font-bold">{money(topNetRevenue.netRevenue)}</span>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">Agent Performance Table</h2>
              <p className="text-xs text-gray-500">Range: {data?.startDate || startDate} to {data?.endDate || endDate}</p>
            </div>
            {loading && <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  {['Agent', 'Orders', 'Products', 'Gross Sales', 'Delivered', 'Delivery %', 'Cancel', 'Cancel %', 'Reject', 'Reject %', 'Return', 'Return Amount', 'Net Revenue'].map((header, index) => (
                    <th key={header} className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide ${index === 0 ? 'sticky left-0 z-10 bg-slate-800 text-left' : 'text-right'}`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-gray-400">No dashboard data found for this date range.</td>
                  </tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.agentId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-indigo-50/40`}>
                    <td className={`sticky left-0 z-10 px-3 py-3 font-semibold text-gray-900 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>{row.agent}</td>
                    <NumberCell value={row.orders} />
                    <NumberCell value={row.products} />
                    <MoneyCell value={row.grossSales} strong />
                    <NumberCell value={row.delivered} tone="emerald" />
                    <PercentCell value={row.deliveryPercent} />
                    <NumberCell value={row.cancel} tone="red" />
                    <PercentCell value={row.cancelPercent} goodHigh={false} />
                    <NumberCell value={row.reject} tone="rose" />
                    <PercentCell value={row.rejectPercent} goodHigh={false} />
                    <NumberCell value={row.return} tone="orange" />
                    <MoneyCell value={row.returnAmount} />
                    <MoneyCell value={row.netRevenue} strong tone="emerald" />
                  </tr>
                ))}
              </tbody>
              {totals && rows.length > 0 && (
                <tfoot className="bg-slate-900 text-white">
                  <tr>
                    <td className="sticky left-0 z-10 bg-slate-900 px-3 py-3 font-bold uppercase">Total</td>
                    <FooterCell>{fmt(totals.orders)}</FooterCell>
                    <FooterCell>{fmt(totals.products)}</FooterCell>
                    <FooterCell>{money(totals.grossSales)}</FooterCell>
                    <FooterCell>{fmt(totals.delivered)}</FooterCell>
                    <FooterCell>{percent(totals.deliveryPercent)}</FooterCell>
                    <FooterCell>{fmt(totals.cancel)}</FooterCell>
                    <FooterCell>{percent(totals.cancelPercent)}</FooterCell>
                    <FooterCell>{fmt(totals.reject)}</FooterCell>
                    <FooterCell>{percent(totals.rejectPercent)}</FooterCell>
                    <FooterCell>{fmt(totals.return)}</FooterCell>
                    <FooterCell>{money(totals.returnAmount)}</FooterCell>
                    <FooterCell>{money(totals.netRevenue)}</FooterCell>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function MetricCard({ icon, label, value, accent = false }: { icon: ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-800'}`}>
      <div className="mb-2 flex items-center justify-between text-lg">{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}

function NumberCell({ value, tone }: { value: number; tone?: 'emerald' | 'red' | 'rose' | 'orange' }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : tone === 'rose' ? 'text-rose-700' : tone === 'orange' ? 'text-orange-700' : 'text-gray-800';
  return <td className={`px-3 py-3 text-right font-semibold tabular-nums ${toneClass}`}>{fmt(value)}</td>;
}

function MoneyCell({ value, strong = false, tone }: { value: number; strong?: boolean; tone?: 'emerald' }) {
  return <td className={`px-3 py-3 text-right tabular-nums ${strong ? 'font-bold' : 'font-semibold'} ${tone === 'emerald' ? 'text-emerald-700' : 'text-gray-900'}`}>{money(value)}</td>;
}

function PercentCell({ value, goodHigh = true }: { value: number; goodHigh?: boolean }) {
  return (
    <td className="px-3 py-3 text-right tabular-nums">
      <span className={`inline-flex min-w-[58px] justify-center rounded-full px-2 py-1 text-xs font-bold ${ratioClass(value, goodHigh)}`}>
        {percent(value)}
      </span>
    </td>
  );
}

function FooterCell({ children }: { children: ReactNode }) {
  return <td className="px-3 py-3 text-right font-bold tabular-nums">{children}</td>;
}
