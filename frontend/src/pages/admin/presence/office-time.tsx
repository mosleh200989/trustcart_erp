import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { FaArrowLeft, FaFilter, FaSave, FaSyncAlt, FaUserClock } from 'react-icons/fa';

type OfficeTimeRow = {
  userId: number;
  name: string;
  email?: string | null;
  officeStartTime: string;
  officeEndTime: string;
  customOfficeStartTime: string;
  customOfficeEndTime: string;
  weeklyDayOff: string;
  cautionMinutes: number;
  lunchBreakStartTime: string;
  lunchBreakEndTime: string;
  notes: string;
};

const DEFAULT_OFFICE_TIME = {
  start: '09:00',
  end: '18:00',
  cautionMinutes: 5,
  lunchStart: '13:20',
  lunchEnd: '14:25',
  weeklyDayOff: 'Friday',
};

const WEEKDAY_OPTIONS = [
  { value: '', label: 'No weekly off' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
];

export default function PresenceOfficeTimePage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<OfficeTimeRow[]>([]);
  const [defaults, setDefaults] = useState({ start: DEFAULT_OFFICE_TIME.start, end: DEFAULT_OFFICE_TIME.end });
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const canView = hasPermission('view-presence-office-time') || hasPermission('manage-presence-office-time') || hasPermission('manage-presence-settings');
  const canManage = hasPermission('manage-presence-office-time') || hasPermission('manage-presence-settings');

  const load = async () => {
    if (!canView) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await apiClient.get('/presence/office-times');
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      setDefaults({
        start: res.data?.defaultOfficeStartTime || DEFAULT_OFFICE_TIME.start,
        end: res.data?.defaultOfficeEndTime || DEFAULT_OFFICE_TIME.end,
      });
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to load office times.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const updateItem = (userId: number, patch: Partial<OfficeTimeRow>) => {
    setItems((prev) => prev.map((item) => (item.userId === userId ? { ...item, ...patch } : item)));
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.email, String(item.userId)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [items, search]);

  const save = async (item: OfficeTimeRow) => {
    setSavingUserId(item.userId);
    setMessage('');
    try {
      await apiClient.post(`/presence/office-times/${item.userId}`, {
        officeStartTime: item.customOfficeStartTime,
        officeEndTime: item.customOfficeEndTime,
        weeklyDayOff: item.weeklyDayOff,
        cautionMinutes: item.cautionMinutes,
        lunchBreakStartTime: item.lunchBreakStartTime,
        lunchBreakEndTime: item.lunchBreakEndTime,
      });
      setMessage('Office time saved successfully.');
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to save office time.');
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <Link href="/admin/presence" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
              <FaArrowLeft />
              Presence
            </Link>
            <div className="flex items-center gap-3 text-sm text-blue-700 font-semibold mt-4">
              <FaUserClock />
              Presence Module
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Office Time</h1>
            <p className="text-gray-600 mt-1">Set employee-specific office times, grace periods, lunch breaks, and weekly days off.</p>
          </div>

          <button
            onClick={load}
            disabled={loading || !canView}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {!canView && (
          <div className="bg-white border border-red-100 text-red-700 rounded-lg px-4 py-3 text-sm shadow-sm">
            You do not have permission to view office times.
          </div>
        )}

        {message && (
          <div className="bg-white border border-blue-100 text-blue-800 rounded-lg px-4 py-3 text-sm shadow-sm">
            {message}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-900">Default office time</div>
          <div className="text-sm text-gray-500 mt-1">
            Start: {defaults.start || DEFAULT_OFFICE_TIME.start} | End: {defaults.end || DEFAULT_OFFICE_TIME.end} | Caution: {DEFAULT_OFFICE_TIME.cautionMinutes} min | Lunch: {DEFAULT_OFFICE_TIME.lunchStart} - {DEFAULT_OFFICE_TIME.lunchEnd} | Weekly off: {DEFAULT_OFFICE_TIME.weeklyDayOff}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Employee Office Times</h2>
              <p className="text-sm text-gray-500">Showing {filteredItems.length} of {items.length} employees</p>
            </div>
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, email, ID"
                className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm min-w-[260px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Start Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Caution</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">End Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lunch Start</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lunch End</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Weekly Day Off</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.email || `User #${item.userId}`}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={item.customOfficeStartTime || ''}
                        onChange={(e) => updateItem(item.userId, { customOfficeStartTime: e.target.value })}
                        disabled={!canManage}
                        placeholder={item.officeStartTime}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={240}
                        value={item.cautionMinutes || 0}
                        onChange={(e) => updateItem(item.userId, { cautionMinutes: Math.max(0, Number(e.target.value) || 0) })}
                        disabled={!canManage}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                      />
                      <div className="text-xs text-gray-400 mt-1">minutes</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={item.customOfficeEndTime || ''}
                        onChange={(e) => updateItem(item.userId, { customOfficeEndTime: e.target.value })}
                        disabled={!canManage}
                        placeholder={item.officeEndTime}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={item.lunchBreakStartTime || ''}
                        onChange={(e) => updateItem(item.userId, { lunchBreakStartTime: e.target.value })}
                        disabled={!canManage}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={item.lunchBreakEndTime || ''}
                        onChange={(e) => updateItem(item.userId, { lunchBreakEndTime: e.target.value })}
                        disabled={!canManage}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.weeklyDayOff || ''}
                        onChange={(e) => updateItem(item.userId, { weeklyDayOff: e.target.value })}
                        disabled={!canManage}
                        className="min-w-[160px] border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
                      >
                        {WEEKDAY_OPTIONS.map((option) => (
                          <option key={option.value || 'none'} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => save(item)}
                        disabled={!canManage || savingUserId === item.userId}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60"
                      >
                        <FaSave />
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                      {items.length === 0 ? 'No active employees found.' : 'No employees match the current search.'}
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
