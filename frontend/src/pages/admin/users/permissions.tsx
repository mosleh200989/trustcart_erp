import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { rbac } from '@/services/api';

type Role = { id: number; name: string; slug: string };
type Permission = { id: number; name: string; slug: string; module: string; action: string; description?: string };

export default function AdminRolePermissions() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set());

  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const run = async () => {
      setLoading(true);
      try {
        const [rolesRes, permissionsRes] = await Promise.all([
          rbac.listRoles(),
          rbac.listPermissions(),
        ]);

        setRoles(rolesRes);
        setAllPermissions(permissionsRes);

        if (rolesRes.length > 0) {
          setSelectedRoleId((prev) => (prev === '' ? Number(rolesRes[0].id) : prev));
        }
      } catch (e) {
        console.error('Failed to load RBAC data:', e);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router]);

  useEffect(() => {
    if (selectedRoleId === '') return;

    const run = async () => {
      try {
        const rolePerms = await rbac.getRolePermissions(selectedRoleId);
        setSelectedPermissionIds(new Set(rolePerms.map((p: any) => Number(p.id))));
      } catch (e) {
        console.error('Failed to load role permissions:', e);
        setSelectedPermissionIds(new Set());
      }
    };

    run();
  }, [selectedRoleId]);

  const selectedRole = useMemo(() => {
    if (selectedRoleId === '') return null;
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  const filteredPermissions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPermissions;
    return allPermissions.filter((p) => {
      const hay = `${p.name} ${p.slug} ${p.module} ${p.action}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allPermissions, query]);

  const permissionsByModule = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of filteredPermissions) {
      const key = p.module || 'general';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPermissions]);

  const togglePermission = (permissionId: number) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const setModuleAll = (module: string, checked: boolean) => {
    const modulePermIds = allPermissions
      .filter((p) => (p.module || 'general') === module)
      .map((p) => Number(p.id));

    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      for (const id of modulePermIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedRoleId === '') {
      alert('Please select a role');
      return;
    }

    setSaving(true);
    try {
      await rbac.setRolePermissions(selectedRoleId, Array.from(selectedPermissionIds));
      alert('Role permissions updated successfully');
    } catch (e) {
      console.error('Failed to save role permissions:', e);
      alert('Failed to update role permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Role Permissions</h1>
          <p className="text-gray-600 mt-1">Control which permissions each role has</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full md:w-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : '')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[240px]"
                disabled={loading || saving}
              >
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-[320px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search permissions</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, slug, module..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-700">
              <div className="font-medium">Selected</div>
              <div>{selectedPermissionIds.size}</div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || loading || selectedRoleId === ''}
              className={`px-4 py-2 rounded-lg text-sm text-white ${
                saving || loading || selectedRoleId === ''
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        ) : !selectedRole ? (
          <div className="p-8 text-center text-gray-600">Select a role to manage permissions.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-800">{selectedRole.name}</div>
                <div className="text-sm text-gray-500">Slug: {selectedRole.slug}</div>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {permissionsByModule.length === 0 ? (
                <div className="text-center text-gray-600 py-8">No permissions found.</div>
              ) : (
                permissionsByModule.map(([module, perms]) => {
                  const modulePermIds = perms.map((p) => Number(p.id));
                  const moduleSelectedCount = modulePermIds.filter((id) => selectedPermissionIds.has(id)).length;
                  const moduleAllSelected = perms.length > 0 && moduleSelectedCount === perms.length;

                  return (
                    <div key={module} className="border rounded-lg">
                      <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                        <div className="font-semibold text-gray-800 capitalize">{module}</div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={moduleAllSelected}
                            onChange={(e) => setModuleAll(module, e.target.checked)}
                          />
                          Select all ({moduleSelectedCount}/{perms.length})
                        </label>
                      </div>

                      <div className="divide-y">
                        {perms.map((p) => (
                          <label key={p.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={selectedPermissionIds.has(Number(p.id))}
                              onChange={() => togglePermission(Number(p.id))}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{p.name}</div>
                              <div className="text-xs text-gray-500">{p.slug} • {p.action}</div>
                              {p.description ? (
                                <div className="text-xs text-gray-500 mt-1">{p.description}</div>
                              ) : null}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
