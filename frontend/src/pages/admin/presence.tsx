import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaCalendarCheck, FaCircle, FaClock, FaSignInAlt, FaSignOutAlt, FaUserClock } from 'react-icons/fa';

type PresenceRow = {
  currentState: 'online' | 'offline';
  lastChangedAt?: string | null;
  onlineCount: number;
  offlineCount: number;
  seconds: {
    online: number;
    offline: number;
  };
};

type PresenceSummary = {
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

function formatTime(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB');
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

export default function PresencePage() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PresenceSummary | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyMonth, setHistoryMonth] = useState(getCurrentMonthValue());
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [toggleLoading, setToggleLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const todayParams = getTodayRangeParams();
      const [summaryRes, historyRes] = await Promise.all([
        apiClient.get('/presence/me/summary', { params: todayParams }),
        apiClient.get('/presence/me/history', { params: todayParams }),
      ]);
      setSummary(summaryRes.data);
      setHistory(Array.isArray(historyRes.data?.items) ? historyRes.data.items : []);
    } catch (err) {
      console.error('Failed to load check-in/out summary', err);
      setSummary(null);
      setHistory([]);
      setMessage('Failed to load your check-in/out summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const loadMonthlyHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiClient.get('/presence/me/history', { params: getMonthRangeParams(historyMonth) });
      setMonthlyHistory(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err: any) {
      setMonthlyHistory([]);
      setMessage(err?.response?.data?.message || 'Failed to load your check-in/out history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadMonthlyHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyMonth]);

  const myPresence = summary?.items?.[0] || null;
  const myState = myPresence?.currentState === 'online' ? 'online' : 'offline';
  const isCheckedIn = myState === 'online';

  const todayStats = useMemo(() => {
    const sorted = [...history].sort((a, b) => {
      const aTime = new Date(a.startedAt || a.occurredAt || 0).getTime();
      const bTime = new Date(b.startedAt || b.occurredAt || 0).getTime();
      return aTime - bTime;
    });
    const firstCheckIn = sorted.find((event) => event.state === 'online');
    const lastCheckOut = [...sorted].reverse().find((event) => event.state === 'offline');

    return {
      duration: secondsToHuman(myPresence?.seconds?.online),
      entryTime: formatTime(firstCheckIn?.startedAt || firstCheckIn?.occurredAt),
      lastCheckOutTime: formatTime(lastCheckOut?.startedAt || lastCheckOut?.occurredAt),
      checkIns: myPresence?.onlineCount || 0,
    };
  }, [history, myPresence?.onlineCount, myPresence?.seconds?.online]);

  const historyRows = useMemo(() => {
    return [...monthlyHistory]
      .sort((a, b) => new Date(b.startedAt || b.occurredAt || 0).getTime() - new Date(a.startedAt || a.occurredAt || 0).getTime())
      .map((event) => ({
        id: event.id,
        state: event.state === 'online' ? 'Checked In' : 'Checked Out',
        source: event.source || '-',
        date: formatDate(event.startedAt || event.occurredAt),
        time: formatTime(event.startedAt || event.occurredAt),
      }));
  }, [monthlyHistory]);

  const toggleMyPresence = async () => {
    const next = isCheckedIn ? 'offline' : 'online';
    setToggleLoading(true);
    setMessage('');
    try {
      await apiClient.post('/presence/me', { state: next });
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to update your check-in status.');
    } finally {
      setToggleLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <div className="flex items-center gap-3 text-sm text-blue-700 font-semibold">
            <FaUserClock />
            Check In/Out
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Today&apos;s Attendance</h1>
          <p className="text-gray-600 mt-1">Use the button below to manually check in or check out for today.</p>
        </div>

        {message && (
          <div className="bg-white border border-blue-100 text-blue-800 rounded-lg px-4 py-3 text-sm shadow-sm">
            {message}
          </div>
        )}

        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 md:p-8">
          <div className="flex flex-col items-center text-center gap-6">
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border ${
              isCheckedIn ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}>
              <span className={`h-2.5 w-2.5 rounded-full ${isCheckedIn ? 'bg-green-500' : 'bg-gray-400'}`} />
              {loading && !myPresence ? 'Loading status...' : isCheckedIn ? 'Currently Checked In' : 'Currently Checked Out'}
            </div>

            <button
              onClick={toggleMyPresence}
              disabled={toggleLoading || loading}
              className={`w-full max-w-xl min-h-[210px] rounded-lg text-white flex flex-col items-center justify-center gap-4 shadow-lg transition-all ${
                isCheckedIn
                  ? 'bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800'
                  : 'bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800'
              } ${toggleLoading || loading ? 'opacity-75 cursor-wait' : 'hover:-translate-y-0.5'}`}
            >
              <span className="text-5xl">{isCheckedIn ? <FaSignOutAlt /> : <FaSignInAlt />}</span>
              <span className="text-4xl font-black">{toggleLoading ? 'Updating...' : isCheckedIn ? 'Check Out' : 'Check In'}</span>
              <span className="text-sm font-semibold opacity-90">
                {isCheckedIn ? 'End your checked-in session' : 'Start your checked-in session'}
              </span>
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <TodayStat title="Today Duration" value={todayStats.duration} icon={<FaClock />} tone="green" />
          <TodayStat title="Entry Time" value={todayStats.entryTime} icon={<FaCalendarCheck />} tone="blue" />
          <TodayStat title="Last Check Out" value={todayStats.lastCheckOutTime} icon={<FaSignOutAlt />} tone="gray" />
          <TodayStat title="Check-ins Today" value={todayStats.checkIns} icon={<FaCircle />} tone="indigo" />
        </section>

        <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">My Check In/Out History</h2>
              <p className="text-sm text-gray-500 mt-1">Only your own Presence history is shown here.</p>
            </div>
            <input
              type="month"
              value={historyMonth}
              onChange={(e) => setHistoryMonth(e.target.value || getCurrentMonthValue())}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {historyRows.map((row, index) => (
                  <tr key={row.id || `${row.date}-${row.time}-${index}`} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{row.date}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{row.time}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        row.state === 'Checked In'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {row.state}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{row.source}</td>
                  </tr>
                ))}
                {!historyLoading && historyRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                      No check-in/out history found for this month.
                    </td>
                  </tr>
                )}
                {historyLoading && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                      Loading your history...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function TodayStat({ title, value, icon, tone }: { title: string; value: string | number; icon: ReactNode; tone: string }) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
      <div className={`w-11 h-11 rounded-lg border flex items-center justify-center ${tones[tone] || tones.blue}`}>
        {icon}
      </div>
      <div className="text-sm text-gray-500 font-medium mt-4">{title}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
