// LP Maker — list of builder pages (landing_pages with template='builder').
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import {
  FaPlus, FaEdit, FaTrash, FaCopy, FaEye, FaEyeSlash, FaExternalLinkAlt, FaMagic,
} from 'react-icons/fa';

interface BuilderPage {
  id: number;
  title: string;
  slug: string;
  template?: string;
  is_active: boolean;
  view_count: number;
  order_count: number;
  updated_at: string;
}

export default function LpMakerIndex() {
  const [pages, setPages] = useState<BuilderPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/landing-pages');
      const all: BuilderPage[] = res.data || [];
      setPages(all.filter((p) => p.template === 'builder'));
    } catch (err) {
      console.error('Failed to fetch builder pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggle = async (id: number) => {
    try { await apiClient.put(`/landing-pages/${id}/toggle`); fetchData(); }
    catch (err) { console.error('Failed to toggle:', err); }
  };

  const handleDuplicate = async (id: number) => {
    try { await apiClient.post(`/landing-pages/${id}/duplicate`); fetchData(); }
    catch (err) { console.error('Failed to duplicate:', err); }
  };

  const handleDelete = async (id: number) => {
    try { await apiClient.delete(`/landing-pages/${id}`); setDeleteConfirm(null); fetchData(); }
    catch (err) { console.error('Failed to delete:', err); }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaMagic className="text-brand" /> LP Maker
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Build landing pages with drag-and-drop blocks. Published at /lp/&lt;slug&gt; — orders land in Sales like every landing page.
            </p>
          </div>
          <Link
            href="/admin/lp-maker/create"
            className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button flex items-center gap-2 text-sm font-medium"
          >
            <FaPlus /> New Page
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading pages…</div>
        ) : pages.length === 0 ? (
          <div className="bg-white rounded-card border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No builder pages yet.</p>
            <Link
              href="/admin/lp-maker/create"
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button text-sm font-medium"
            >
              <FaPlus /> Build your first page
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-card border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Page</th>
                  <th className="text-center px-4 py-3">Views</th>
                  <th className="text-center px-4 py-3">Orders</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pages.map((page) => (
                  <tr key={page.id}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/lp-maker/${page.id}`} className="font-medium text-gray-900 hover:text-brand">
                        {page.title}
                      </Link>
                      <div className="text-xs text-gray-400 font-mono">/lp/{page.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{page.view_count}</td>
                    <td className="px-4 py-3 text-center font-medium text-gray-800">{page.order_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-badge font-medium ${page.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {page.is_active ? 'Live' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/lp/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-gray-900"
                          title="Open public page"
                        >
                          <FaExternalLinkAlt size={13} />
                        </a>
                        <Link href={`/admin/lp-maker/${page.id}`} className="p-2 text-gray-400 hover:text-brand" title="Edit">
                          <FaEdit size={14} />
                        </Link>
                        <button onClick={() => handleDuplicate(page.id)} className="p-2 text-gray-400 hover:text-gray-900" title="Duplicate">
                          <FaCopy size={13} />
                        </button>
                        <button onClick={() => handleToggle(page.id)} className="p-2 text-gray-400 hover:text-gray-900" title={page.is_active ? 'Unpublish' : 'Publish'}>
                          {page.is_active ? <FaEye size={14} className="text-green-600" /> : <FaEyeSlash size={14} />}
                        </button>
                        {deleteConfirm === page.id ? (
                          <button onClick={() => handleDelete(page.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium">
                            Confirm
                          </button>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(page.id)}
                            onBlur={() => setDeleteConfirm(null)}
                            className="p-2 text-gray-300 hover:text-red-600"
                            title="Delete"
                          >
                            <FaTrash size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
