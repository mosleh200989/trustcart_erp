import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { FaArrowLeft, FaSave, FaSyncAlt, FaUserClock } from 'react-icons/fa';

type OfficeTimeRow = {
  userId: number;
  name: string;
  email?: string | null;
  officeStartTime: string;
  officeEndTime: string;
  customOfficeStartTime: string;
  customOfficeEndTime: string;
  notes: string;
};

export default function PresenceOfficeTimePage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<OfficeTimeRow[]>([]);
  const [defaults, setDefaults] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const canView = hasPermission('view-presence-office-time') || hasPermission('manage-presence-office-time') || hasPermission('manage-presence-settings');
  const canManage = hasPermission('manage-presence-office-time') || hasPermission('manage-presence-settings');

  const load = async () => {
    if (!canView) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await apiClient.get('/presence/office-times');
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      setDefaults({ start: res.data?.defaultOfficeStartTime || '', end: res.data?.defaultOfficeEndTime || '' });
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

  const save = async (item: OfficeTimeRow) => {
    setSavingUserId(item.userId);
    setMessage('');
    try {
      await apiClient.post(`/presence/office-times/${item.userId}`, {
        officeStartTime: item.customOfficeStartTime,
        officeEndTime: item.customOfficeEndTime,
        notes: item.notes,
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
              Presence Dashboard
            </Link>
            <div className="flex items-center gap-3 text-sm text-blue-700 font-semibold mt-4">
              <FaUserClock />
              Presence Module
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Office Time</h1>
            <p className="text-gray-600 mt-1">Set employee-specific office start times for automatic Present and Late calculation.</p>
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
            Start: {defaults.start || '-'} | End: {defaults.end || '-'}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Start Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">End Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {items.map((item) => (
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
                      <div className="text-xs text-gray-400 mt-1">Effective: {item.officeStartTime}</div>
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
                      <div className="text-xs text-gray-400 mt-1">Effective: {item.officeEndTime}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={item.notes || ''}
                        onChange={(e) => updateItem(item.userId, { notes: e.target.value })}
                        disabled={!canManage}
                        className="w-full min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                      />
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
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      No active employees found.
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
