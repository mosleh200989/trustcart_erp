import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/services/api';

type AdminMenuItem = {
  id: number;
  title: string;
  icon?: string | null;
  path?: string | null;
  parentId?: number | null;
  sortOrder: number;
  isActive: boolean;
  requiredPermissions: string[];
};

type AdminMenuNode = AdminMenuItem & { children?: AdminMenuNode[] };

function flattenTree(nodes: AdminMenuNode[], out: AdminMenuNode[] = []): AdminMenuNode[] {
  for (const n of nodes) {
    out.push(n);
    if (n.children?.length) flattenTree(n.children, out);
  }
  return out;
}

export default function ManageModulesPage() {
  const router = useRouter();
  const toast = useToast();

  const [tree, setTree] = useState<AdminMenuNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const didInitExpanded = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    icon: 'FaCog',
    path: '',
    parentId: '' as '' | number,
    sortOrder: 0,
    isActive: true,
    requiredPermissions: '',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/settings/admin-menu', { params: { includeInactive: true } });
      setTree(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load menu');
      setTree([]);
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const flat = useMemo(() => flattenTree(tree, []), [tree]);

  useEffect(() => {
    // First load: expand everything so the page matches the current view.
    if (didInitExpanded.current) return;
    const next = new Set<number>();
    for (const n of flat) next.add(n.id);
    setExpandedIds(next);
    didInitExpanded.current = true;
  }, [flat]);

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parentId?: number | null) => {
    setMode('create');
    setEditingId(null);
    setForm({
      title: '',
      icon: 'FaCog',
      path: '',
      parentId: parentId ? parentId : '',
      sortOrder: 0,
      isActive: true,
      requiredPermissions: '',
    });
    setShowModal(true);
  };

  const openEdit = (item: AdminMenuItem) => {
    setMode('edit');
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      icon: item.icon || 'FaCog',
      path: item.path || '',
      parentId: item.parentId ?? '',
      sortOrder: item.sortOrder ?? 0,
      isActive: !!item.isActive,
      requiredPermissions: (item.requiredPermissions || []).join(', '),
    });
    setShowModal(true);
  };

  const save = async () => {
    const title = form.title.trim();
    if (!title) {
      toast.warning('Title is required');
      return;
    }

    const payload = {
      title,
      icon: form.icon?.trim() || null,
      path: form.path?.trim() || null,
      parentId: form.parentId === '' ? null : Number(form.parentId),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: !!form.isActive,
      requiredPermissions: form.requiredPermissions
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    };

    setSaving(true);
    try {
      if (mode === 'create') {
        await apiClient.post('/settings/admin-menu', payload);
      } else if (editingId) {
        await apiClient.put(`/settings/admin-menu/${editingId}`, payload);
      }
      setShowModal(false);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this menu item? This will also delete its children.')) return;
    try {
      await apiClient.delete(`/settings/admin-menu/${id}`);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete');
    }
  };

  const disableDbMenu = async () => {
    if (!confirm('Disable DB sidebar menu and use the built-in sidebar instead?')) return;
    try {
      await apiClient.post('/settings/admin-menu/disable');
      await load();
      toast.success('DB sidebar menu disabled. Reload the admin panel to see the built-in modules again.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to disable DB menu');
    }
  };

  const seedDefaultMenu = async () => {
    if (!confirm('Seed DB menu with the current built-in sidebar items? This will REPLACE existing DB menu items.')) return;
    try {
      await apiClient.post('/settings/admin-menu/seed-default?mode=replace');
      await load();
      toast.success('DB menu seeded from built-in sidebar. Reload the admin panel to start using it.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to seed DB menu');
    }
  };

  const renderNode = (node: AdminMenuNode, depth = 0) => {
    const indent = depth * 16;
    const hasChildren = !!node.children?.length;
    const isExpanded = expandedIds.has(node.id);
    return (
      <div key={node.id} className="border rounded-lg mb-2 bg-white">
        <div className="flex items-center justify-between px-4 py-3" style={{ paddingLeft: 16 + indent }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(node.id)}
                  className="w-7 h-7 flex items-center justify-center rounded border bg-white text-gray-700 hover:bg-gray-50"
                  aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? '▾' : '▸'}
                </button>
              ) : (
                <div className="w-7 h-7" />
              )}
              <div className="font-semibold text-gray-800 truncate">{node.title}</div>
              {!node.isActive ? (
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 border">Inactive</span>
              ) : null}
              {node.path ? (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                  {node.path}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded bg-gray-50 text-gray-600 border">Group</span>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Icon: {node.icon || 'FaCog'} • Sort: {node.sortOrder} • Permissions: {(node.requiredPermissions || []).join(', ') || 'None'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreate(node.id)}
              className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700"
            >
              + Child
            </button>
            <button
              onClick={() => openEdit(node)}
              className="px-3 py-1 rounded border text-sm hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              onClick={() => remove(node.id)}
              className="px-3 py-1 rounded bg-red-50 text-red-700 border border-red-200 text-sm hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>

        {node.children?.length && isExpanded ? (
          <div className="px-2 pb-2">
            {node.children.map((c) => renderNode(c, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Manage Modules</h1>
          <p className="text-gray-600 mt-1">Create, edit, and organize the admin sidebar menu.</p>
        </div>

        {error ? (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
        ) : null}

        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => openCreate(null)}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            + Add Top-Level Menu
          </button>
          <button
            onClick={seedDefaultMenu}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Seed Built-in Menu
          </button>
          <button
            onClick={disableDbMenu}
            className="px-4 py-2 rounded bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
          >
            Use Built-in Sidebar
          </button>
          <button
            onClick={load}
            className="px-4 py-2 rounded border hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : tree.length === 0 ? (
          <div className="bg-white rounded shadow p-6 text-gray-700">
            <div className="font-semibold mb-1">No DB menu items found.</div>
            <div className="text-sm text-gray-600">
              Add items here to start using a database-driven sidebar. Until then, the app continues to use the built-in sidebar.
            </div>
          </div>
        ) : (
          <div className="space-y-2">{tree.map((n) => renderNode(n, 0))}</div>
        )}
      </div>

      {showModal ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-gray-800">
                {mode === 'create' ? 'Create Menu Item' : 'Edit Menu Item'}
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., CRM"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon Key</label>
                <input
                  value={form.icon}
                  onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="FaCog"
                />
                <div className="text-xs text-gray-500 mt-1">Use an existing react-icons/fa key, e.g. FaUsers, FaPhone.</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Path (optional)</label>
                <input
                  value={form.path}
                  onChange={(e) => setForm((p) => ({ ...p, path: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="/admin/crm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value ? Number(e.target.value) : '' }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">(no parent)</option>
                  {flat
                    .filter((x) => (mode === 'edit' ? x.id !== editingId : true))
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.title} (#{x.id})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">Active</span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Permissions (comma-separated)</label>
                <input
                  value={form.requiredPermissions}
                  onChange={(e) => setForm((p) => ({ ...p, requiredPermissions: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="view-users, assign-roles"
                />
                <div className="text-xs text-gray-500 mt-1">If empty, it inherits the parent’s permissions (same as current sidebar behavior).</div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
