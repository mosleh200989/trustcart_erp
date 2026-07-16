import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FaCalendarAlt, FaChartLine, FaClock, FaDownload, FaExclamationTriangle, FaFilePdf, FaUserCheck } from 'react-icons/fa';

type StatisticsUser = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  teamLeaderName?: string | null;
  roleName?: string | null;
};

type PresenceBucket = {
  label: string;
  month?: number;
  weekKey?: string;
  countedDays: number;
  present: number;
  late: number;
  weeklyOff: number;
  excusedLeave: number;
  unwantedLeave: number;
  manualOverrides: number;
  checkIns: number;
  checkOuts: number;
  totalOnlineSeconds: number;
  avgDailySeconds: number;
  avgPresentDaySeconds: number;
  avgCheckInTime: string;
  totalOnlineHours: number;
  avgDailyHours: number;
  avgPresentDayHours: number;
  attendanceRate: number;
  lateRate: number;
  unwantedLeaveRate: number;
};

type DailyPresence = {
  dateKey: string;
  weekday: string;
  verdict: string;
  label: string;
  isManual?: boolean;
  firstEntryTime: string;
  onlineSeconds: number;
  onlineHours: number;
  checkIns: number;
  checkOuts: number;
};

type PresenceStatistics = {
  employee: StatisticsUser;
  year: number;
  timezone: string;
  officeTime: {
    officeStartTime: string;
    officeEndTime: string;
    cautionMinutes: number;
    weeklyDayOff?: string | null;
    lunchBreakStartTime?: string | null;
    lunchBreakEndTime?: string | null;
  };
  summary: PresenceBucket;
  monthly: PresenceBucket[];
  weekly: PresenceBucket[];
  recentDaily: DailyPresence[];
  generatedAt: string;
};

const permissionSlugs = ['view-presence-statistics', 'view-presence', 'manage-presence-settings'];

function currentDhakaYear() {
  return Number(new Date().toLocaleString('en-US', { year: 'numeric', timeZone: 'Asia/Dhaka' }));
}

