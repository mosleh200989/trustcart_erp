import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { FaCircle, FaSyncAlt, FaUserClock, FaUsers } from 'react-icons/fa';

type PresenceRow = {
  userId: number;
  name: string;
  email?: string;
  phone?: string | null;
  currentState: 'online' | 'offline';
  lastChangedAt?: string | null;
  lastSeenAt?: string | null;
  source?: string;
  onlineCount: number;
  offlineCount: number;
  seconds: {
    online: number;
    offline: number;
  };
};

type PresenceDashboard = {
  rangeDays: number;
  from: string;
  to: string;
  totals: {
    users: number;
    onlineNow: number;
    offlineNow: number;
    onlineSeconds: number;
    offlineSeconds: number;
    onlineCount: number;
    offlineCount: number;
  };
  items: PresenceRow[];
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

function getTodayRangeParams() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  return {
    from: from.toISOString(),
    to: new Date().toISOString(),
    rangeDays: 1,
  };
}

export default function PresencePage() {
  const { hasPermission } = useAuth();
  const [rangeDays, setRangeDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dashboard, setDashboard] = useState<PresenceDashboard | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [toggleLoading, setToggleLoading] = useState(false);

  const canViewOffice = hasPermission('view-presence');
  const canViewHistory = canViewOffice || hasPermission('view-presence-history') || hasPermission('manage-presence-history');
  const canManageSettings = hasPermission('manage-presence-settings');
  const canSyncSheet = hasPermission('sync-presence-sheet');

  const load = async () => {
    setLoading(true);
    try {
      const summaryParams = canViewOffice ? { rangeDays } : getTodayRangeParams();
      const myHistoryParams = getTodayRangeParams();
      const [summaryRes, historyRes] = await Promise.all([
        apiClient.get(canViewOffice ? '/presence/dashboard' : '/presence/me/summary', { params: summaryParams }),
        apiClient.get('/presence/me/history', { params: myHistoryParams }),
      ]);
      setDashboard(summaryRes.data);
      setHistory(Array.isArray(historyRes.data?.items) ? historyRes.data.items : []);
    } catch (err) {
      console.error('Failed to load presence dashboard', err);
      setDashboard(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays, canViewOffice]);

  const syncSheet = async () => {
    setMessage('');
    setSyncing(true);
    try {
      const res = await apiClient.post('/presence/sync/google-sheet');
      setMessage(`Google Sheet synced: ${res.data?.users || 0} users, ${res.data?.events || 0} events.`);
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || err?.response?.data?.error || 'Google Sheet sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const myPresence = dashboard?.items?.[0] || null;
  const myState = myPresence?.currentState === 'online' ? 'online' : 'offline';

  const toggleMyPresence = async () => {
    const next = myState === 'online' ? 'offline' : 'online';
    setToggleLoading(true);
    setMessage('');
    try {
      await apiClient.post('/presence/me', { state: next });
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to update your status.');
    } finally {
      setToggleLoading(false);
    }
  };

  const totals = dashboard?.totals || {
    users: 0,
    onlineNow: 0,
    offlineNow: 0,
    onlineSeconds: 0,
    offlineSeconds: 0,
    onlineCount: 0,
    offlineCount: 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-sm text-blue-700 font-semibold">
              <FaUserClock />
              Presence Control Center
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Online and Offline Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {canViewOffice
                ? "Monitor every admin user's current availability, transition counters, and total online/offline time."
                : 'View your own availability, online/offline buttons, and personal history.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {canViewOffice ? (
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
            ) : (
              <div className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm text-gray-600">
                Today only
              </div>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {canSyncSheet && (
              <button
                onClick={syncSheet}
                disabled={syncing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
              >
                <FaSyncAlt className={syncing ? 'animate-spin' : ''} />
                Sync Sheet
              </button>
            )}
            {canViewHistory && (
              <Link
                href="/admin/presence/history"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
              >
                History
              </Link>
            )}
            {canManageSettings && (
              <Link
                href="/admin/presence/settings"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                Settings
              </Link>
            )}
          </div>
        </div>

        {message && (
          <div className="bg-white border border-blue-100 text-blue-800 rounded-lg px-4 py-3 text-sm shadow-sm">
            {message}
          </div>
        )}

        {canViewOffice ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat title="Total Users" value={totals.users} tone="blue" icon={<FaUsers />} />
            <Stat title="Online Now" value={totals.onlineNow} tone="green" icon={<FaCircle />} />
            <Stat title="Offline Now" value={totals.offlineNow} tone="gray" icon={<FaCircle />} />
            <Stat title="Online Time" value={secondsToHuman(totals.onlineSeconds)} tone="indigo" icon={<FaUserClock />} />
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-6 items-stretch">
              <button
                onClick={toggleMyPresence}
                disabled={toggleLoading}
                className={`min-h-[180px] rounded-lg text-white flex flex-col items-center justify-center gap-3 shadow-lg transition-all ${
                  myState === 'online'
                    ? 'bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800'
                    : 'bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900'
                } ${toggleLoading ? 'opacity-75 cursor-wait' : ''}`}
              >
                <span className="text-sm font-semibold uppercase tracking-wide">{toggleLoading ? 'Updating' : 'My Status'}</span>
                <span className="text-4xl font-black">{myState === 'online' ? 'Online' : 'Offline'}</span>
                <span className="text-sm opacity-90">{myState === 'online' ? 'Click to go offline' : 'Click to go online'}</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Stat title="Today Online" value={secondsToHuman(myPresence?.seconds?.online)} tone="green" icon={<FaUserClock />} />
                <Stat title="Online Count" value={myPresence?.onlineCount || 0} tone="blue" icon={<FaCircle />} />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">My History</h2>
            <p className="text-sm text-gray-500">
              Your online/offline periods from today.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Started</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ended</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {history.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        event.state === 'online'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${event.state === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {event.state === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </td>
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
                {!loading && history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No history found for the selected period.
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

function Stat({ title, value, tone, icon }: { title: string; value: string | number; tone: string; icon: ReactNode }) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-500 font-medium">{title}</div>
        <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      </div>
      <div className={`w-11 h-11 rounded-lg border flex items-center justify-center ${tones[tone] || tones.blue}`}>
        {icon}
      </div>
    </div>
  );
}
