import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { rbac } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

type Role = { id: number; name: string; slug: string };
type Permission = { id: number; name: string; slug: string; module: string; action: string; description?: string };

function titleize(s: string) {
  return String(s || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminRolePermissions() {
  const router = useRouter();
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set());

  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const [showCreateRole, setShowCreateRole] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', slug: '', description: '', priority: 0 });

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

  const refreshRoles = async (keepSelected?: number | '') => {
    const next = await rbac.listRoles();
    setRoles(next);
    if (keepSelected !== undefined) {
      setSelectedRoleId(keepSelected);
      return;
    }
    if (next.length > 0) {
      setSelectedRoleId((prev) => (prev === '' ? Number(next[0].id) : prev));
    } else {
      setSelectedRoleId('');
    }
  };

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

  const selectedRoleModules = useMemo(() => {
    if (!selectedRole) return [] as string[];
    const moduleMap = new Map<string, number>();
    for (const p of allPermissions) {
      if (!selectedPermissionIds.has(Number(p.id))) continue;
      const m = (p.module || 'general').toLowerCase();
      moduleMap.set(m, (moduleMap.get(m) || 0) + 1);
    }
    return Array.from(moduleMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([m]) => (m === 'general' ? 'General' : titleize(m)));
  }, [allPermissions, selectedPermissionIds, selectedRole]);

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
      toast.warning('Please select a role');
      return;
    }

    setSaving(true);
    try {
      await rbac.setRolePermissions(selectedRoleId, Array.from(selectedPermissionIds));
      toast.success('Role permissions updated successfully');
    } catch (e) {
      console.error('Failed to save role permissions:', e);
      toast.error('Failed to update role permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    const name = newRole.name.trim();
    const slug = newRole.slug.trim();

    if (!name) {
      toast.warning('Role name is required');
      return;
    }
    if (!slug) {
      toast.warning('Role slug is required');
      return;
    }

    setCreatingRole(true);
    try {
      const created = await rbac.createRole({
        name,
        slug,
        description: newRole.description?.trim() || undefined,
        priority: Number(newRole.priority) || 0,
      });
      setShowCreateRole(false);
      setNewRole({ name: '', slug: '', description: '', priority: 0 });
      await refreshRoles(Number(created?.id));
      toast.success('Role created');
    } catch (e: any) {
      console.error('Failed to create role:', e);
      toast.error(e?.response?.data?.message || 'Failed to create role');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeactivateRole = async () => {
    if (!selectedRole) return;
    if (!confirm(`Deactivate role "${selectedRole.name}"?`)) return;
    try {
      await rbac.deactivateRole(selectedRole.id);
      await refreshRoles('');
      setSelectedPermissionIds(new Set());
      toast.success('Role deactivated');
    } catch (e: any) {
      console.error('Failed to deactivate role:', e);
      toast.error(e?.response?.data?.message || 'Failed to deactivate role');
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

            <div className="flex items-end">
              <button
                onClick={() => setShowCreateRole(true)}
                disabled={loading || saving}
                className="px-4 py-2 rounded-lg text-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
              >
                + Create Role
              </button>
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
                {selectedRoleModules.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedRoleModules.slice(0, 6).map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-100"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                onClick={handleDeactivateRole}
                disabled={saving}
                className="px-3 py-2 rounded text-sm bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-60"
              >
                Deactivate Role
              </button>
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

      {showCreateRole ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-gray-800">Create Role</div>
              <button
                onClick={() => setShowCreateRole(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={newRole.name}
                  onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., CRM Lead Creator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  value={newRole.slug}
                  onChange={(e) => setNewRole((p) => ({ ...p, slug: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., crm-lead-creator"
                />
                <div className="text-xs text-gray-500 mt-1">Lowercase letters/numbers and hyphens only.</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <input
                  type="number"
                  value={newRole.priority}
                  onChange={(e) => setNewRole((p) => ({ ...p, priority: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole((p) => ({ ...p, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateRole(false)}
                disabled={creatingRole}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={creatingRole}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300"
              >
                {creatingRole ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
