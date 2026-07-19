import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FaPlus, FaSave, FaSyncAlt, FaTrash, FaUsers } from 'react-icons/fa';

type BackupRule = {
  id?: number;
  weekdays: string[];
  officeStartTime: string;
  officeEndTime: string;
  cautionMinutes: number;
  lunchBreakStartTime: string;
  lunchBreakEndTime: string;
  notes: string;
};

type BackupUser = {
  userId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  rules: BackupRule[];
};

const WEEKDAY_OPTIONS = [
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
];

const emptyRule = (): BackupRule => ({
  weekdays: [],
  officeStartTime: '',
  officeEndTime: '',
  cautionMinutes: 0,
  lunchBreakStartTime: '',
  lunchBreakEndTime: '',
  notes: '',
});

export default function PresenceBackupTeamPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<BackupUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const canView = hasPermission('view-presence-backup-team') || hasPermission('manage-presence-backup-team') || hasPermission('manage-presence-settings');
  const canManage = hasPermission('manage-presence-backup-team') || hasPermission('manage-presence-settings');

  const load = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/presence/backup-team');
      const rows = Array.isArray(res.data?.items) ? res.data.items : [];
      setItems(rows.map((row: BackupUser) => ({
        ...row,
        rules: row.rules?.length
          ? row.rules.map((rule) => ({ ...rule, weekdays: Array.isArray(rule.weekdays) ? rule.weekdays : [] }))
          : [emptyRule()],
      })));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load backup team.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.email, item.phone, String(item.userId)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [items, search]);

  const updateRule = (userId: number, index: number, patch: Partial<BackupRule>) => {
    setItems((prev) => prev.map((item) => {
      if (item.userId !== userId) return item;
      return {
        ...item,
        rules: item.rules.map((rule, idx) => (idx === index ? { ...rule, ...patch } : rule)),
      };
    }));
  };

  const toggleWeekday = (userId: number, index: number, weekday: string) => {
    setItems((prev) => prev.map((item) => {
      if (item.userId !== userId) return item;
      return {
        ...item,
        rules: item.rules.map((rule, idx) => {
          if (idx !== index) return rule;
          if (!weekday) return { ...rule, weekdays: [] };
          const current = Array.isArray(rule.weekdays) ? rule.weekdays : [];
          const next = current.includes(weekday)
            ? current.filter((item) => item !== weekday)
            : [...current, weekday];
          return { ...rule, weekdays: next };
        }),
      };
    }));
  };

  const addRule = (userId: number) => {
    setItems((prev) => prev.map((item) => {
      if (item.userId !== userId || item.rules.length >= 6) return item;
      return { ...item, rules: [...item.rules, emptyRule()] };
    }));
  };

  const removeRule = (userId: number, index: number) => {
    setItems((prev) => prev.map((item) => {
      if (item.userId !== userId) return item;
      const nextRules = item.rules.filter((_, idx) => idx !== index);
      return { ...item, rules: nextRules.length ? nextRules : [emptyRule()] };
    }));
  };

  const save = async (item: BackupUser) => {
    setSavingUserId(item.userId);
    try {
      const rules = item.rules
        .filter((rule) => rule.officeStartTime || rule.officeEndTime || rule.lunchBreakStartTime || rule.lunchBreakEndTime || rule.notes)
        .map((rule) => ({
          weekdays: Array.isArray(rule.weekdays) ? rule.weekdays : [],
          officeStartTime: rule.officeStartTime,
          officeEndTime: rule.officeEndTime,
          cautionMinutes: rule.cautionMinutes,
          lunchBreakStartTime: rule.lunchBreakStartTime,
          lunchBreakEndTime: rule.lunchBreakEndTime,
          notes: rule.notes,
        }));
      await apiClient.post(`/presence/backup-team/${item.userId}`, { rules });
      toast.success('Backup roster saved.');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save backup roster.');
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          backHref="/admin/presence"
          backLabel="Presence"
          eyebrow="Presence Module"
          icon={<FaUsers />}
          title="Backup Team"
          description="Set roster-based office times for users marked as Backup in Presence Status."
          actions={<button
            onClick={load}
            disabled={loading || !canView}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>}
        />

        {!canView && (
          <div className="bg-white border border-red-100 text-red-700 rounded-lg px-4 py-3 text-sm shadow-sm">
            You do not have permission to view the backup team.
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search backup user"
            className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 md:w-[360px]"
          />
        </div>

        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div key={item.userId} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
                  <p className="text-sm text-gray-500">{item.email || item.phone || `User #${item.userId}`}</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center [&>button]:min-h-11 [&>button]:w-full sm:[&>button]:w-auto">
                  <button
                    type="button"
                    onClick={() => addRule(item.userId)}
                    disabled={!canManage || item.rules.length >= 6}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-sm font-semibold hover:bg-blue-100 disabled:opacity-60"
                  >
                    <FaPlus />
                    Add Time
                  </button>
                  <button
                    type="button"
                    onClick={() => save(item)}
                    disabled={!canManage || savingUserId === item.userId}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60"
                  >
                    <FaSave />
                    Save
                  </button>
                </div>
              </div>
              <div className="admin-responsive-table overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Weekdays</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Start Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Caution</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">End Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lunch Start</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lunch End</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {item.rules.map((rule, index) => (
                      <tr key={`${item.userId}-${index}`}>
                        <td data-label="Rule" className="px-4 py-3 text-sm font-semibold text-gray-500">{index + 1}</td>
                        <td data-label="Weekdays" className="px-4 py-3 min-w-[290px]">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleWeekday(item.userId, index, '')}
                              disabled={!canManage}
                              className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${
                                !rule.weekdays?.length
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                              } disabled:opacity-60`}
                            >
                              All
                            </button>
                            {WEEKDAY_OPTIONS.map((day) => {
                              const selected = Array.isArray(rule.weekdays) && rule.weekdays.includes(day.value);
                              return (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() => toggleWeekday(item.userId, index, day.value)}
                                  disabled={!canManage}
                                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${
                                    selected
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                  } disabled:opacity-60`}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td data-label="Start Time" className="px-4 py-3">
                          <input
                            type="time"
                            value={rule.officeStartTime || ''}
                            onChange={(e) => updateRule(item.userId, index, { officeStartTime: e.target.value })}
                            disabled={!canManage}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                          />
                        </td>
                        <td data-label="Caution" className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            max={240}
                            value={rule.cautionMinutes || 0}
                            onChange={(e) => updateRule(item.userId, index, { cautionMinutes: Math.max(0, Number(e.target.value) || 0) })}
                            disabled={!canManage}
                            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                          />
                        </td>
                        <td data-label="End Time" className="px-4 py-3">
                          <input
                            type="time"
                            value={rule.officeEndTime || ''}
                            onChange={(e) => updateRule(item.userId, index, { officeEndTime: e.target.value })}
                            disabled={!canManage}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                          />
                        </td>
                        <td data-label="Lunch Start" className="px-4 py-3">
                          <input
                            type="time"
                            value={rule.lunchBreakStartTime || ''}
                            onChange={(e) => updateRule(item.userId, index, { lunchBreakStartTime: e.target.value })}
                            disabled={!canManage}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                          />
                        </td>
                        <td data-label="Lunch End" className="px-4 py-3">
                          <input
                            type="time"
                            value={rule.lunchBreakEndTime || ''}
                            onChange={(e) => updateRule(item.userId, index, { lunchBreakEndTime: e.target.value })}
                            disabled={!canManage}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                          />
                        </td>
                        <td data-label="Notes" className="px-4 py-3">
                          <input
                            value={rule.notes || ''}
                            onChange={(e) => updateRule(item.userId, index, { notes: e.target.value })}
                            disabled={!canManage}
                            className="min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                          />
                        </td>
                        <td data-label="Action" className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeRule(item.userId, index)}
                            disabled={!canManage}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-60"
                            aria-label="Remove time"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {!loading && filteredItems.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-10 text-center text-gray-500">
              No backup users found. Mark users as Backup from Presence Status first.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
