import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import {
  FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaExternalLinkAlt, FaStore, FaBoxes,
} from 'react-icons/fa';

export interface Storefront {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  extra_domains: string[];
  template: string;
  logo_url: string | null;
  tagline: string | null;
  meta_pixel_id: string | null;
  is_active: boolean;
  created_at: string;
}

export default function StorefrontsIndex() {
  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', domain: '', template: 'handsomeman' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/storefronts');
      setStorefronts(res.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load storefronts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggle = async (sf: Storefront) => {
    try {
      await apiClient.put(`/storefronts/${sf.id}`, { is_active: !sf.is_active });
      fetchData();
    } catch (err) {
      console.error('Failed to toggle storefront:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/storefronts/${id}`);
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete storefront:', err);
    }
  };

  const slugify = (value: string) =>
    value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) return;
    try {
      setCreating(true);
      await apiClient.post('/storefronts', {
        name: form.name,
        slug: form.slug,
        domain: form.domain || null,
        template: form.template,
      });
      setShowCreate(false);
      setForm({ name: '', slug: '', domain: '', template: 'handsomeman' });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create storefront');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaStore className="text-brand" /> Storefronts
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Brand websites selling from the shared TrustCart inventory. Orders land in Sales with the storefront slug as source.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button flex items-center gap-2 text-sm font-medium"
          >
            <FaPlus /> New Storefront
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-card mb-4">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading storefronts…</div>
        ) : storefronts.length === 0 ? (
          <div className="bg-white rounded-card border border-gray-200 p-12 text-center text-gray-500">
            No storefronts yet. Create one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storefronts.map((sf) => (
              <div key={sf.id} className="bg-white rounded-card border border-gray-200 p-5 flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {sf.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sf.logo_url} alt={sf.name} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-900 text-white flex items-center justify-center font-bold">
                        {sf.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h2 className="font-semibold text-gray-900">{sf.name}</h2>
                      <p className="text-xs text-gray-500">/{sf.slug} · template: {sf.template}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-badge font-medium ${
                      sf.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {sf.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {sf.tagline && <p className="text-sm text-gray-600 mt-3">{sf.tagline}</p>}

                <div className="text-sm text-gray-700 mt-3">
                  {sf.domain ? (
                    <a
                      href={`https://${sf.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {sf.domain} <FaExternalLinkAlt className="text-[10px]" />
                    </a>
                  ) : (
                    <span className="text-gray-400">No domain set</span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/admin/storefronts/${sf.id}`}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white text-sm px-3 py-2 rounded-button flex items-center justify-center gap-2"
                  >
                    <FaBoxes /> Manage
                  </Link>
                  <button
                    onClick={() => handleToggle(sf)}
                    title={sf.is_active ? 'Deactivate' : 'Activate'}
                    className="p-2 text-gray-500 hover:text-gray-900 border border-gray-200 rounded-button"
                  >
                    {sf.is_active ? <FaEye /> : <FaEyeSlash />}
                  </button>
                  {deleteConfirm === sf.id ? (
                    <button
                      onClick={() => handleDelete(sf.id)}
                      className="p-2 bg-red-600 text-white rounded-button text-xs font-medium"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(sf.id)}
                      onBlur={() => setDeleteConfirm(null)}
                      title="Delete"
                      className="p-2 text-gray-400 hover:text-red-600 border border-gray-200 rounded-button"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <form
              onSubmit={handleCreate}
              className="bg-white rounded-card shadow-xl w-full max-w-md p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">New Storefront</h2>

              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: f.slug === slugify(f.name) || !f.slug ? slugify(e.target.value) : f.slug,
                  }))
                }
                className="w-full border border-gray-300 rounded-card px-3 py-2 mb-3 text-sm"
                placeholder="Handsome Man"
                required
              />

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug <span className="text-gray-400 font-normal">(becomes the order source — cannot change easily later)</span>
              </label>
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                className="w-full border border-gray-300 rounded-card px-3 py-2 mb-3 text-sm font-mono"
                placeholder="handsomeman"
                required
              />

              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <input
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value.trim().toLowerCase() }))}
                className="w-full border border-gray-300 rounded-card px-3 py-2 mb-3 text-sm"
                placeholder="handsomemanbd.com"
              />

              <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
              <input
                value={form.template}
                onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}
                className="w-full border border-gray-300 rounded-card px-3 py-2 mb-1 text-sm font-mono"
              />
              <p className="text-xs text-gray-400 mb-4">
                Must match a hand-coded frontend template (e.g. “handsomeman”).
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button text-sm font-medium disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
