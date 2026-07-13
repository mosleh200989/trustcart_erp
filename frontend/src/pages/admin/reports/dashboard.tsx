import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminDateInput from '@/components/admin/AdminDateInput';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { getDhakaDateString } from '@/utils/dhakaDate';
import { FaChartBar, FaChevronDown, FaChevronRight, FaDownload, FaMoneyBillWave, FaRedo, FaSyncAlt, FaTruck, FaUndo, FaUserTie } from 'react-icons/fa';

type PerformanceRow = {
  orders: number;
  products: number;
  grossSales: number;
  sentParcels: number;
  courierParcelAmount: number;
  delivered: number;
  deliveredGross: number;
  deliveryPercent: number;
  cancel: number;
  cancelledGross: number;
  cancelPercent: number;
  reject: number;
  rejectPercent: number;
  return: number;
  returnAmount: number;
  partialDelivered: number;
  partialCollectedAmount: number;
  partialReturnAmount: number;
  crossSellOrders: number;
  crossSellPercent: number;
  crossSellAmount: number;
  netRevenue: number;
};

type DashboardRow = PerformanceRow & {
  agentId: number;
  agent: string;
  teamLeaderId?: number | null;
  teamLeaderName?: string | null;
};

type SourceDashboardRow = PerformanceRow & {
  sourceKey: string;
  sourceType: 'website' | 'landing_page' | string;
  sourceLabel: string;
};

type DashboardData = {
  startDate: string;
  endDate: string;
  rows: DashboardRow[];
  totals: PerformanceRow;
  sourceRows: SourceDashboardRow[];
  sourceTotals: PerformanceRow;
};

