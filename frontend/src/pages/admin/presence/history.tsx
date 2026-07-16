import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { FaArrowLeft, FaCircle, FaFilter, FaSyncAlt } from 'react-icons/fa';

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

function formatTime(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB');
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthRangeParams(monthValue: string) {
  const [yearRaw, monthRaw] = String(monthValue || getCurrentMonthValue()).split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const from = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const to = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function getDayKey(value?: string | null) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA');
}

function StatusPill({ state }: { state: string }) {
  const online = state === 'online';
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${
      online ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'
    }`}>
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
      {online ? 'Checked In' : 'Checked Out'}
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
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [presenceSearch, setPresenceSearch] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<PresenceDashboard | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const canViewAllHistory = hasPermission('view-presence') || hasPermission('view-presence-history') || hasPermission('manage-presence-history');
  const canViewHistory = true;

  const load = async () => {
    if (!canViewHistory) return;
    setLoading(true);
    setMessage('');
    try {
      const params = getMonthRangeParams(month);
      const summaryEndpoint = canViewAllHistory ? '/presence/dashboard' : '/presence/me/summary';
      const historyEndpoint = canViewAllHistory ? '/presence/history' : '/presence/me/history';
      const [dashboardRes, historyRes] = await Promise.all([
        apiClient.get(summaryEndpoint, { params }),
        apiClient.get(historyEndpoint, { params }),
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
  }, [month, canViewAllHistory, canViewHistory]);

  const eventsByUser = useMemo(() => {
    const map = new Map<number, any[]>();
    history.forEach((event) => {
      const userId = Number(event.userId);
      const list = map.get(userId) || [];
      list.push(event);
      map.set(userId, list);
    });
    map.forEach((list) => {
      list.sort((a, b) => new Date(a.startedAt || a.occurredAt || 0).getTime() - new Date(b.startedAt || b.occurredAt || 0).getTime());
    });
    return map;
  }, [history]);

  const checkedInRows = useMemo(() => {
    const q = presenceSearch.trim().toLowerCase();
    return (dashboard?.items || []).filter((row) => {
      if (row.currentState !== 'online') return false;
      if (!q) return true;
      return [row.name, row.email, row.phone, String(row.userId)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    }).map((row) => {
      const userEvents = eventsByUser.get(Number(row.userId)) || [];
      const lastEntry = [...userEvents].reverse().find((event) => event.state === 'online');
      const lastOut = [...userEvents].reverse().find((event) => event.state === 'offline');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const changedAt = row.lastChangedAt ? new Date(row.lastChangedAt) : null;
      const fallbackEntryAt = changedAt && changedAt < todayStart ? todayStart.toISOString() : row.lastChangedAt;
      return {
        ...row,
        entryTime: formatTime(lastEntry?.startedAt || lastEntry?.occurredAt || fallbackEntryAt),
        outTime: row.currentState === 'online' ? '-' : formatTime(lastOut?.startedAt || lastOut?.occurredAt),
        todayDuration: secondsToHuman(row.seconds?.online),
      };
    });
  }, [dashboard?.items, eventsByUser, presenceSearch]);

  const dailyHistoryRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const grouped = new Map<string, any>();

    const ensureRow = (event: any, dayKey: string, dateValue: string | Date) => {
      const key = `${event.userId}:${dayKey}`;
      const existing = grouped.get(key);
      if (existing) return existing;
      const date = dateValue instanceof Date ? dateValue.toISOString() : dateValue;
      const row = {
        key,
        userId: event.userId,
        name: event.name,
        email: event.email,
        dayKey,
        dateLabel: formatDate(date),
        status: event.state,
        lastEntryAt: null,
        lastOutAt: null,
        durationSeconds: 0,
        lastEventAt: 0,
        sortAt: 0,
      };
      grouped.set(key, row);
      return row;
    };

    const addCheckedInDuration = (event: any) => {
      const start = new Date(event.startedAt || event.occurredAt || 0);
      const end = new Date(event.endedAt || event.startedAt || event.occurredAt || 0);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return;

      let cursor = new Date(start);
      while (cursor < end) {
        const dayEnd = new Date(cursor);
        dayEnd.setHours(23, 59, 59, 999);
        const segmentEnd = end < dayEnd ? end : dayEnd;
        const dayKey = getDayKey(cursor.toISOString());
        if (dayKey) {
          const row = ensureRow(event, dayKey, cursor);
          row.durationSeconds += Math.max(0, Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000));
          if (!row.lastEntryAt || cursor.getTime() > new Date(row.lastEntryAt).getTime()) {
            row.lastEntryAt = cursor.toISOString();
          }
          row.sortAt = Math.max(row.sortAt, cursor.getTime());
        }
        cursor = new Date(dayEnd.getTime() + 1);
      }
    };

    history.forEach((event) => {
      const startedAtValue = event.startedAt || event.occurredAt;
      const dayKey = getDayKey(startedAtValue);
      if (!dayKey) return;
      const existing = ensureRow(event, dayKey, startedAtValue);

      const startedTime = new Date(startedAtValue || 0).getTime();
      if (Number.isFinite(startedTime)) existing.sortAt = Math.max(existing.sortAt, startedTime);
      if (Number.isFinite(startedTime) && event.state === 'online') {
        existing.lastEntryAt = !existing.lastEntryAt || startedTime > new Date(existing.lastEntryAt).getTime()
          ? startedAtValue
          : existing.lastEntryAt;
        addCheckedInDuration(event);
      }
      if (Number.isFinite(startedTime) && event.state === 'offline') {
        existing.lastOutAt = !existing.lastOutAt || startedTime > new Date(existing.lastOutAt).getTime()
          ? startedAtValue
          : existing.lastOutAt;
      }
      if (Number.isFinite(startedTime) && startedTime >= existing.lastEventAt) {
        existing.lastEventAt = startedTime;
        existing.status = event.state;
      }
    });

    return Array.from(grouped.values())
      .filter((row) => {
        if (!q) return true;
        return [row.name, row.email, String(row.userId)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) => b.sortAt - a.sortAt);
  }, [history, search]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <Link href="/admin/presence" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
              <FaArrowLeft />
              Presence
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Presence History</h1>
            <p className="text-gray-600 mt-1">
              {canViewAllHistory ? 'Review employee check-in/out history by month.' : 'Review your own check-in/out history by month.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
            You do not have permission to view presence history.
          </div>
        )}

        {message && (
          <div className="bg-white border border-blue-100 text-blue-800 rounded-lg px-4 py-3 text-sm shadow-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Stat label="Checked In Now" value={dashboard?.totals?.onlineNow || 0} icon={<FaCircle />} />
          <Stat label="Checked Out Now" value={dashboard?.totals?.offlineNow || 0} icon={<FaCircle />} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Currently Checked In</h2>
              <p className="text-sm text-gray-500">
                Showing {checkedInRows.length} checked-in employees
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
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Entry Time</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Out Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {checkedInRows.map((row) => (
                  <tr key={row.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-500">{row.email || row.phone || `User #${row.userId}`}</div>
                    </td>
                    <td className="px-4 py-3"><StatusPill state={row.currentState} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.entryTime}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{row.todayDuration}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.outTime}</td>
                  </tr>
                ))}
                {!loading && checkedInRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      No employees are currently checked in.
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
              <h2 className="text-lg font-bold text-gray-900">{canViewAllHistory ? 'All Employee History' : 'My History'}</h2>
              <p className="text-sm text-gray-500">Showing {dailyHistoryRows.length} daily records</p>
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
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Entry Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Out Time</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Last Duration</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {dailyHistoryRows.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-500">{row.email || `User #${row.userId}`} {row.dateLabel ? `- ${row.dateLabel}` : ''}</div>
                    </td>
                    <td className="px-4 py-3"><StatusPill state={row.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(row.lastEntryAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(row.lastOutAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{secondsToHuman(row.durationSeconds)}</td>
                  </tr>
                ))}
                {!loading && dailyHistoryRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
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
