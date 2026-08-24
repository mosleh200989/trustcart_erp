// Storefronts → Testimonials: curated customer reviews reused across pages.
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaPlus, FaStar, FaTrash, FaEye, FaEyeSlash, FaQuoteRight, FaEdit } from 'react-icons/fa';

interface Testimonial {
  id: number;
  customer_name: string;
  location: string | null;
  rating: number;
  text: string;
  image_url: string | null;
  source: string;
  is_approved: boolean;
  created_at: string;
}

const SOURCES = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Phone call' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  customer_name: '', location: '', rating: 5, text: '', image_url: '', source: 'other',
};

export default function TestimonialsIndex() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/testimonials');
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to load testimonials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setEditorOpen(true); };
  const openEdit = (t: Testimonial) => {
    setEditingId(t.id);
    setForm({
      customer_name: t.customer_name, location: t.location || '', rating: t.rating,
      text: t.text, image_url: t.image_url || '', source: t.source,
    });
    setEditorOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingId) await apiClient.put(`/testimonials/${editingId}`, form);
      else await apiClient.post('/testimonials', form);
      setEditorOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleApproved = async (t: Testimonial) => {
    try { await apiClient.put(`/testimonials/${t.id}`, { is_approved: !t.is_approved }); fetchData(); }
    catch (err) { console.error(err); }
  };

  const remove = async (id: number) => {
    try { await apiClient.delete(`/testimonials/${id}`); setDeleteConfirm(null); fetchData(); }
    catch (err) { console.error(err); }
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data?.url) setForm((f: any) => ({ ...f, image_url: res.data.url }));
    } catch { alert('Upload failed.'); } finally { setUploading(false); e.target.value = ''; }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaQuoteRight className="text-brand" /> Testimonials
          </h1>
          <button
            onClick={openCreate}
            className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button flex items-center gap-2 text-sm font-medium"
          >
            <FaPlus /> Add Testimonial
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-6 max-w-3xl">
          One library, reused everywhere — LP Maker&apos;s Reviews block copies from here.
          Only approved testimonials appear in the picker.
        </p>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading testimonials…</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-card border border-gray-200 p-12 text-center text-gray-500">
            No testimonials yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((t) => (
              <div key={t.id} className={`bg-white rounded-card border border-gray-200 p-4 flex flex-col ${t.is_approved ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {t.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.image_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold">
                      {t.customer_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{t.customer_name}</div>
                    <div className="text-xs text-gray-400">
                      {t.location && <>{t.location} · </>}{SOURCES.find((s) => s.value === t.source)?.label || t.source}
                    </div>
                  </div>
                  <div className="text-amber-500 text-sm whitespace-nowrap">
                    {Array.from({ length: t.rating }).map((_, i) => <FaStar key={i} className="inline" size={11} />)}
                  </div>
                </div>
                <p className="text-sm text-gray-600 flex-1 line-clamp-4">“{t.text}”</p>
                <div className="flex items-center justify-end gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <span className={`mr-auto text-xs px-2 py-0.5 rounded-badge font-medium ${t.is_approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.is_approved ? 'Approved' : 'Hidden'}
                  </span>
                  <button onClick={() => openEdit(t)} className="p-2 text-gray-400 hover:text-brand" title="Edit"><FaEdit size={13} /></button>
                  <button onClick={() => toggleApproved(t)} className="p-2 text-gray-400 hover:text-gray-900" title={t.is_approved ? 'Hide' : 'Approve'}>
                    {t.is_approved ? <FaEye size={14} className="text-green-600" /> : <FaEyeSlash size={14} />}
                  </button>
                  {deleteConfirm === t.id ? (
                    <button onClick={() => remove(t.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium">Confirm</button>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(t.id)}
                      onBlur={() => setDeleteConfirm(null)}
                      className="p-2 text-gray-300 hover:text-red-600"
                      title="Delete"
                    >
                      <FaTrash size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {editorOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <form onSubmit={save} className="bg-white rounded-card shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingId ? 'Edit testimonial' : 'Add testimonial'}
              </h2>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer name *</label>
                  <input
                    value={form.customer_name}
                    onChange={(e) => setForm((f: any) => ({ ...f, customer_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-card px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))}
                    className="w-full border border-gray-300 rounded-card px-3 py-2 text-sm"
                    placeholder="e.g. Bogura"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <select
                    value={form.rating}
                    onChange={(e) => setForm((f: any) => ({ ...f, rating: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-card px-3 py-2 text-sm bg-white"
                  >
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm((f: any) => ({ ...f, source: e.target.value }))}
                    className="w-full border border-gray-300 rounded-card px-3 py-2 text-sm bg-white"
                  >
                    {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-1">Review text *</label>
              <textarea
                value={form.text}
                onChange={(e) => setForm((f: any) => ({ ...f, text: e.target.value }))}
                rows={4}
                className="w-full border border-gray-300 rounded-card px-3 py-2 mb-3 text-sm"
                required
              />

              <label className="block text-sm font-medium text-gray-700 mb-1">Photo / screenshot</label>
              <div className="flex items-center gap-2 mb-4">
                <input
                  value={form.image_url}
                  onChange={(e) => setForm((f: any) => ({ ...f, image_url: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-card px-3 py-2 text-sm"
                  placeholder="https://…"
                />
                <label className="text-xs px-2.5 py-2 border border-gray-300 rounded-card cursor-pointer text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                  {uploading ? 'Uploading…' : '⬆ Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditorOpen(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
