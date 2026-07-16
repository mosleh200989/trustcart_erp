import { Fragment, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaBoxes, FaChevronDown, FaChevronUp, FaHistory, FaSearch } from 'react-icons/fa';

type ProductHistoryRow = {
  id: number;
  productId?: number | null;
  productName?: string | null;
  productSku?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  summary: string;
  changedFields?: string[] | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  performedBy?: number | null;
  performedByName?: string | null;
  ipAddress?: string | null;
  createdAt: string;
};

const actionTone: Record<string, string> = {
  created: 'bg-green-50 text-green-700 border-green-200',
  updated: 'bg-blue-50 text-blue-700 border-blue-200',
  activated: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  deactivated: 'bg-amber-50 text-amber-700 border-amber-200',
  deleted: 'bg-red-50 text-red-700 border-red-200',
  image_deleted: 'bg-red-50 text-red-700 border-red-200',
  hot_deal_deleted: 'bg-red-50 text-red-700 border-red-200',
  shortlist_deleted: 'bg-red-50 text-red-700 border-red-200',
};

const titleCase = (value: string) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function JsonBlock({ title, value }: { title: string; value: any }) {
  if (!value) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      <pre className="max-h-72 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default function ProductHistoryPage() {
  const toast = useToast();
  const [items, setItems] = useState<ProductHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    q: '',
    action: '',
    entityType: '',
    productId: '',
    startDate: '',
    endDate: '',
  });
  const [filterOptions, setFilterOptions] = useState<{ actions: string[]; entityTypes: string[] }>({ actions: [], entityTypes: [] });

  const activeFilters = useMemo(() => Object.values(filters).filter((value) => String(value || '').trim()).length, [filters]);

  const loadHistory = async (nextPage = page, nextLimit = limit) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(nextPage),
        limit: String(nextLimit),
      };
      Object.entries(filters).forEach(([key, value]) => {
        if (String(value || '').trim()) params[key] = String(value).trim();
      });
      const res = await apiClient.get('/products/admin/history', { params });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      setTotal(Number(res.data?.total || 0));
      setTotalPages(Number(res.data?.totalPages || 1));
      setPage(Number(res.data?.page || nextPage));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load product history');
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.get('/products/admin/history/filters')
      .then((res) => setFilterOptions({
        actions: Array.isArray(res.data?.actions) ? res.data.actions : [],
        entityTypes: Array.isArray(res.data?.entityTypes) ? res.data.entityTypes : [],
      }))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadHistory(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, limit]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ q: '', action: '', entityType: '', productId: '', startDate: '', endDate: '' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                <FaHistory />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Product History</h1>
                <p className="mt-1 text-sm text-gray-500">Track product, image, promotion, suggestion, and ordering changes.</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {total} record{total === 1 ? '' : 's'} {activeFilters ? `(${activeFilters} active filters)` : ''}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <div className="relative md:col-span-2">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.q}
                onChange={(event) => updateFilter('q', event.target.value)}
                placeholder="Search product, SKU, user, summary"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select value={filters.action} onChange={(event) => updateFilter('action', event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">All Actions</option>
              {filterOptions.actions.map((action) => <option key={action} value={action}>{titleCase(action)}</option>)}
            </select>
            <select value={filters.entityType} onChange={(event) => updateFilter('entityType', event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">All Types</option>
              {filterOptions.entityTypes.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}
            </select>
            <input
              value={filters.productId}
              onChange={(event) => updateFilter('productId', event.target.value.replace(/[^\d]/g, ''))}
              placeholder="Product ID"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button onClick={clearFilters} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Clear
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm text-gray-600">
              Start Date
              <input type="date" value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600">
              End Date
              <input type="date" value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <div className="flex items-end">
              <PageSizeSelector value={limit} onChange={(value) => { setLimit(value); setPage(1); }} />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Summary</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">User</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-14 text-center text-gray-500">Loading product history...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-14 text-center text-gray-500">No product history found.</td></tr>
                ) : items.map((item) => {
                  const expanded = expandedId === item.id;
                  return (
                    <Fragment key={item.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{formatDateTime(item.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FaBoxes className="text-gray-400" />
                            <div>
                              <div className="font-semibold text-gray-900">{item.productName || (item.productId ? `Product #${item.productId}` : titleCase(item.entityType))}</div>
                              <div className="text-xs text-gray-500">{item.productSku || (item.productId ? `ID: ${item.productId}` : item.entityId || '-')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${actionTone[item.action] || 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                            {titleCase(item.action)}
                          </span>
                          <div className="mt-1 text-xs text-gray-400">{titleCase(item.entityType)}</div>
                        </td>
                        <td className="max-w-xl px-4 py-3 text-sm text-gray-700">
                          <div>{item.summary}</div>
                          {item.changedFields && item.changedFields.length > 0 && (
                            <div className="mt-1 text-xs text-gray-500">Changed: {item.changedFields.join(', ')}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>{item.performedByName || 'System'}</div>
                          {item.performedBy && <div className="text-xs text-gray-400">ID: {item.performedBy}</div>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setExpandedId(expanded ? null : item.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {expanded ? <FaChevronUp /> : <FaChevronDown />}
                            View
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50 px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-3">
                              <JsonBlock title="Old Values" value={item.oldValues} />
                              <JsonBlock title="New Values" value={item.newValues} />
                              <JsonBlock title="Metadata" value={{ ...(item.metadata || {}), ipAddress: item.ipAddress || undefined }} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <button disabled={page <= 1 || loading} onClick={() => loadHistory(page - 1, limit)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages || loading} onClick={() => loadHistory(page + 1, limit)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
