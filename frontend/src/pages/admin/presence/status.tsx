import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FaArrowLeft, FaFilter, FaSave, FaSyncAlt, FaUserCheck } from 'react-icons/fa';

type PresenceStatus = 'active' | 'inactive' | 'backup';

type StatusRow = {
  userId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  accountStatus?: string | null;
  presenceStatus: PresenceStatus;
  notes: string;
  roleName?: string | null;
  teamLeaderName?: string | null;
};

const STATUS_OPTIONS: Array<{ value: PresenceStatus; label: string; description: string }> = [
  { value: 'active', label: 'Active', description: 'Visible in normal Presence panels and regular Office Time.' },
  { value: 'inactive', label: 'Inactive', description: 'Visible only in this Status panel.' },
  { value: 'backup', label: 'Backup', description: 'Visible in Presence panels and managed from Backup Team roster.' },
];

function statusBadge(status: PresenceStatus) {
  if (status === 'active') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'backup') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

export default function PresenceStatusPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState<PresenceStatus>('active');
  const [items, setItems] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const canView = hasPermission('view-presence-status') || hasPermission('manage-presence-status') || hasPermission('manage-presence-settings');
  const canManage = hasPermission('manage-presence-status') || hasPermission('manage-presence-settings');

  const load = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/presence/user-statuses', { params: { status } });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load Presence status users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, canView]);

  const updateItem = (userId: number, patch: Partial<StatusRow>) => {
    setItems((prev) => prev.map((item) => (item.userId === userId ? { ...item, ...patch } : item)));
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.email, item.phone, item.roleName, item.teamLeaderName, String(item.userId)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [items, search]);

  const save = async (item: StatusRow) => {
    setSavingUserId(item.userId);
    try {
      await apiClient.post(`/presence/user-statuses/${item.userId}`, {
        status: item.presenceStatus,
        notes: item.notes,
      });
      toast.success('Presence status updated.');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update Presence status.');
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
              <FaUserCheck />
              Presence Module
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Status</h1>
            <p className="text-gray-600 mt-1">Control which employees are active, inactive, or part of the backup team for Presence.</p>
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
            You do not have permission to view Presence statuses.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`text-left rounded-lg border p-4 shadow-sm transition ${
                status === option.value ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 bg-white hover:border-blue-200'
              }`}
            >
              <div className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-bold capitalize ${statusBadge(option.value)}`}>{option.label}</div>
              <div className="text-sm text-gray-600 mt-3">{option.description}</div>
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{STATUS_OPTIONS.find((item) => item.value === status)?.label} Users</h2>
              <p className="text-sm text-gray-500">Showing {filteredItems.length} of {items.length} users</p>
            </div>
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, role, TL, phone"
                className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm min-w-[280px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role / Team Leader</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Presence Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.email || item.phone || `User #${item.userId}`}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{item.roleName || '-'}</div>
                      <div className="text-xs text-gray-500">TL: {item.teamLeaderName || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.presenceStatus}
                        onChange={(e) => updateItem(item.userId, { presenceStatus: e.target.value as PresenceStatus })}
                        disabled={!canManage}
                        className="min-w-[150px] border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={item.notes || ''}
                        onChange={(e) => updateItem(item.userId, { notes: e.target.value })}
                        disabled={!canManage}
                        placeholder="Optional note"
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
                {!loading && filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      No users found for this Presence status.
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