function secondsToHuman(value: any) {
  const total = Number(value || 0);
  if (!Number.isFinite(total) || total <= 0) return '0m';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatDateKey(dateKey?: string | null) {
  if (!dateKey) return '-';
  const [year, month, day] = String(dateKey).split('-');
  if (!year || !month || !day) return dateKey;
  return `${day}/${month}/${year}`;
}

function verdictClass(verdict: string) {
  if (verdict === 'present') return 'bg-green-50 text-green-700 border-green-200';
  if (verdict === 'late') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (verdict === 'weeklyOff') return 'bg-slate-50 text-slate-600 border-slate-200';
  if (verdict === 'excusedLeave') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (verdict === 'unwantedLeave') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-purple-50 text-purple-700 border-purple-200';
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: any; tone: string }) {
  const Icon = icon;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center justify-between">
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      </div>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${tone}`}>
        <Icon />
      </div>
    </div>
  );
}

export default function PresenceStatisticsPage() {
  const { hasAnyPermission, isLoading: authLoading } = useAuth();
  const toast = useToast();
  const canView = hasAnyPermission(permissionSlugs);
  const [users, setUsers] = useState<StatisticsUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [year, setYear] = useState(currentDhakaYear());
  const [stats, setStats] = useState<PresenceStatistics | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [exporting, setExporting] = useState(false);

  const yearOptions = useMemo(() => {
    const current = currentDhakaYear();
    return Array.from({ length: 6 }, (_, idx) => current - idx);
  }, []);

  useEffect(() => {
    if (authLoading || !canView) return;
    let cancelled = false;
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await apiClient.get('/presence/statistics/users');
        const rows = Array.isArray(res.data) ? res.data : [];
        if (cancelled) return;
        setUsers(rows);
        if (!selectedUserId && rows[0]?.id) setSelectedUserId(String(rows[0].id));
      } catch (err: any) {
        if (!cancelled) toast.error(err?.response?.data?.message || 'Failed to load employees');
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [authLoading, canView, selectedUserId, toast]);

  useEffect(() => {
    if (authLoading || !canView || !selectedUserId) return;
    let cancelled = false;
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const res = await apiClient.get('/presence/statistics', {
          params: { userId: selectedUserId, year },
        });
        if (!cancelled) setStats(res.data || null);
      } catch (err: any) {
        if (!cancelled) {
          setStats(null);
          toast.error(err?.response?.data?.message || 'Failed to load presence statistics');
        }
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [authLoading, canView, selectedUserId, year, toast]);

  const exportPdf = async () => {
    if (!selectedUserId) return;
    setExporting(true);
    try {
      const res = await apiClient.get('/presence/statistics/pdf', {
        params: { userId: selectedUserId, year },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `presence-statistics-${selectedUserId}-${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  if (!authLoading && !canView) {
    return (
      <AdminLayout>
        <div className="bg-white border border-red-100 rounded-lg shadow-sm p-8 text-center">
          <FaExclamationTriangle className="mx-auto text-red-500 text-3xl mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Permission Required</h1>
          <p className="text-gray-600 mt-2">You do not have permission to view Presence Statistics.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Presence Statistics</h1>
              <p className="text-sm text-gray-600 mt-1">Employee attendance, late entries, unwanted leave, and average working time.</p>
            </div>
            <button
              type="button"
              onClick={exportPdf}
              disabled={!stats || exporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold shadow-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FaFilePdf />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Employee</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{loadingUsers ? 'Loading employees...' : 'Select employee'}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}{user.roleName ? ` - ${user.roleName}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {yearOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase">Office Rule</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                {stats ? `${stats.officeTime.officeStartTime} - ${stats.officeTime.officeEndTime}` : '-'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Grace: {stats?.officeTime.cautionMinutes ?? 0} min, Weekly off: {stats?.officeTime.weeklyDayOff || '-'}
              </div>
            </div>
          </div>
        </div>

        {loadingStats && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-700 font-semibold">
            Loading statistics...
          </div>
        )}

        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              <StatCard label="Attendance" value={`${stats.summary.attendanceRate}%`} icon={FaUserCheck} tone="bg-green-50 text-green-700" />
              <StatCard label="Total Time" value={secondsToHuman(stats.summary.totalOnlineSeconds)} icon={FaClock} tone="bg-blue-50 text-blue-700" />
              <StatCard label="Late" value={String(stats.summary.late)} icon={FaCalendarAlt} tone="bg-amber-50 text-amber-700" />
              <StatCard label="Unwanted Leave" value={String(stats.summary.unwantedLeave)} icon={FaExclamationTriangle} tone="bg-red-50 text-red-700" />
              <StatCard label="Avg Per Day" value={secondsToHuman(stats.summary.avgDailySeconds)} icon={FaChartLine} tone="bg-purple-50 text-purple-700" />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Monthly Statistics</h2>
                  <p className="text-sm text-gray-500">{stats.employee.name} - {stats.year}</p>
                </div>
                <FaDownload className="text-gray-400" />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      {['Month', 'Counted Days', 'Present', 'Late', 'Unwanted Leave', 'Weekly Off', 'Hours', 'Avg/Day', 'Avg Check-in', 'Attendance %', 'Late %'].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left whitespace-nowrap">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.monthly.map((row) => (
                      <tr key={row.month} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{row.label}</td>
                        <td className="px-4 py-3">{row.countedDays}</td>
                        <td className="px-4 py-3 text-green-700 font-semibold">{row.present}</td>
                        <td className="px-4 py-3 text-amber-700 font-semibold">{row.late}</td>
                        <td className="px-4 py-3 text-red-700 font-semibold">{row.unwantedLeave}</td>
                        <td className="px-4 py-3">{row.weeklyOff}</td>
                        <td className="px-4 py-3">{secondsToHuman(row.totalOnlineSeconds)}</td>
                        <td className="px-4 py-3">{secondsToHuman(row.avgDailySeconds)}</td>
                        <td className="px-4 py-3">{row.avgCheckInTime}</td>
                        <td className="px-4 py-3 font-semibold">{row.attendanceRate}%</td>
                        <td className="px-4 py-3">{row.lateRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">Weekly Average</h2>
                </div>
                <div className="overflow-x-auto max-h-[520px]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0">
                      <tr>
                        {['Week', 'Present', 'Late', 'Leave', 'Hours', 'Avg/Day', 'Avg In', 'Attendance'].map((heading) => (
                          <th key={heading} className="px-4 py-3 text-left whitespace-nowrap">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.weekly.map((row) => (
                        <tr key={row.weekKey} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{row.label}</td>
                          <td className="px-4 py-3">{row.present}</td>
                          <td className="px-4 py-3">{row.late}</td>
                          <td className="px-4 py-3">{row.unwantedLeave}</td>
                          <td className="px-4 py-3">{secondsToHuman(row.totalOnlineSeconds)}</td>
                          <td className="px-4 py-3">{secondsToHuman(row.avgDailySeconds)}</td>
                          <td className="px-4 py-3">{row.avgCheckInTime}</td>
                          <td className="px-4 py-3 font-semibold">{row.attendanceRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">Recent Daily Breakdown</h2>
                </div>
                <div className="overflow-x-auto max-h-[520px]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0">
                      <tr>
                        {['Date', 'Day', 'Verdict', 'First Entry', 'Duration', 'Check In/Out', 'Manual'].map((heading) => (
                          <th key={heading} className="px-4 py-3 text-left whitespace-nowrap">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.recentDaily.map((row) => (
                        <tr key={row.dateKey} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900">{formatDateKey(row.dateKey)}</td>
                          <td className="px-4 py-3">{row.weekday}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full border text-xs font-semibold ${verdictClass(row.verdict)}`}>
                              {row.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">{row.firstEntryTime}</td>
                          <td className="px-4 py-3">{secondsToHuman(row.onlineSeconds)}</td>
                          <td className="px-4 py-3">{row.checkIns} / {row.checkOuts}</td>
                          <td className="px-4 py-3">{row.isManual ? 'Yes' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
