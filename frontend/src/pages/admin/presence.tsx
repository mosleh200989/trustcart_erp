import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
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

export default function PresencePage() {
  const [rangeDays, setRangeDays] = useState(7);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<PresenceDashboard | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/presence/dashboard', { params: { rangeDays } });
      setDashboard(res.data);
    } catch (err) {
      console.error('Failed to load presence dashboard', err);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (dashboard?.items || []).filter((row) => {
      if (stateFilter !== 'all' && row.currentState !== stateFilter) return false;
      if (!q) return true;
      return [row.name, row.email, row.phone, String(row.userId)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [dashboard?.items, search, stateFilter]);

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
              Monitor every admin user's current availability, transition counters, and total online/offline time.
            </p>
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
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Stat title="Total Users" value={totals.users} tone="blue" icon={<FaUsers />} />
          <Stat title="Online Now" value={totals.onlineNow} tone="green" icon={<FaCircle />} />
          <Stat title="Offline Now" value={totals.offlineNow} tone="gray" icon={<FaCircle />} />
          <Stat title="Online Time" value={secondsToHuman(totals.onlineSeconds)} tone="indigo" icon={<FaUserClock />} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">User Presence</h2>
              <p className="text-sm text-gray-500">
                Showing {filteredRows.length} of {dashboard?.items?.length || 0} users
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, email, phone"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[240px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
                {filteredRows.map((row) => (
                  <tr key={row.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-500">{row.email || row.phone || `User #${row.userId}`}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        row.currentState === 'online'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${row.currentState === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {row.currentState === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.onlineCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.offlineCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{secondsToHuman(row.seconds?.online)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{secondsToHuman(row.seconds?.offline)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(row.lastChangedAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(row.lastSeenAt)}</td>
                  </tr>
                ))}

                {!loading && filteredRows.length === 0 && (
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
