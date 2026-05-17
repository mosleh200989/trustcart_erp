import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { FaArrowLeft, FaCircle, FaFilter, FaSyncAlt, FaUserClock } from 'react-icons/fa';

type PresenceRow = {
  userId: number;
  name: string;
  email?: string;
  phone?: string | null;
  currentState: 'online' | 'offline';
  lastChangedAt?: string | null;
  lastSeenAt?: string | null;
  onlineCount: number;
  offlineCount: number;
  seconds: {
    online: number;
    offline: number;
  };
};

type PresenceDashboard = {
  items: PresenceRow[];
  totals: {
    users: number;
    onlineNow: number;
    offlineNow: number;
    onlineSeconds: number;
  };
};

function secondsToHuman(value: any) {
  const total = Number(value || 0);
  if (!Number.isFinite(total) || total <= 0) return '0m';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

function StatusPill({ state }: { state: string }) {
  const online = state === 'online';
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${
      online ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'
    }`}>
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

function Stat({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-gray-500">{label}</div>
        <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      </div>
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
}

export default function PresenceHistoryPage() {
  const { hasPermission } = useAuth();
  const [rangeDays, setRangeDays] = useState(7);
  const [stateFilter, setStateFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [presenceStateFilter, setPresenceStateFilter] = useState<'all' | 'currently_online' | 'offline'>('all');
  const [presenceSearch, setPresenceSearch] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<PresenceDashboard | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const canViewHistory = hasPermission('view-presence') || hasPermission('view-presence-history') || hasPermission('manage-presence-history');

  const load = async () => {
    if (!canViewHistory) return;
    setLoading(true);
    setMessage('');
    try {
      const [dashboardRes, historyRes] = await Promise.all([
        apiClient.get('/presence/dashboard', { params: { rangeDays } }),
        apiClient.get('/presence/history', { params: { rangeDays } }),
      ]);
      setDashboard(dashboardRes.data);
      setHistory(Array.isArray(historyRes.data?.items) ? historyRes.data.items : []);
    } catch (err: any) {
      setDashboard(null);
      setHistory([]);
      setMessage(err?.response?.data?.message || 'Failed to load presence history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays, canViewHistory]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((event) => {
      if (stateFilter !== 'all' && event.state !== stateFilter) return false;
      if (!q) return true;
      return [event.name, event.email, String(event.userId)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [history, search, stateFilter]);

  const filteredPresenceRows = useMemo(() => {
    const q = presenceSearch.trim().toLowerCase();
    return (dashboard?.items || []).filter((row) => {
      if (presenceStateFilter === 'currently_online' && row.currentState !== 'online') return false;
      if (presenceStateFilter === 'offline' && row.currentState !== 'offline') return false;
      if (!q) return true;
      return [row.name, row.email, row.phone, String(row.userId)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [dashboard?.items, presenceSearch, presenceStateFilter]);

  const totals = useMemo(() => {
    return filteredHistory.reduce(
      (acc, event) => {
        acc.events += 1;
        if (event.state === 'online') acc.online += 1;
        if (event.state === 'offline') acc.offline += 1;
        acc.seconds += Number(event.durationSeconds || 0);
        return acc;
      },
      { events: 0, online: 0, offline: 0, seconds: 0 },
    );
  }, [filteredHistory]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <Link href="/admin/presence" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
              <FaArrowLeft />
              Presence Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Presence History</h1>
            <p className="text-gray-600 mt-1">Review current office presence and online/offline history with user, duration, and source details.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={load}
              disabled={loading || !canViewHistory}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {!canViewHistory && (
          <div className="bg-white border border-red-100 text-red-700 rounded-lg px-4 py-3 text-sm shadow-sm">
            You do not have permission to view office presence history.
          </div>
        )}

        {message && (
          <div className="bg-white border border-blue-100 text-blue-800 rounded-lg px-4 py-3 text-sm shadow-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Stat label="Records" value={totals.events} icon={<FaUserClock />} />
          <Stat label="Online Now" value={dashboard?.totals?.onlineNow || 0} icon={<FaCircle />} />
          <Stat label="Offline Now" value={dashboard?.totals?.offlineNow || 0} icon={<FaCircle />} />
          <Stat label="Tracked Time" value={secondsToHuman(totals.seconds)} icon={<FaUserClock />} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">User Presence</h2>
              <p className="text-sm text-gray-500">
                Showing {filteredPresenceRows.length} of {dashboard?.items?.length || 0} users
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={presenceSearch}
                  onChange={(e) => setPresenceSearch(e.target.value)}
                  placeholder="Search user, email, phone"
                  className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm min-w-[240px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={presenceStateFilter}
                onChange={(e) => setPresenceStateFilter(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All users</option>
                <option value="currently_online">Currently online</option>
                <option value="offline">Offline now</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Online Count</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Offline Count</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Online Time</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Offline Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Changed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Seen</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredPresenceRows.map((row) => (
                  <tr key={row.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-500">{row.email || row.phone || `User #${row.userId}`}</div>
                    </td>
                    <td className="px-4 py-3"><StatusPill state={row.currentState} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.onlineCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.offlineCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{secondsToHuman(row.seconds?.online)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{secondsToHuman(row.seconds?.offline)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(row.lastChangedAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(row.lastSeenAt)}</td>
                  </tr>
                ))}
                {!loading && filteredPresenceRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                      No presence records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">All Employee History</h2>
              <p className="text-sm text-gray-500">Showing {filteredHistory.length} of {history.length} records</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user or email"
                  className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm min-w-[240px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All statuses</option>
                <option value="online">Online only</option>
                <option value="offline">Offline only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Started</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ended</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredHistory.map((event) => (
                  <tr key={`${event.userId}-${event.id}-${event.startedAt}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{event.name}</div>
                      <div className="text-xs text-gray-500">{event.email || `User #${event.userId}`}</div>
                    </td>
                    <td className="px-4 py-3"><StatusPill state={event.state} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(event.startedAt || event.occurredAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {event.isCurrentPeriod ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                          Now
                        </span>
                      ) : (
                        formatDateTime(event.endedAt)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{secondsToHuman(event.durationSeconds)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{event.source || '-'}</td>
                  </tr>
                ))}
                {!loading && filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      No history records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
