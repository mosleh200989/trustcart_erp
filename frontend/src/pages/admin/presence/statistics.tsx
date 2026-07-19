import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Modal from '@/components/admin/Modal';
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
  halfDay: number;
  unwantedLeave: number;
};

type PresenceDailyRow = {
  dateKey: string;
  weekday: string;
  verdict: string;
  label: string;
  firstEntryTime?: string | null;
  onlineHours?: number;
  requiredHours?: number;
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
  daily: PresenceDailyRow[];
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
  const [showHalfDayModal, setShowHalfDayModal] = useState(false);
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

  const halfDayRows = useMemo(() => {
    if (!stats) return [];
    return (stats.daily || [])
      .filter((row) => {
        if (row.verdict !== 'halfDay') return false;
        if (month === 'all') return true;
        const rowMonth = Number(String(row.dateKey || '').slice(5, 7));
        return rowMonth === Number(month);
      })
      .sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)));
  }, [month, stats]);

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
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <AdminPageHeader
            title="Presence Statistics"
            description="Filtered attendance summary for each employee."
            actions={<button
              type="button"
              onClick={exportPdf}
              disabled={!stats || exporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold shadow-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FaFilePdf />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>}
          />

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
            <div className="grid grid-cols-2 gap-px bg-gray-200 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Present', value: selectedBucket.present, tone: 'text-green-700' },
                { label: 'Late', value: selectedBucket.late, tone: 'text-amber-700' },
                { label: 'Absent', value: selectedBucket.unwantedLeave, tone: 'text-red-700' },
                { label: 'Excused Off', value: selectedBucket.excusedLeave, tone: 'text-blue-700' },
              ].map((metric) => (
                <div key={metric.label} className="bg-white p-4 sm:p-5">
                  <div className="text-xs font-semibold uppercase text-gray-500">{metric.label}</div>
                  <div className={`mt-2 text-2xl font-bold ${metric.tone}`}>{metric.value}</div>
                </div>
              ))}
              <div className="bg-white p-4 sm:p-5">
                <div className="text-xs font-semibold uppercase text-gray-500">Half Day</div>
                <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setShowHalfDayModal(true)}
                        disabled={!selectedBucket.halfDay}
                        className="text-purple-700 font-bold text-lg underline-offset-4 hover:underline disabled:no-underline disabled:cursor-default"
                      >
                        {selectedBucket.halfDay || 0}
                      </button>
                </div>
              </div>
              <div className="bg-white p-4 sm:p-5">
                <div className="text-xs font-semibold uppercase text-gray-500">Weekly Off</div>
                <div className="mt-2 text-2xl font-bold text-gray-700">{selectedBucket.weeklyOff}</div>
              </div>
            </div>
          </div>
        )}

        <Modal
          isOpen={showHalfDayModal}
          onClose={() => setShowHalfDayModal(false)}
          title="Half Day Dates"
          size="lg"
        >
          <p className="mb-4 text-sm text-gray-500">{stats?.employee.name} - {selectedPeriodLabel}</p>
              <div className="admin-responsive-table max-h-[60vh] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Day</th>
                      <th className="px-4 py-3 text-left">Entry</th>
                      <th className="px-4 py-3 text-right">Checked In</th>
                      <th className="px-4 py-3 text-right">Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {halfDayRows.map((row) => (
                      <tr key={row.dateKey} className="hover:bg-gray-50">
                        <td data-label="Date" className="px-4 py-3 font-semibold text-gray-900">
                          {row.dateKey.split('-').reverse().join('/')}
                        </td>
                        <td data-label="Day" className="px-4 py-3 text-gray-600">{row.weekday}</td>
                        <td data-label="Entry" className="px-4 py-3 text-gray-600">{row.firstEntryTime || '-'}</td>
                        <td data-label="Checked In" className="px-4 py-3 text-right font-semibold text-purple-700">{row.onlineHours ?? 0}h</td>
                        <td data-label="Required" className="px-4 py-3 text-right text-gray-700">{row.requiredHours ?? 0}h</td>
                      </tr>
                    ))}
                    {halfDayRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                          No half-day dates found for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
