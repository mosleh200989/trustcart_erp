import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { rbac, users as usersAPI } from '@/services/api';

type Role = { id: number; name: string; slug: string };

type UserRow = {
  id: number;
  name?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default function AdminUserRolesPage() {
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    (async () => {
      try {
        setError(null);
        setLoadingUsers(true);
        const [u, r] = await Promise.all([usersAPI.list(), rbac.listRoles()]);
        setUsers(u || []);
        setRoles(r || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load users/roles');
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!selectedUser?.id) {
      setUserRoles([]);
      return;
    }

    (async () => {
      try {
        setError(null);
        setLoadingUserRoles(true);
        const r = await rbac.getUserRoles(selectedUser.id);
        setUserRoles(r || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load user roles');
      } finally {
        setLoadingUserRoles(false);
      }
    })();
  }, [selectedUser?.id]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const fullName = `${u.name || ''} ${u.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.phone || '').toLowerCase().includes(q)
      );
    });
  }, [search, users]);

  const availableRolesToAssign = useMemo(() => {
    const assigned = new Set((userRoles || []).map((r) => r.id));
    return (roles || []).filter((r) => !assigned.has(r.id));
  }, [roles, userRoles]);

  const assignRole = async () => {
    if (!selectedUser?.id) {
      setError('Select a user first');
      return;
    }
    if (!selectedRoleId) {
      setError('Select a role to assign');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await rbac.assignRole(selectedUser.id, Number(selectedRoleId));
      const updated = await rbac.getUserRoles(selectedUser.id);
      setUserRoles(updated || []);
      setSelectedRoleId('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to assign role');
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (roleId: number) => {
    if (!selectedUser?.id) return;

    if (!confirm('Remove this role from the user?')) return;

    try {
      setSaving(true);
      setError(null);
      await rbac.removeRole(selectedUser.id, roleId);
      const updated = await rbac.getUserRoles(selectedUser.id);
      setUserRoles(updated || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to remove role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Assign Roles</h1>
          <p className="text-gray-600 mt-1">
            Select a user and add/remove RBAC roles.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Users list */}
          <div className="lg:col-span-5 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Users</h2>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name/email/phone…"
              className="w-full px-3 py-2 border border-gray-300 rounded mb-3"
            />

            {loadingUsers ? (
              <div className="text-gray-600">Loading users…</div>
            ) : (
              <div className="max-h-[520px] overflow-auto divide-y">
                {filteredUsers.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  const title = `${u.name || ''} ${u.lastName || ''}`.trim() || u.email || u.phone || `User #${u.id}`;
                  const subtitle = u.email || u.phone || '';

                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-800">{title}</div>
                      {subtitle && <div className="text-xs text-gray-600">{subtitle}</div>}
                    </button>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <div className="text-gray-600 px-2 py-6">No users found.</div>
                )}
              </div>
            )}
          </div>

          {/* Role assignment panel */}
          <div className="lg:col-span-7 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Roles</h2>

            {!selectedUser ? (
              <div className="text-gray-600">Select a user to manage roles.</div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold">User:</span>{' '}
                    {(selectedUser.email || `${selectedUser.name || ''} ${selectedUser.lastName || ''}`.trim() || selectedUser.phone || `#${selectedUser.id}`)}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <select
                    className="flex-1 px-3 py-2 border border-gray-300 rounded"
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : '')}
                    disabled={saving}
                  >
                    <option value="">Select role to assign…</option>
                    {availableRolesToAssign.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.slug})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={assignRole}
                    disabled={saving || !selectedRoleId}
                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300"
                  >
                    {saving ? 'Saving…' : 'Assign Role'}
                  </button>
                </div>

                <div className="border rounded">
                  <div className="px-3 py-2 bg-gray-50 border-b text-sm font-semibold text-gray-700">
                    Assigned roles
                  </div>

                  {loadingUserRoles ? (
                    <div className="p-3 text-gray-600">Loading roles…</div>
                  ) : userRoles.length === 0 ? (
                    <div className="p-3 text-gray-600">No roles assigned.</div>
                  ) : (
                    <div className="divide-y">
                      {userRoles.map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <div className="font-medium text-gray-800">{r.name}</div>
                            <div className="text-xs text-gray-600">{r.slug}</div>
                          </div>
                          <button
                            onClick={() => removeRole(r.id)}
                            disabled={saving}
                            className="px-3 py-1 rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Note: Role assignment requires the backend permission <code>assign-roles</code>.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
