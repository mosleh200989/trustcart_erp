import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaPlus, FaEdit, FaTrash, FaCopy, FaEye, FaEyeSlash, FaExternalLinkAlt, FaChartBar } from 'react-icons/fa';

interface LandingPage {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  description: string;
  hero_image_url: string;
  is_active: boolean;
  view_count: number;
  order_count: number;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  active: number;
  totalViews: number;
  totalOrders: number;
}

export default function LandingPagesIndex() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pagesRes, statsRes] = await Promise.all([
        apiClient.get('/landing-pages'),
        apiClient.get('/landing-pages/stats'),
      ]);
      setPages(pagesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch landing pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = async (id: number) => {
    try {
      await apiClient.put(`/landing-pages/${id}/toggle`);
      fetchData();
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/landing-pages/${id}`);
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await apiClient.post(`/landing-pages/${id}/duplicate`);
      fetchData();
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1>
            <p className="text-gray-500 mt-1">
              Create and manage product landing pages for marketing campaigns
            </p>
          </div>
          <Link
            href="/admin/landing-pages/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus /> New Landing Page
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="text-sm text-gray-500">Total Pages</div>
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="text-sm text-gray-500">Active Pages</div>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <div className="text-sm text-gray-500">Total Views</div>
              <div className="text-2xl font-bold text-purple-600">{stats.totalViews.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="text-sm text-gray-500">Total Orders</div>
              <div className="text-2xl font-bold text-orange-600">{stats.totalOrders.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Landing Pages Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : pages.length === 0 ? (
            <div className="p-8 text-center">
              <FaChartBar className="mx-auto text-4xl text-gray-300 mb-3" />
              <p className="text-gray-500">No landing pages yet.</p>
              <Link
                href="/admin/landing-pages/create"
                className="text-blue-600 hover:underline mt-2 inline-block"
              >
                Create your first landing page →
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug / URL</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Views</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {page.hero_image_url && (
                          <img
                            src={page.hero_image_url}
                            alt={page.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{page.title}</div>
                          <div className="text-sm text-gray-500">
                            {page.description?.substring(0, 60) || 'No description'}
                            {page.description && page.description.length > 60 ? '...' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-blue-600 block">
                          /?cartflows_step={page.slug}
                        </code>
                        <code className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-500 block">
                          /lp/{page.slug}
                        </code>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(page.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          page.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {page.is_active ? <FaEye /> : <FaEyeSlash />}
                        {page.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {page.view_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {page.order_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/admin/landing-pages/${page.id}`}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit"
                        >
                          <FaEdit />
                        </Link>
                        <a
                          href={`/?cartflows_step=${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Preview"
                        >
                          <FaExternalLinkAlt />
                        </a>
                        <button
                          onClick={() => handleDuplicate(page.id)}
                          className="text-purple-600 hover:text-purple-800 p-1"
                          title="Duplicate"
                        >
                          <FaCopy />
                        </button>
                        {deleteConfirm === page.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(page.id)}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(page.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* URL Pattern Guide */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">📌 URL Pattern</h3>
          <p className="text-sm text-blue-700">
            Primary URL: <code className="bg-blue-100 px-1 rounded">shop.trustcart.com.bd/?cartflows_step=&#123;slug&#125;</code>
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Also works: <code className="bg-blue-100 px-1 rounded">shop.trustcart.com.bd/lp/&#123;slug&#125;</code>
          </p>
          <p className="text-sm text-blue-500 mt-1">
            Example: <code className="bg-blue-100 px-1 rounded">shop.trustcart.com.bd/?cartflows_step=seed-mix</code>
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
