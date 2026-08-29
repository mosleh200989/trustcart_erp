import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { FaBug, FaPlus, FaSync } from 'react-icons/fa';

/**
 * Issues — staff report software problems to the development team.
 * Everyone on staff sees everything; the workflow itself is enforced
 * server-side, so this page only ever offers what the API will accept.
 */

interface IssueRow {
  id: number;
  title: string;
  category: string;
  priority: string;
  status: string;
  reporter: { id: number; name?: string };
  assignee: { id: number; name?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-100 text-amber-800' },
  resolved: { label: 'Resolved', cls: 'bg-purple-100 text-purple-800' },
  in_review: { label: 'In Review', cls: 'bg-cyan-100 text-cyan-800' },
  closed: { label: 'Closed', cls: 'bg-emerald-100 text-emerald-800' },
};

export const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  low: { label: 'Low', cls: 'bg-gray-100 text-gray-700' },
  normal: { label: 'Normal', cls: 'bg-gray-100 text-gray-700' },
  high: { label: 'High', cls: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', cls: 'bg-red-100 text-red-800' },
};

const CATEGORIES = ['bug', 'feature', 'data-issue', 'other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export default function IssuesList() {
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<IssueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [q, setQ] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'bug', priority: 'normal' });

  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (status) params.status = status;
      if (category) params.category = category;
      if (q.trim()) params.q = q.trim();
      if (mineOnly && (user as any)?.id) params.reporterId = (user as any).id;
      const { data } = await apiClient.get('/issues', { params });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [page, status, category, q, mineOnly, user, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const createIssue = async () => {
    if (!form.title.trim()) {
      toast.error('A title is required');
      return;
    }
    setCreating(true);
    try {
      const { data } = await apiClient.post('/issues', form);
      toast.success('Issue reported');
      setShowCreate(false);
      setForm({ title: '', description: '', category: 'bug', priority: 'normal' });
      window.location.href = `/admin/issues/${data.id}`;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create issue');
    } finally {
      setCreating(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <FaBug className="text-2xl text-red-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Issues</h1>
              <p className="text-sm text-gray-500">
                Report software problems to the development team, and track them to closure.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <FaPlus /> Report an issue
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap items-center gap-3">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border rounded px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="border rounded px-3 py-2 text-sm">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={mineOnly} onChange={(e) => { setMineOnly(e.target.checked); setPage(1); }} />
            Reported by me
          </label>
          <div className="flex items-center gap-2 ml-auto">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
              placeholder="Search title or description…"
              className="border rounded px-3 py-2 text-sm w-64"
            />
            <button onClick={() => { setPage(1); load(); }} className="p-2 text-gray-500 hover:text-gray-700" title="Refresh">
              <FaSync />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Reporter</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No issues match.</td></tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">#{i.id}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/issues/${i.id}`} className="font-medium text-gray-800 hover:text-emerald-600">
                        {i.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_META[i.status]?.cls || 'bg-gray-100'}`}>
                        {STATUS_META[i.status]?.label || i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_META[i.priority]?.cls || ''}`}>
                        {PRIORITY_META[i.priority]?.label || i.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{i.category}</td>
                    <td className="px-4 py-3 text-gray-600">{i.reporter?.name || `#${i.reporter?.id}`}</td>
                    <td className="px-4 py-3 text-gray-600">{i.assignee ? (i.assignee.name || `#${i.assignee.id}`) : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(i.updatedAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>{total} issue(s)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Previous</button>
              <span className="px-3 py-1">{page} / {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Report an issue</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    maxLength={300}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Short summary of the problem"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Details</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={5}
                    className="w-full border rounded px-3 py-2"
                    placeholder="What happened, where, and what you expected. Screenshots and voice notes can be added after creating."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border rounded px-3 py-2">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Priority</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border rounded px-3 py-2">
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={createIssue} disabled={creating} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create issue'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
