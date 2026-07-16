import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FaExclamationTriangle, FaFilePdf } from 'react-icons/fa';

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
  present: number;
  late: number;
  weeklyOff: number;
  excusedLeave: number;
  unwantedLeave: number;
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
  };
  summary: PresenceBucket;
  monthly: PresenceBucket[];
};

const permissionSlugs = ['view-presence-statistics', 'view-presence', 'manage-presence-settings'];

const monthOptions = [
  { value: 'all', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function currentDhakaYear() {
  return Number(new Date().toLocaleString('en-US', { year: 'numeric', timeZone: 'Asia/Dhaka' }));
}

export default function PresenceStatisticsPage() {
  const { hasAnyPermission, isLoading: authLoading } = useAuth();
  const toast = useToast();
  const canView = hasAnyPermission(permissionSlugs);
  const [users, setUsers] = useState<StatisticsUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [year, setYear] = useState(currentDhakaYear());
  const [month, setMonth] = useState('all');
  const [stats, setStats] = useState<PresenceStatistics | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [exporting, setExporting] = useState(false);

  const yearOptions = useMemo(() => {
    const current = currentDhakaYear();
    return Array.from({ length: 6 }, (_, idx) => current - idx);
  }, []);

  const selectedBucket = useMemo(() => {
    if (!stats) return null;
    if (month === 'all') return stats.summary;
    return stats.monthly.find((row) => Number(row.month) === Number(month)) || null;
  }, [month, stats]);

  const selectedPeriodLabel = useMemo(() => {
    const monthLabel = monthOptions.find((item) => item.value === month)?.label || 'All Months';
    return month === 'all' ? `${year} - All Months` : `${monthLabel} ${year}`;
  }, [month, year]);

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
        params: { userId: selectedUserId, year, month },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `presence-statistics-${selectedUserId}-${year}-${month}.pdf`;
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
              <p className="text-sm text-gray-600 mt-1">Filtered attendance summary for each employee.</p>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {monthOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
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

        {stats && selectedBucket && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Attendance Summary</h2>
              <p className="text-sm text-gray-500">{stats.employee.name} - {selectedPeriodLabel}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    {['Present', 'Late', 'Absent', 'Excused Off', 'Weekly Off'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left whitespace-nowrap">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-5 text-green-700 font-bold text-lg">{selectedBucket.present}</td>
                    <td className="px-4 py-5 text-amber-700 font-bold text-lg">{selectedBucket.late}</td>
                    <td className="px-4 py-5 text-red-700 font-bold text-lg">{selectedBucket.unwantedLeave}</td>
                    <td className="px-4 py-5 text-blue-700 font-bold text-lg">{selectedBucket.excusedLeave}</td>
                    <td className="px-4 py-5 text-gray-700 font-bold text-lg">{selectedBucket.weeklyOff}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
