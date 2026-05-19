import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { FaArrowLeft, FaGripVertical, FaSave, FaSyncAlt, FaUserClock } from 'react-icons/fa';

type CalendarRow = {
  userId: number;
  name: string;
  email?: string | null;
  insertGapAfter?: boolean;
  cells: Array<{ dateKey: string; value: string; label: string; color: string; isManual?: boolean; note?: string }>;
};

type CalendarData = {
  sheetName: string;
  timezone: string;
  days: Array<{ day: number; key: string; label: string; weekday: string }>;
  keyConfig: Record<string, { key: string; label: string; color: string }>;
  rowGap: { every: number; size: number };
  rows: CalendarRow[];
};

export default function PresenceCalendarPage() {
  const { hasPermission } = useAuth();
  const [sheetName, setSheetName] = useState('');
  const [data, setData] = useState<CalendarData | null>(null);
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [dragUserId, setDragUserId] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ userId: number; name: string; dateKey: string; value: string; note: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const canViewCalendar = hasPermission('view-presence') || hasPermission('view-presence-calendar') || hasPermission('manage-presence-calendar');
  const canManageCalendar = hasPermission('manage-presence-calendar') || hasPermission('manage-presence-settings');

  const load = async () => {
    if (!canViewCalendar) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await apiClient.get('/presence/calendar', { params: sheetName ? { sheetName } : {} });
      setData(res.data);
      setRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
      if (res.data?.sheetName) setSheetName(res.data.sheetName);
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to load presence calendar.');
      setData(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewCalendar]);

  const legend = useMemo(() => {
    const config = data?.keyConfig || {};
    return Object.values(config).filter((item: any) => item?.key);
  }, [data?.keyConfig]);

  const moveRow = (targetUserId: number) => {
    if (!canManageCalendar || dragUserId == null || dragUserId === targetUserId) return;
    setRows((prev) => {
      const next = prev.slice();
      const from = next.findIndex((row) => row.userId === dragUserId);
      const to = next.findIndex((row) => row.userId === targetUserId);
      if (from < 0 || to < 0) return prev;
      const [picked] = next.splice(from, 1);
      next.splice(to, 0, picked);
      return next;
    });
  };

  const saveOrder = async () => {
    setSaving(true);
    setMessage('');
    try {
      await apiClient.post('/presence/calendar/order', { userIds: rows.map((row) => row.userId) });
      setMessage('Calendar order saved successfully.');
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to save calendar order.');
    } finally {
      setSaving(false);
    }
  };

  const saveCellOverride = async () => {
    if (!editingCell) return;
    setSaving(true);
    setMessage('');
    try {
      await apiClient.post('/presence/calendar/override', {
        userId: editingCell.userId,
        dateKey: editingCell.dateKey,
        attendanceKey: editingCell.value,
        note: editingCell.note,
      });
      setEditingCell(null);
      setMessage(editingCell.value ? 'Calendar cell updated successfully.' : 'Calendar cell override cleared.');
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to update calendar cell.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <Link href="/admin/presence" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
              <FaArrowLeft />
              Presence Dashboard
            </Link>
            <div className="flex items-center gap-3 text-sm text-blue-700 font-semibold mt-4">
              <FaUserClock />
              Presence Module
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Presence Calendar</h1>
            <p className="text-gray-600 mt-1">Sheet-style attendance calendar for all active users.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="May-26"
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={load}
              disabled={loading || !canViewCalendar}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {canManageCalendar && (
              <button
                onClick={saveOrder}
                disabled={saving || rows.length === 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60"
              >
                <FaSave />
                Save Order
              </button>
            )}
          </div>
        </div>

        {!canViewCalendar && (
          <div className="bg-white border border-red-100 text-red-700 rounded-lg px-4 py-3 text-sm shadow-sm">
            You do not have permission to view the presence calendar.
          </div>
        )}

        {message && (
          <div className="bg-white border border-blue-100 text-blue-800 rounded-lg px-4 py-3 text-sm shadow-sm">
            {message}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">{data?.sheetName || sheetName || 'Calendar'}</div>
            <div className="text-sm text-gray-500">
              Timezone: {data?.timezone || '-'} | Users: {rows.length} | Gap every {data?.rowGap?.every || 0} rows
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {legend.map((item: any) => (
              <span key={`${item.key}-${item.label}`} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold text-gray-700">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.key} = {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-20 bg-gray-50 border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase min-w-[240px]">
                    User
                  </th>
                  {(data?.days || []).map((day) => (
                    <th key={day.key} className="border-b border-r border-gray-200 px-2 py-2 text-center min-w-[56px]">
                      <div className="text-xs font-bold text-gray-700">{day.label}</div>
                      <div className="text-[11px] text-gray-400">{day.weekday}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Fragment key={row.userId}>
                    <tr
                      key={row.userId}
                      draggable={canManageCalendar}
                      onDragStart={() => setDragUserId(row.userId)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => moveRow(row.userId)}
                      onDragEnd={() => setDragUserId(null)}
                      className={dragUserId === row.userId ? 'opacity-50' : ''}
                    >
                      <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-4 py-3">
                        <div className="flex items-center gap-3">
                          {canManageCalendar && <FaGripVertical className="text-gray-400 cursor-grab" />}
                          <div>
                            <div className="font-semibold text-gray-900">{row.name}</div>
                            <div className="text-xs text-gray-500">{row.email || `User #${row.userId}`}</div>
                          </div>
                        </div>
                      </td>
                      {row.cells.map((cell) => (
                        <td key={`${row.userId}-${cell.dateKey}`} className="border-b border-r border-gray-200 px-1 py-1 text-center">
                          {cell.value ? (
                            <button
                              type="button"
                              title={cell.label}
                              onClick={() => canManageCalendar && setEditingCell({ userId: row.userId, name: row.name, dateKey: cell.dateKey, value: cell.value, note: cell.note || '' })}
                              className={`inline-flex items-center justify-center w-9 h-8 rounded text-xs font-black text-white ${canManageCalendar ? 'cursor-pointer ring-offset-1 hover:ring-2 hover:ring-gray-400' : ''} ${cell.isManual ? 'ring-2 ring-gray-900' : ''}`}
                              style={{ backgroundColor: cell.color }}
                            >
                              {cell.value}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => canManageCalendar && setEditingCell({ userId: row.userId, name: row.name, dateKey: cell.dateKey, value: '', note: '' })}
                              className={`inline-block w-9 h-8 rounded ${canManageCalendar ? 'hover:bg-gray-100' : ''}`}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                    {row.insertGapAfter && (
                      <tr key={`${row.userId}-gap`}>
                        <td colSpan={(data?.days?.length || 0) + 1} style={{ height: data?.rowGap?.size || 12 }} className="bg-gray-100 border-b border-gray-200" />
                      </tr>
                    )}
                  </Fragment>
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={(data?.days?.length || 0) + 1 || 2} className="px-4 py-10 text-center text-gray-500">
                      No calendar data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editingCell && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Edit Calendar Cell</h2>
                <p className="text-sm text-gray-500">{editingCell.name} | {editingCell.dateKey}</p>
              </div>
              <div className="p-4 space-y-4">
                <label className="block">
                  <span className="block text-sm font-semibold text-gray-700 mb-1">Attendance Key</span>
                  <select
                    value={editingCell.value}
                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="">Automatic</option>
                    {legend.map((item: any) => (
                      <option key={`${item.key}-${item.label}`} value={item.key}>
                        {item.key} - {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-sm font-semibold text-gray-700 mb-1">Note</span>
                  <textarea
                    value={editingCell.note}
                    onChange={(e) => setEditingCell({ ...editingCell, note: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[90px]"
                  />
                </label>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => setEditingCell(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={saveCellOverride} disabled={saving} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
