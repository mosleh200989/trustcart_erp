import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Pagination from '@/components/admin/Pagination';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FaDatabase, FaFileExport, FaSyncAlt } from 'react-icons/fa';

type AccessRow = {
  id: number;
  userId: number | null;
  userName: string | null;
  roleName: string | null;
  resource: string;
  action: string;
  recordCount: number;
  recordId?: string | null;
  filters: Record<string, string>;
  ipAddress?: string | null;
  createdAt: string;
};

type AccessStatistics = {
  days: number;
  totals: {
    readsToday: number;
    recordsToday: number;
    exportsToday: number;
    recordsExported: number;
    readersToday: number;
    biggestSingleRead: number;
    readsRecorded: number;
  };
  byUser: Array<{
    userId: number | null;
    userName: string;
    roleName: string;
    reads: number;
    records: number;
    recordsToday: number;
    exports: number;
    biggestRead: number;
    activeDays: number;
    averagePerDay: number;
    lastRead: string;
  }>;
  byResource: Array<{ resource: string; action: string; reads: number; records: number }>;
};

const ACTION_STYLES: Record<string, string> = {
  export: 'bg-red-100 text-red-700',
  list: 'bg-blue-100 text-blue-700',
  view: 'bg-gray-100 text-gray-700',
  search: 'bg-amber-100 text-amber-800',
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function Tile({ label, value, hint, tone = 'default' }: {
  label: string; value: string | number; hint?: string; tone?: 'default' | 'warn' | 'bad';
}) {
  const toneClass = tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-gray-900';
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

export default function DataAccessPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const canView = hasPermission('view-data-access-log');

  const [stats, setStats] = useState<AccessStatistics | null>(null);
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(false);

  const [days, setDays] = useState(30);
  const [action, setAction] = useState('all');
  const [minRecords, setMinRecords] = useState('0');
  const [userFilter, setUserFilter] = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        apiClient.get('/data-access/statistics', { params: { days } }),
        apiClient.get('/data-access', {
          params: {
            days,
            action: action === 'all' ? undefined : action,
            minRecords: Number(minRecords) > 0 ? minRecords : undefined,
            userId: userFilter?.id,
            page,
            limit,
          },
        }),
      ]);
      setStats(statsRes.data);
      setRows(Array.isArray(listRes.data?.rows) ? listRes.data.rows : []);
      setTotal(Number(listRes.data?.total) || 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load the data access log.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, days, action, minRecords, userFilter?.id, page, limit]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, days, action, minRecords, userFilter?.id, page]);

  if (!canView) {
    return (
      <AdminLayout>
        <div className="rounded-lg border border-red-100 bg-white px-4 py-3 text-sm text-red-700 shadow-sm">
          You do not have permission to view the data access log.
        </div>
      </AdminLayout>
    );
  }

  const totals = stats?.totals;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          backHref="/admin/users"
          backLabel="Users"
          eyebrow="Users Module"
          icon={<FaDatabase />}
          title="Data Access"
          description="Who has been reading and exporting customer data, and in what volume."
          actions={<>
            <select
              value={days}
              onChange={(event) => { setDays(Number(event.target.value)); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              aria-label="Period"
            >
              <option value={1}>Today</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </>}
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Tile label="Records read today" value={totals?.recordsToday ?? 0} hint={`${totals?.readsToday ?? 0} reads`} />
          <Tile label="People reading today" value={totals?.readersToday ?? 0} hint="Distinct accounts" />
          <Tile
            label="Exports today"
            value={totals?.exportsToday ?? 0}
            tone={(totals?.exportsToday ?? 0) > 0 ? 'warn' : 'default'}
            hint={`${totals?.recordsExported ?? 0} rows exported in ${stats?.days ?? days} days`}
          />
          <Tile
            label="Biggest single read"
            value={totals?.biggestSingleRead ?? 0}
            tone={(totals?.biggestSingleRead ?? 0) >= 500 ? 'warn' : 'default'}
            hint="Records returned in one request"
          />
          <Tile label="Reads recorded" value={totals?.readsRecorded ?? 0} hint="Since logging began" />
          <Tile label="Period" value={`${stats?.days ?? days} d`} hint="Statistics window" />
        </div>

        {/* ------------------------------------------------------- by reader */}
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">By reader</h2>
            <p className="text-xs text-gray-500">
              Each person against their own daily average — today far above it is the signal worth looking at.
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Reader</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-right">Records</th>
                  <th className="px-4 py-2 text-right">Today</th>
                  <th className="px-4 py-2 text-right">Daily avg</th>
                  <th className="px-4 py-2 text-right">Biggest read</th>
                  <th className="px-4 py-2 text-right">Exports</th>
                  <th className="px-4 py-2 text-left">Last read</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.byUser || []).map((row) => {
                  const aboveNorm = row.averagePerDay > 0 && row.recordsToday > row.averagePerDay * 3;
                  return (
                    <tr key={String(row.userId)} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">{row.userName}</td>
                      <td className="px-4 py-2 text-gray-700">{row.roleName}</td>
                      <td className="px-4 py-2 text-right font-semibold">{row.records.toLocaleString()}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${aboveNorm ? 'text-red-600' : 'text-gray-900'}`}>
                        {row.recordsToday.toLocaleString()}
                        {aboveNorm && <span className="ml-1 text-xs font-normal">▲</span>}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">{row.averagePerDay.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{row.biggestRead.toLocaleString()}</td>
                      <td className={`px-4 py-2 text-right ${row.exports > 0 ? 'font-semibold text-red-600' : ''}`}>
                        {row.exports}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{formatDateTime(row.lastRead)}</td>
                      <td className="px-4 py-2 text-right">
                        {row.userId != null && (
                          <button
                            type="button"
                            onClick={() => { setUserFilter({ id: row.userId!, name: row.userName }); setPage(1); }}
                            className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Reads
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(stats?.byUser || []).length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                    {loading ? 'Loading...' : 'Nothing read in this period.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ----------------------------------------------------- what is read */}
        {(stats?.byResource?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2">
            {stats!.byResource.map((row) => (
              <span
                key={`${row.resource}-${row.action}`}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm"
              >
                {row.action === 'export' && <FaFileExport className="text-red-500" />}
                {row.resource} · {row.action}
                <span className="text-gray-400">{row.records.toLocaleString()} records / {row.reads} reads</span>
              </span>
            ))}
          </div>
        )}

        {/* ------------------------------------------------------- the log */}
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Access log</h2>
              <p className="text-xs text-gray-500">One row per read. The log is append-only and ages out after a year.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={action}
                onChange={(event) => { setAction(event.target.value); setPage(1); }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                aria-label="Action"
              >
                <option value="all">All actions</option>
                <option value="export">Exports</option>
                <option value="list">List views</option>
                <option value="view">Single records</option>
              </select>
              <select
                value={minRecords}
                onChange={(event) => { setMinRecords(event.target.value); setPage(1); }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                aria-label="Minimum records"
              >
                <option value="0">Any size</option>
                <option value="100">100+ records</option>
                <option value="500">500+ records</option>
                <option value="1000">1,000+ records</option>
              </select>
            </div>
          </header>

          {userFilter && (
            <div className="flex items-center justify-between gap-3 bg-blue-50 px-4 py-2 text-sm text-blue-800">
              <span>Showing reads by <strong>{userFilter.name}</strong>.</span>
              <button
                type="button"
                onClick={() => { setUserFilter(null); setPage(1); }}
                className="font-semibold text-blue-700 hover:text-blue-900"
              >
                Show everyone
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">When</th>
                  <th className="px-4 py-2 text-left">Reader</th>
                  <th className="px-4 py-2 text-left">What</th>
                  <th className="px-4 py-2 text-right">Records</th>
                  <th className="px-4 py-2 text-left">Filters</th>
                  <th className="px-4 py-2 text-left">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{formatDateTime(row.createdAt)}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{row.userName || `#${row.userId ?? '?'}`}</div>
                      {row.roleName && <div className="text-xs text-gray-500">{row.roleName}</div>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_STYLES[row.action] || 'bg-gray-100 text-gray-700'}`}>
                        {row.action}
                      </span>
                      <span className="ml-2 text-gray-700">{row.resource}</span>
                      {row.recordId && <span className="ml-1 text-xs text-gray-400">#{row.recordId}</span>}
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${row.recordCount >= 500 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {row.recordCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {Object.keys(row.filters || {}).length === 0
                        ? <span className="text-gray-400">none</span>
                        : Object.entries(row.filters).map(([key, value]) => `${key}=${value}`).join(' · ')}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{row.ipAddress || '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    {loading ? 'Loading...' : 'No reads match these filters.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div className="border-t border-gray-100 px-4 py-3">
              <Pagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(total / limit))}
                onPageChange={setPage}
              />
            </div>
          )}
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
            {total.toLocaleString()} read{total === 1 ? '' : 's'} match these filters
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
