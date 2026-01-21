import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { rbac } from '@/services/api';

type Role = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  priority?: number | null;
  is_active?: boolean;
};

type RoleForm = {
  name: string;
  slug: string;
  description: string;
  priority: number;
  is_active: boolean;
};

function normalizeRole(r: any): Role {
  return {
    id: Number(r?.id),
    name: String(r?.name ?? ''),
    slug: String(r?.slug ?? ''),
    description: r?.description ?? '',
    priority: r?.priority == null ? 0 : Number(r?.priority),
    is_active: r?.is_active !== false,
  };
}

export default function AdminManageRolesPage() {
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleForm>({
    name: '',
    slug: '',
    description: '',
    priority: 0,
    is_active: true,
  });

  const loadRoles = async () => {
    setLoading(true);
    try {
      setError(null);
      const res = await rbac.listRoles(true);
      setRoles((Array.isArray(res) ? res : []).map(normalizeRole));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => {
      const hay = `${r.name} ${r.slug} ${r.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, roles]);

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: '', slug: '', description: '', priority: 0, is_active: true });
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name || '',
      slug: role.slug || '',
      description: String(role.description || ''),
      priority: Number(role.priority ?? 0),
      is_active: role.is_active !== false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingRole(null);
  };

  const saveRole = async () => {
    const name = form.name.trim();
    const slug = form.slug.trim();

    if (!name) {
      setError('Role name is required');
      return;
    }
    if (!slug) {
      setError('Role slug is required');
      return;
    }

    setSaving(true);
    try {
      setError(null);

      if (!editingRole) {
        await rbac.createRole({
          name,
          slug,
          description: form.description?.trim() || undefined,
          priority: Number(form.priority) || 0,
        });
      } else {
        await rbac.updateRole(editingRole.id, {
          name,
          slug,
          description: form.description?.trim() || '',
          priority: Number(form.priority) || 0,
          is_active: Boolean(form.is_active),
        });
      }

      setShowModal(false);
      setEditingRole(null);
      await loadRoles();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (role: Role) => {
    const nextActive = !(role.is_active !== false);
    const actionLabel = nextActive ? 'Activate' : 'Deactivate';

    if (!confirm(`${actionLabel} role "${role.name}"?`)) return;

    setSaving(true);
    try {
      setError(null);
      if (nextActive) {
        await rbac.updateRole(role.id, { is_active: true });
      } else {
        await rbac.deactivateRole(role.id);
      }
      await loadRoles();
    } catch (e: any) {
      setError(e?.response?.data?.message || `Failed to ${actionLabel.toLowerCase()} role`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Manage Roles</h1>
            <p className="text-gray-600 mt-1">Create, edit, and deactivate roles. This list is loaded from the database.</p>
          </div>

          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg text-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
            disabled={loading || saving}
          >
            + Create Role
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="w-full md:w-[420px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search roles</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, slug, description…"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            <div className="text-sm text-gray-600">
              {loading ? 'Loading…' : `${filteredRoles.length} role(s)`}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-4 text-gray-600">Loading roles…</div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-4 text-gray-600">No roles found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Slug</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Priority</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRoles.map((r) => {
                    const isActive = r.is_active !== false;
                    const isProtected = r.slug === 'admin' || r.slug === 'super-admin';

                    return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{r.name}</div>
                          {r.description ? <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{String(r.description)}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-gray-800">{r.slug}</td>
                        <td className="px-4 py-3 text-gray-800">{Number(r.priority ?? 0)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs border ${
                              isActive
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                          {isProtected ? (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs border bg-blue-50 text-blue-700 border-blue-200">
                              Protected
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(r)}
                              disabled={saving}
                              className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => toggleActive(r)}
                              disabled={saving || isProtected}
                              className={`px-3 py-1 rounded border disabled:opacity-60 ${
                                isActive
                                  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                  : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                              }`}
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-xl rounded-lg shadow-lg">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  {editingRole ? 'Edit Role' : 'Create Role'}
                </h2>
                <button onClick={closeModal} disabled={saving} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="e.g. Accounts"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                    <input
                      value={form.slug}
                      onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="e.g. accounts"
                      disabled={saving || (editingRole?.slug === 'admin' || editingRole?.slug === 'super-admin')}
                    />
                    <div className="text-xs text-gray-500 mt-1">Lowercase letters/numbers with hyphens only.</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded min-h-[90px]"
                    placeholder="Optional description…"
                    disabled={saving}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                        disabled={saving || (editingRole?.slug === 'admin' || editingRole?.slug === 'super-admin')}
                      />
                      Active
                    </label>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t flex items-center justify-end gap-3">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRole}
                  disabled={saving}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