type PerformanceGroup<T extends PerformanceRow> = {
  key: string;
  label: string;
  badge: string;
  rows: T[];
  totals: PerformanceRow;
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

function sumPerformanceRows(rows: PerformanceRow[]): PerformanceRow {
  const totals = rows.reduce<PerformanceRow>((acc, row) => {
    acc.orders += row.orders;
    acc.products += row.products;
    acc.grossSales += row.grossSales;
    acc.sentParcels += row.sentParcels;
    acc.courierParcelAmount += row.courierParcelAmount;
    acc.delivered += row.delivered;
    acc.deliveredGross += row.deliveredGross;
    acc.cancel += row.cancel;
    acc.cancelledGross += row.cancelledGross;
    acc.reject += row.reject;
    acc.return += row.return;
    acc.returnAmount += row.returnAmount;
    acc.partialDelivered += row.partialDelivered;
    acc.partialCollectedAmount += row.partialCollectedAmount;
    acc.partialReturnAmount += row.partialReturnAmount;
    acc.crossSellOrders += row.crossSellOrders;
    acc.crossSellAmount += row.crossSellAmount;
    acc.netRevenue += row.netRevenue;
    return acc;
  }, {
    orders: 0,
    products: 0,
    grossSales: 0,
    sentParcels: 0,
    courierParcelAmount: 0,
    delivered: 0,
    deliveredGross: 0,
    deliveryPercent: 0,
    cancel: 0,
    cancelledGross: 0,
    cancelPercent: 0,
    reject: 0,
    rejectPercent: 0,
    return: 0,
    returnAmount: 0,
    partialDelivered: 0,
    partialCollectedAmount: 0,
    partialReturnAmount: 0,
    crossSellOrders: 0,
    crossSellPercent: 0,
    crossSellAmount: 0,
    netRevenue: 0,
  });

  totals.deliveryPercent = totals.orders ? Number(((totals.delivered / totals.orders) * 100).toFixed(1)) : 0;
  totals.cancelPercent = totals.orders ? Number(((totals.cancel / totals.orders) * 100).toFixed(1)) : 0;
  totals.rejectPercent = totals.orders ? Number(((totals.reject / totals.orders) * 100).toFixed(1)) : 0;
  totals.crossSellPercent = totals.delivered ? Number(((totals.crossSellOrders / totals.delivered) * 100).toFixed(1)) : 0;
  return totals;
}

export default function ReportsDashboardPage() {
  const { hasPermission, isLoading: authLoading } = useAuth();
  const canViewReportsDashboard = hasPermission('view-reports-dashboard');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(() => getDhakaDateString());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());

  const loadDashboard = useCallback(async () => {
    if (!canViewReportsDashboard) return;
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
  }, [canViewReportsDashboard, startDate, endDate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const rows = data?.rows || [];
  const totals = data?.totals;
  const sourceRows = data?.sourceRows || [];
  const sourceTotals = data?.sourceTotals;

  const agentGroups = useMemo<PerformanceGroup<DashboardRow>[]>(() => {
    const groups = new Map<string, { key: string; label: string; rows: DashboardRow[] }>();
    for (const row of rows) {
      const teamLeaderId = row.teamLeaderId ?? null;
      const key = teamLeaderId ? `tl-${teamLeaderId}` : 'unassigned';
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: row.teamLeaderName || 'Unassigned Team Leader',
          rows: [],
        });
      }
      groups.get(key)!.rows.push(row);
    }
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        badge: `${group.rows.length} agent${group.rows.length === 1 ? '' : 's'}`,
        totals: sumPerformanceRows(group.rows),
      }))
      .sort((a, b) => {
        if (a.key === 'unassigned') return 1;
        if (b.key === 'unassigned') return -1;
        return b.totals.orders - a.totals.orders || b.totals.netRevenue - a.totals.netRevenue || a.label.localeCompare(b.label);
      });
  }, [rows]);

  const toggleTeamCollapse = (key: string) => {
    setCollapsedTeams((previous) => {
      const next = new Set(previous);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const topNetRevenue = useMemo(() => {
    return [...rows, ...sourceRows].sort((a, b) => b.netRevenue - a.netRevenue)[0];
  }, [rows, sourceRows]);
  const topNetRevenueLabel = topNetRevenue
    ? 'agent' in topNetRevenue
      ? topNetRevenue.agent
      : topNetRevenue.sourceLabel
    : '';

  const exportCsv = () => {
    if (!data) return;
    const headers = ['Name', 'Orders', 'Products', 'Gross Sales', 'Courier Parcel Amount', 'Delivered', 'Delivered Gross', 'Cancelled + Returned', 'Cancelled + Returned Gross', 'Partial Delivered', 'Partial Collected Amount', 'Net Revenue'];
    const sourceHeaders = ['Name', 'Orders', 'Products', 'Cross Sell %', 'Cross Sell Amount', 'Gross Sales', 'Courier Parcel Amount', 'Delivered', 'Delivered Gross', 'Cancelled + Returned', 'Cancelled + Returned Gross', 'Partial Delivered', 'Partial Collected Amount', 'Net Revenue'];
    const toCsvRow = (name: string, row: PerformanceRow) => [
      name,
      row.orders,
      row.products,
      row.grossSales,
      row.courierParcelAmount,
      row.delivered,
      row.deliveredGross,
      row.cancel + row.return,
      row.cancelledGross + row.returnAmount,
      row.partialDelivered,
      row.partialCollectedAmount,
      row.netRevenue,
    ];
    const toSourceCsvRow = (name: string, row: PerformanceRow) => [
      name,
      row.orders,
      row.products,
      `${row.crossSellPercent}%`,
      row.crossSellAmount,
      row.grossSales,
      row.courierParcelAmount,
      row.delivered,
      row.deliveredGross,
      row.cancel + row.return,
      row.cancelledGross + row.returnAmount,
      row.partialDelivered,
      row.partialCollectedAmount,
      row.netRevenue,
    ];
    const csvRows: Array<Array<string | number>> = [
      ['Agent Performance'],
      headers,
      ...rows.map((row) => toCsvRow(row.agent, row)),
    ];
    if (totals) {
      csvRows.push(toCsvRow('TOTAL', totals));
    }
    csvRows.push([], ['Website / Landing Page Performance'], sourceHeaders);
    csvRows.push(...sourceRows.map((row) => toSourceCsvRow(row.sourceLabel, row)));
    if (sourceTotals) {
      csvRows.push(toSourceCsvRow('TOTAL', sourceTotals));
    }
    const csv = csvRows.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-dashboard-${startDate || 'start'}-${endDate || 'end'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center text-gray-500">Checking permissions...</div>
      </AdminLayout>
    );
  }

  if (!canViewReportsDashboard) {
    return (
      <AdminLayout>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          You do not have permission to view Reports Dashboard.
        </div>
      </AdminLayout>
    );
  }

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
          <MetricCard icon={<FaTruck />} label="Sent Parcels" value={fmt((totals?.sentParcels || 0) + (sourceTotals?.sentParcels || 0))} />
          <MetricCard icon={<FaMoneyBillWave />} label="Courier Parcel Amount" value={money((totals?.courierParcelAmount || 0) + (sourceTotals?.courierParcelAmount || 0))} />
          <MetricCard icon={<FaUndo />} label="Partial Returned Amount" value={money((totals?.partialReturnAmount || 0) + (sourceTotals?.partialReturnAmount || 0))} />
          <MetricCard icon={<FaRedo />} label="Net Revenue" value={money((totals?.netRevenue || 0) + (sourceTotals?.netRevenue || 0))} accent />
        </div>

        {topNetRevenue && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Top net revenue: <span className="font-bold">{topNetRevenueLabel}</span> with <span className="font-bold">{money(topNetRevenue.netRevenue)}</span>
          </div>
        )}

        <PerformanceTable
          title="Agent Performance Table"
          subtitle="Agent/admin orders with courier sent amount, status counts, gross amounts, and partial delivery returns."
          firstColumn="Agent"
          rows={rows}
          totals={totals}
          loading={loading}
          getKey={(row) => String(row.agentId)}
          getLabel={(row) => row.agent}
          groups={agentGroups}
          collapsedGroups={collapsedTeams}
          onToggleGroup={toggleTeamCollapse}
          emptyText="No agent performance data found for this date range."
        />

        <PerformanceTable
          title="Website / Landing Page Performance Table"
          subtitle="Website total and landing-page-wise rows with the same courier and return metrics."
          firstColumn="Source"
          rows={sourceRows}
          totals={sourceTotals}
          loading={loading}
          getKey={(row) => row.sourceKey}
          getLabel={(row) => row.sourceLabel}
          getBadge={(row) => row.sourceType === 'website' ? 'Website' : 'Landing Page'}
          showCrossSellMetrics
          emptyText="No website or landing page data found for this date range."
        />
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

function PerformanceTable<T extends PerformanceRow>({
  title,
  subtitle,
  firstColumn,
  rows,
  totals,
  loading,
  getKey,
  getLabel,
  getBadge,
  groups,
  collapsedGroups,
  onToggleGroup,
  showCrossSellMetrics = false,
  emptyText,
}: {
  title: string;
  subtitle: string;
  firstColumn: string;
  rows: T[];
  totals?: PerformanceRow;
  loading: boolean;
  getKey: (row: T) => string;
  getLabel: (row: T) => string;
  getBadge?: (row: T) => string | undefined;
  groups?: PerformanceGroup<T>[];
  collapsedGroups?: Set<string>;
  onToggleGroup?: (key: string) => void;
  showCrossSellMetrics?: boolean;
  emptyText: string;
}) {
  const headers = [
    firstColumn,
    'Orders',
    'Products',
    ...(showCrossSellMetrics ? ['Cross Sell %', 'Cross Sell Amount'] : []),
    'Gross Sales',
    'Courier Amount',
    'Delivered',
    'Delivered Gross',
    'Cancelled + Returned',
    'Cancelled + Returned Gross',
    'Partial Delivered',
    'Partial Collected',
    'Net Revenue',
  ];
  const hasGroups = !!groups?.length;

  const renderMetricCells = (row: PerformanceRow, options: { group?: boolean } = {}) => (
    <>
      <NumberCell value={row.orders} className={options.group ? 'text-indigo-900' : undefined} />
      <NumberCell value={row.products} />
      {showCrossSellMetrics && <PercentCell value={row.crossSellPercent} />}
      {showCrossSellMetrics && <MoneyCell value={row.crossSellAmount} />}
      <MoneyCell value={row.grossSales} strong />
      <MoneyCell value={row.courierParcelAmount} />
      <NumberCell value={row.delivered} tone="emerald" />
      <MoneyCell value={row.deliveredGross} />
      <NumberCell value={row.cancel + row.return} tone="red" />
      <MoneyCell value={row.cancelledGross + row.returnAmount} />
      <NumberCell value={row.partialDelivered} tone="orange" />
      <MoneyCell value={row.partialCollectedAmount} />
      <MoneyCell value={row.netRevenue} strong tone="emerald" />
    </>
  );

  const renderDataRow = (row: T, index: number, nested = false) => {
    const badge = getBadge?.(row);
    const baseBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
    const stickyBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
    return (
      <tr key={getKey(row)} className={`${baseBg} hover:bg-indigo-50/40`}>
        <td className={`sticky left-0 z-10 px-3 py-3 font-semibold text-gray-900 ${stickyBg}`}>
          <div className={nested ? 'pl-6' : undefined}>{getLabel(row)}</div>
          {badge && <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{badge}</span>}
        </td>
        {renderMetricCells(row)}
      </tr>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        {loading && <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />}
      </div>
      <div className="overflow-x-auto">
        <table className={`${showCrossSellMetrics ? 'min-w-[1500px]' : 'min-w-[1300px]'} w-full text-sm`}>
          <thead className="bg-slate-800 text-white">
            <tr>
              {headers.map((header, index) => (
                <th key={header} className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide ${index === 0 ? 'sticky left-0 z-10 bg-slate-800 text-left' : 'text-right'}`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-gray-400">{emptyText}</td>
              </tr>
            )}
            {hasGroups
              ? groups!.map((group) => {
                const isCollapsed = collapsedGroups?.has(group.key) || false;
                return (
                  <Fragment key={group.key}>
                    <tr className="border-y border-indigo-100 bg-indigo-50/90">
                      <td className="sticky left-0 z-20 bg-indigo-50 px-3 py-3 font-semibold text-indigo-900">
                        <button
                          type="button"
                          onClick={() => onToggleGroup?.(group.key)}
                          className="flex items-center gap-2 text-left hover:text-indigo-950"
                        >
                          {isCollapsed ? <FaChevronRight className="text-xs" /> : <FaChevronDown className="text-xs" />}
                          <span>{group.label}</span>
                          <span className="rounded-full border border-indigo-100 bg-white px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                            {group.badge}
                          </span>
                        </button>
                      </td>
                      {renderMetricCells(group.totals, { group: true })}
                    </tr>
                    {!isCollapsed && group.rows.map((row, index) => renderDataRow(row, index, true))}
                  </Fragment>
                );
              })
              : rows.map((row, index) => renderDataRow(row, index))}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot className="bg-slate-900 text-white">
              <tr>
                <td className="sticky left-0 z-10 bg-slate-900 px-3 py-3 font-bold uppercase">Total</td>
                <FooterCell>{fmt(totals.orders)}</FooterCell>
                <FooterCell>{fmt(totals.products)}</FooterCell>
                {showCrossSellMetrics && <FooterCell>{percent(totals.crossSellPercent)}</FooterCell>}
                {showCrossSellMetrics && <FooterCell>{money(totals.crossSellAmount)}</FooterCell>}
                <FooterCell>{money(totals.grossSales)}</FooterCell>
                <FooterCell>{money(totals.courierParcelAmount)}</FooterCell>
                <FooterCell>{fmt(totals.delivered)}</FooterCell>
                <FooterCell>{money(totals.deliveredGross)}</FooterCell>
                <FooterCell>{fmt(totals.cancel + totals.return)}</FooterCell>
                <FooterCell>{money(totals.cancelledGross + totals.returnAmount)}</FooterCell>
                <FooterCell>{fmt(totals.partialDelivered)}</FooterCell>
                <FooterCell>{money(totals.partialCollectedAmount)}</FooterCell>
                <FooterCell>{money(totals.netRevenue)}</FooterCell>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function NumberCell({ value, tone, className = '' }: { value: number; tone?: 'emerald' | 'red' | 'rose' | 'orange' | 'blue'; className?: string }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : tone === 'rose' ? 'text-rose-700' : tone === 'orange' ? 'text-orange-700' : tone === 'blue' ? 'text-blue-700' : 'text-gray-800';
  return <td className={`px-3 py-3 text-right font-semibold tabular-nums ${toneClass} ${className}`}>{fmt(value)}</td>;
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
