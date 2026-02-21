import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

type CallRow = any;

type CallsResponse = {
  items: CallRow[];
  total: number;
  page: number;
  limit: number;
};

export default function TelephonyCallsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CallsResponse | null>(null);
  const [status, setStatus] = useState<string>('');
  const [direction, setDirection] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (direction) params.set('direction', direction);
    if (customerPhone.trim()) params.set('customerPhone', customerPhone.trim());
    params.set('page', String(page));
    params.set('limit', String(limit));
    return params.toString();
  }, [status, direction, customerPhone, page, limit]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/telephony/calls?${queryString}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load calls', err);
      setData({ items: [], total: 0, page, limit });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / (data?.limit || limit)));

  const formatDateTime = (value: any) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">PBX Call Logs</h1>
            <p className="text-gray-600 mt-1">Browse inbound/outbound calls and recordings</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
                <option value="">All</option>
                <option value="initiated">Initiated</option>
                <option value="ringing">Ringing</option>
                <option value="answered">Answered</option>
                <option value="missed">Missed</option>
                <option value="failed">Failed</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Direction</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={direction} onChange={(e) => { setPage(1); setDirection(e.target.value); }}>
                <option value="">All</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Customer Phone</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g. 017XXXXXXXX"
                value={customerPhone}
                onChange={(e) => { setPage(1); setCustomerPhone(e.target.value); }}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Page Size</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={String(limit)} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="150">150</option>
                <option value="200">200</option>
                <option value="300">300</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="text-sm text-gray-600">Total: <span className="font-semibold text-gray-900">{data?.total ?? '—'}</span></div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <div className="text-sm text-gray-700">Page <span className="font-semibold">{page}</span> / {totalPages}</div>
              <button
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recording</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">Loading…</td>
                </tr>
              )}

              {!loading && (data?.items || []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">No calls found</td>
                </tr>
              )}

              {(data?.items || []).map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">#{c.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.direction || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.customerPhone || c.fromNumber || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.agentPhone || c.toNumber || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(c.startedAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    {c.recordingUrl ? (
                      <span className="text-green-700 font-medium">Available</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/telephony/calls/${c.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
