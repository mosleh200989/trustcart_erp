import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
import apiClient from '@/services/api';
import { FaPlus, FaTrash } from 'react-icons/fa';

type TabKey = 'manage' | 'filter';

interface Tag {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  createdAt?: string;
  customersCount?: number;
}

interface CustomerTagBadge {
  id: string;
  name: string;
  color?: string | null;
}

interface CustomerRow {
  id: string;
  name?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  isGuest?: boolean;
  tags?: CustomerTagBadge[];
}

const safeArray = <T,>(value: any): T[] => (Array.isArray(value) ? (value as T[]) : []);

export default function AdminTaggingPage() {
  const router = useRouter();
  const toast = useToast();

  const tab: TabKey = useMemo(() => {
    const q = String(router.query.tab ?? 'manage');
    return q === 'filter' ? 'filter' : 'manage';
  }, [router.query.tab]);

  // Shared
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsSearch, setTagsSearch] = useState('');
  const [tagsPage, setTagsPage] = useState(1);
  const [tagsTotalPages, setTagsTotalPages] = useState(1);
  const [selectedTagIds, setSelectedTagIds] = useState<Array<string>>([]);

  // Manage tag modal
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [viewingTag, setViewingTag] = useState<Tag | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagForm, setTagForm] = useState({ name: '', description: '', color: '' });
  const [savingTag, setSavingTag] = useState(false);

  // Customers filter tab
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [showOnlyInTag, setShowOnlyInTag] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersSearch, setCustomersSearch] = useState('');
  const [customersPage, setCustomersPage] = useState(1);
  const [customersTotalPages, setCustomersTotalPages] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Array<string>>([]);

  const gotoTab = async (next: TabKey) => {
    await router.push({ pathname: '/admin/tagging', query: { tab: next } });
  };

  const loadTags = async () => {
    setTagsLoading(true);
    try {
      const res = await apiClient.get('/tags', {
        params: {
          page: tagsPage,
          limit: 20,
          search: tagsSearch || undefined,
          sortBy: 'createdAt',
          sortDir: 'desc',
        },
      });

      const payload = res.data;
      const list = safeArray<Tag>(payload?.data ?? payload);
      const totalPages = Number(payload?.meta?.totalPages ?? 1);

      setTags(list);
      setTagsTotalPages(Number.isFinite(totalPages) ? totalPages : 1);
    } catch (e) {
      console.error('Failed to load tags', e);
    } finally {
      setTagsLoading(false);
    }
  };

  const loadCustomers = async () => {
    setCustomersLoading(true);
    try {
      const tagIdsParam = selectedTagId && showOnlyInTag ? selectedTagId : undefined;
      const res = await apiClient.get('/tags/customers', {
        params: {
          page: customersPage,
          limit: 20,
          search: customersSearch || undefined,
          tagIds: tagIdsParam,
          mode: 'any',
        },
      });

      const payload = res.data;
      const list = safeArray<CustomerRow>(payload?.data ?? payload);
      const totalPages = Number(payload?.meta?.totalPages ?? 1);

      setCustomers(list);
      setCustomersTotalPages(Number.isFinite(totalPages) ? totalPages : 1);
    } catch (e) {
      console.error('Failed to load customers', e);
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsPage]);

  useEffect(() => {
    // reset pagination when search changes
    const t = setTimeout(() => {
      setTagsPage(1);
      loadTags();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsSearch]);

  useEffect(() => {
    if (tab !== 'filter') return;
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, customersPage]);

  useEffect(() => {
    if (tab !== 'filter') return;
    const t = setTimeout(() => {
      setCustomersPage(1);
      loadCustomers();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customersSearch, selectedTagId, showOnlyInTag, tab]);

  const openCreateTag = () => {
    setViewingTag(null);
    setEditingTag(null);
    setTagForm({ name: '', description: '', color: '' });
    setTagModalOpen(true);
  };

  const openEditTag = (t: Tag) => {
    setViewingTag(null);
    setEditingTag(t);
    setTagForm({
      name: t.name ?? '',
      description: (t.description ?? '') as string,
      color: (t.color ?? '') as string,
    });
    setTagModalOpen(true);
  };

  const openViewTag = async (t: Tag) => {
    try {
      const res = await apiClient.get(`/tags/${t.id}`);
      setViewingTag(res.data as Tag);
    } catch (e) {
      console.error('Failed to load tag details', e);
      setViewingTag(t);
    }
  };

  const saveTag = async () => {
    if (!tagForm.name.trim()) return;
    setSavingTag(true);
    try {
      const payload = {
        name: tagForm.name.trim(),
        description: tagForm.description?.trim() || undefined,
        color: tagForm.color?.trim() || undefined,
      };
      if (editingTag) {
        await apiClient.patch(`/tags/${editingTag.id}`, payload);
      } else {
        await apiClient.post('/tags', payload);
      }
      setTagModalOpen(false);
      await loadTags();
    } catch (e: any) {
      console.error('Failed to save tag', e);
      toast.error(e?.response?.data?.message || 'Failed to save tag');
    } finally {
      setSavingTag(false);
    }
  };

  const deleteTag = async (t: Tag) => {
    if (!confirm(`Delete tag "${t.name}"?`)) return;
    try {
      await apiClient.delete(`/tags/${t.id}`);
      await loadTags();
    } catch (e: any) {
      console.error('Failed to delete tag', e);
      toast.error(e?.response?.data?.message || 'Failed to delete tag');
    }
  };

  const bulkDeleteTags = async () => {
    if (selectedTagIds.length === 0) return;
    if (!confirm(`Delete ${selectedTagIds.length} tag(s)?`)) return;
    try {
      await apiClient.post('/tags/bulk-delete', { ids: selectedTagIds });
      setSelectedTagIds([]);
      await loadTags();
    } catch (e: any) {
      console.error('Failed to bulk delete tags', e);
      toast.error(e?.response?.data?.message || 'Failed to bulk delete tags');
    }
  };

  const assignSelectedCustomers = async () => {
    if (!selectedTagId) {
      toast.warning('Select a tag first');
      return;
    }
    if (selectedCustomerIds.length === 0) return;
    try {
      await apiClient.post(`/tags/${selectedTagId}/customers`, { customerIds: selectedCustomerIds });
      setSelectedCustomerIds([]);
      await loadCustomers();
      await loadTags();
    } catch (e: any) {
      console.error('Failed to assign customers', e);
      toast.error(e?.response?.data?.message || 'Failed to assign customers');
    }
  };

  const removeSelectedCustomers = async () => {
    if (!selectedTagId) {
      toast.warning('Select a tag first');
      return;
    }
    if (selectedCustomerIds.length === 0) return;
    try {
      await apiClient.post(`/tags/${selectedTagId}/customers/remove`, { customerIds: selectedCustomerIds });
      setSelectedCustomerIds([]);
      await loadCustomers();
      await loadTags();
    } catch (e: any) {
      console.error('Failed to remove customers', e);
      toast.error(e?.response?.data?.message || 'Failed to remove customers');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Tagging</h1>
            <p className="text-gray-600">Create tags and assign customers to them.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => gotoTab('manage')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                tab === 'manage'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Manage Tags
            </button>
            <button
              onClick={() => gotoTab('filter')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                tab === 'filter'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Tagwise Filter
            </button>
          </div>
        </div>

        {tab === 'manage' && (
          <>
            <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3 items-center">
                <input
                  value={tagsSearch}
                  onChange={(e) => setTagsSearch(e.target.value)}
                  placeholder="Search tags..."
                  className="w-full md:w-96 px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                {selectedTagIds.length > 0 && (
                  <button
                    onClick={bulkDeleteTags}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <FaTrash /> Delete Selected ({selectedTagIds.length})
                  </button>
                )}
                <button
                  onClick={openCreateTag}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <FaPlus /> Add Tag
                </button>
              </div>
            </div>

            <DataTable
              columns={[
                { key: 'name', label: 'Name' },
                {
                  key: 'description',
                  label: 'Description',
                  render: (v: any) => <span className="text-gray-700">{v || '-'}</span>,
                },
                {
                  key: 'color',
                  label: 'Color',
                  render: (v: any) =>
                    v ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-4 h-4 rounded border"
                          style={{ backgroundColor: String(v) }}
                        />
                        <span className="text-gray-700">{String(v)}</span>
                      </div>
                    ) : (
                      '-'
                    ),
                },
                {
                  key: 'customersCount',
                  label: 'Customers',
                  render: (v: any) => <span className="font-semibold">{Number(v ?? 0)}</span>,
                },
              ]}
              data={tags}
              selection={{
                selectedRowIds: selectedTagIds,
                onChange: (next) => setSelectedTagIds(next as string[]),
                getRowId: (row) => row.id,
              }}
              onView={(row) => openViewTag(row as Tag)}
              onEdit={(row) => openEditTag(row as Tag)}
              onDelete={(row) => deleteTag(row as Tag)}
              currentPage={tagsPage}
              totalPages={tagsTotalPages}
              onPageChange={(p) => {
                setTagsPage(p);
                setSelectedTagIds([]);
              }}
              loading={tagsLoading}
            />
          </>
        )}

        {tab === 'filter' && (
          <>
            <div className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Tag</label>
                <select
                  value={selectedTagId}
                  onChange={(e) => {
                    setSelectedTagId(e.target.value);
                    setSelectedCustomerIds([]);
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select a tag</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Customers</label>
                <input
                  value={customersSearch}
                  onChange={(e) => setCustomersSearch(e.target.value)}
                  placeholder="Name, phone, email..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={assignSelectedCustomers}
                  disabled={!selectedTagId || selectedCustomerIds.length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg"
                >
                  Add Selected ({selectedCustomerIds.length})
                </button>
                <button
                  onClick={removeSelectedCustomers}
                  disabled={!selectedTagId || selectedCustomerIds.length === 0}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg"
                >
                  Remove Selected
                </button>
              </div>
              <div className="md:col-span-3 flex items-center gap-2">
                <input
                  id="showOnlyInTag"
                  type="checkbox"
                  checked={showOnlyInTag}
                  onChange={(e) => setShowOnlyInTag(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="showOnlyInTag" className="text-sm text-gray-700">
                  Show only customers in selected tag
                </label>
              </div>
            </div>

            <DataTable
              columns={[
                {
                  key: 'name',
                  label: 'Customer',
                  render: (_: any, row: CustomerRow) => (
                    <div>
                      <div className="font-semibold text-gray-900">
                        {row.name || '-'} {row.lastName || ''}
                      </div>
                      {row.isGuest ? (
                        <div className="text-xs text-orange-600">Guest</div>
                      ) : (
                        <div className="text-xs text-gray-500">Registered</div>
                      )}
                    </div>
                  ),
                },
                { key: 'phone', label: 'Phone' },
                {
                  key: 'email',
                  label: 'Email',
                  render: (v: any) => <span className="text-gray-700">{v || '-'}</span>,
                },
                {
                  key: 'tags',
                  label: 'Tags',
                  render: (v: any) => {
                    const badges = safeArray<CustomerTagBadge>(v);
                    if (badges.length === 0) return '-';
                    return (
                      <div className="flex flex-wrap gap-2">
                        {badges.map((t) => (
                          <span
                            key={t.id}
                            className="px-2 py-1 rounded-full text-xs border"
                            style={t.color ? { borderColor: t.color, color: t.color } : undefined}
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    );
                  },
                },
              ]}
              data={customers}
              selection={{
                selectedRowIds: selectedCustomerIds,
                onChange: (next) => setSelectedCustomerIds(next as string[]),
                getRowId: (row) => row.id,
              }}
              currentPage={customersPage}
              totalPages={customersTotalPages}
              onPageChange={(p) => {
                setCustomersPage(p);
                setSelectedCustomerIds([]);
              }}
              loading={customersLoading}
            />
          </>
        )}

        <Modal
          isOpen={tagModalOpen}
          onClose={() => setTagModalOpen(false)}
          title={editingTag ? 'Edit Tag' : 'Create Tag'}
          footer={
            <>
              <button
                onClick={() => setTagModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveTag}
                disabled={savingTag || !tagForm.name.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingTag ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <FormInput
            label="Name"
            name="name"
            value={tagForm.name}
            onChange={(e) => setTagForm((s) => ({ ...s, name: String(e.target.value) }))}
            required
          />
          <FormInput
            label="Description"
            name="description"
            type="textarea"
            value={tagForm.description}
            onChange={(e) => setTagForm((s) => ({ ...s, description: String(e.target.value) }))}
          />
          <FormInput
            label="Color (optional)"
            name="color"
            value={tagForm.color}
            onChange={(e) => setTagForm((s) => ({ ...s, color: String(e.target.value) }))}
            placeholder="#22c55e or red"
          />
        </Modal>

        <Modal
          isOpen={!!viewingTag}
          onClose={() => setViewingTag(null)}
          title="Tag Details"
          footer={
            <button
              onClick={() => setViewingTag(null)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          }
        >
          {viewingTag && (
            <div className="space-y-2">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="text-lg font-semibold text-gray-900">{viewingTag.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Description</div>
                <div className="text-gray-800">{viewingTag.description || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Customers</div>
                <div className="text-gray-800 font-semibold">{Number(viewingTag.customersCount ?? 0)}</div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
