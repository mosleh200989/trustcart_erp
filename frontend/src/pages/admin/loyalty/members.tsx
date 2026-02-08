import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Pagination from '@/components/admin/Pagination';
import apiClient from '@/services/api';
import { FaSearch, FaUser } from 'react-icons/fa';

export default function LoyaltyMembersList() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await apiClient.get('/customers');
        const list = Array.isArray(res.data) ? res.data : [];
        setCustomers(list);
      } catch (e: any) {
        console.error('Failed to load customers:', e);
        setCustomers([]);
        setError(e?.response?.data?.message || e?.message || 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const name = String(c?.name ?? '').toLowerCase();
      const email = String(c?.email ?? '').toLowerCase();
      const phone = String(c?.phone ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [customers, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedCustomers = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-800">Loyalty Members</h1>
          <p className="text-gray-600">Open a customer to view membership, wallet, and referral stats.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:max-w-md">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, phone, email"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="text-sm text-gray-600">{filtered.length} customers</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="text-sm text-gray-600">{filtered.length} customers</div>
            <PageSizeSelector
              value={itemsPerPage}
              onChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
          </div>
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-sm font-semibold text-gray-700 px-4 py-3">Customer</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-4 py-3">Phone</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-4 py-3">Email</th>
                <th className="text-right text-sm font-semibold text-gray-700 px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => (
                  <tr key={String(c?.id)} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{c?.name || '—'}</div>
                      <div className="text-xs text-gray-500">ID: {c?.id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c?.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c?.email || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/loyalty/member/${encodeURIComponent(String(c?.id))}`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                      >
                        <FaUser />
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              showInfo={true}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
