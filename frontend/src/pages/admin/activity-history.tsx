import { useEffect, useState, useCallback, useRef } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import {
  FaHistory, FaSearch, FaFilter,
  FaTimes, FaEye,
  FaPlus, FaEdit, FaTrash, FaExchangeAlt
} from 'react-icons/fa';

interface AuditLogEntry {
  id: number;
  module: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  changed_fields: string[] | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  performed_by: number | null;
  performed_by_name: string | null;
  endpoint: string | null;
  http_method: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface Filters {
  modules: string[];
  entityTypes: string[];
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  POST: 'bg-green-100 text-green-800',
  PUT: 'bg-blue-100 text-blue-800',
  PATCH: 'bg-yellow-100 text-yellow-800',
};

const ACTION_ICONS: Record<string, any> = {
  CREATE: FaPlus,
  UPDATE: FaEdit,
  DELETE: FaTrash,
  POST: FaPlus,
  PUT: FaEdit,
  PATCH: FaExchangeAlt,
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatRelativeTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function JsonDiff({ label, value }: { label: string; value: any }) {
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return null;
  return (
    <div className="mt-2">
      <div className="text-xs font-semibold text-gray-600 mb-1">{label}:</div>
      <div className="bg-gray-50 rounded p-3 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto border">
        {typeof value === 'object' ? (
          <table className="w-full">
            <tbody>
              {Object.entries(value).map(([key, val]) => (
                <tr key={key} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-1 pr-3 font-semibold text-gray-700 whitespace-nowrap align-top">{key}</td>
                  <td className="py-1 text-gray-600 break-all">
                    {val === null ? <span className="italic text-gray-400">null</span> : typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre>{JSON.stringify(value, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

export default function ActivityHistoryPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<Filters>({ modules: [], entityTypes: [] });

  // Pagination (hidden, used internally for lazy loading)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  // Filters
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadLogs = useCallback(async (p?: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const currentPage = p || page;
      const params: any = { page: currentPage, limit };
      if (search.trim()) params.search = search.trim();
      if (moduleFilter) params.module = moduleFilter;
      if (actionFilter) params.action = actionFilter;
      if (entityTypeFilter) params.entityType = entityTypeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await apiClient.get('/audit-logs', { params });
      const data = res.data;
      const newLogs = data?.data || [];
      const newTotal = data?.total || 0;

      if (append) {
        setLogs((prev) => [...prev, ...newLogs]);
      } else {
        setLogs(newLogs);
      }
      setTotal(newTotal);
      setHasMore(currentPage * limit < newTotal);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      if (!append) {
        setLogs([]);
        setTotal(0);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, limit, search, moduleFilter, actionFilter, entityTypeFilter, startDate, endDate]);

  const loadFilters = async () => {
    try {
      const res = await apiClient.get('/audit-logs/filters');
      setFilters(res.data || { modules: [], entityTypes: [] });
    } catch {
      // Silently fail
    }
  };

  // Initial load
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      loadLogs(1);
      loadFilters();
    }
  }, []);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadLogs(nextPage, true);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, loadLogs]);

  const handleApplyFilters = () => {
    setPage(1);
    setHasMore(true);
    loadLogs(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setModuleFilter('');
    setActionFilter('');
    setEntityTypeFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setHasMore(true);
    setTimeout(() => loadLogs(1), 0);
  };

  const handleViewDetail = async (logId: number) => {
    try {
      setDetailLoading(true);
      const res = await apiClient.get(`/audit-logs/${logId}`);
      setSelectedLog(res.data);
    } catch {
      setSelectedLog(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const hasActiveFilters = !!(search || moduleFilter || actionFilter || entityTypeFilter || startDate || endDate);

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaHistory className="text-indigo-600" /> Activity History
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Complete log of all actions performed across the system
            </p>
          </div>
          <button
            onClick={() => { setPage(1); setHasMore(true); loadLogs(1); loadFilters(); }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            Refresh
          </button>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[250px] relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                  placeholder="Search by description, entity type, user name..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 border ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                <FaFilter size={12} /> Filters {hasActiveFilters && <span className="w-2 h-2 bg-indigo-600 rounded-full" />}
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                Search
              </button>
              {hasActiveFilters && (
                <button onClick={handleClearFilters} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <FaTimes size={10} /> Clear
                </button>
              )}
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Module</label>
                  <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">All Modules</option>
                    {filters.modules.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                  <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">All Actions</option>
                    <option value="CREATE">Create</option>
                    <option value="UPDATE">Update</option>
                    <option value="DELETE">Delete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Entity Type</label>
                  <select value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">All Types</option>
                    {filters.entityTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between text-sm text-gray-600">
            <div>
              {total > 0
                ? `Showing ${logs.length} of ${total.toLocaleString()} entries`
                : 'No entries found'}
              {hasActiveFilters && <span className="ml-1 text-indigo-600">(filtered)</span>}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs">Rows per page:</label>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); setHasMore(true); setTimeout(() => loadLogs(1), 0); }}
                className="border rounded px-2 py-1 text-xs"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-16 text-gray-500">Loading activity history...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FaHistory className="mx-auto text-4xl text-gray-300 mb-3" />
              <p>No activity logs found</p>
              {hasActiveFilters && <p className="text-sm mt-1">Try adjusting your filters</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changes</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => {
                    const ActionIcon = ACTION_ICONS[log.action] || FaExchangeAlt;
                    const actionColor = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800';
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700" title={formatDate(log.created_at)}>
                            {formatRelativeTime(log.created_at)}
                          </div>
                          <div className="text-xs text-gray-400">{formatDate(log.created_at)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{log.performed_by_name || '—'}</div>
                          {log.performed_by && <div className="text-xs text-gray-400">ID: {log.performed_by}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${actionColor}`}>
                            <ActionIcon size={10} /> {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">{log.module}</span>
                          {log.entity_id && (
                            <div className="text-xs text-gray-400">#{log.entity_id}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-800 max-w-xs truncate" title={log.description}>
                            {log.description}
                          </div>
                          <div className="text-xs text-gray-400">{log.entity_type}</div>
                        </td>
                        <td className="px-4 py-3">
                          {log.changed_fields && log.changed_fields.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {log.changed_fields.slice(0, 4).map((f) => (
                                <span key={f} className="bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded">{f}</span>
                              ))}
                              {log.changed_fields.length > 4 && (
                                <span className="text-xs text-gray-400">+{log.changed_fields.length - 4} more</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewDetail(log.id)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View details"
                          >
                            <FaEye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Lazy loading sentinel */}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="text-center py-4 text-gray-500 text-sm">Loading more...</div>
          )}
          {!hasMore && logs.length > 0 && (
            <div className="text-center py-3 text-gray-400 text-xs border-t">All {total.toLocaleString()} entries loaded</div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {(selectedLog || detailLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => !detailLoading && setSelectedLog(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="p-8 text-center text-gray-500">Loading details...</div>
            ) : selectedLog ? (
              <>
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FaEye className="text-indigo-600" /> Action Detail
                  </h3>
                  <button onClick={() => setSelectedLog(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <FaTimes />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  {/* Description */}
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <p className="text-gray-900 font-medium">{selectedLog.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(selectedLog.created_at)}</p>
                  </div>

                  {/* Meta Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">User</div>
                      <div className="text-sm font-medium">{selectedLog.performed_by_name || 'System'}</div>
                      {selectedLog.performed_by && <div className="text-xs text-gray-400">ID: {selectedLog.performed_by}</div>}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Action</div>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${ACTION_COLORS[selectedLog.action] || 'bg-gray-100 text-gray-800'}`}>
                        {selectedLog.action}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Module</div>
                      <div className="text-sm font-medium">{selectedLog.module}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Entity</div>
                      <div className="text-sm font-medium">{selectedLog.entity_type}</div>
                      {selectedLog.entity_id && <div className="text-xs text-gray-400">ID: {selectedLog.entity_id}</div>}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Endpoint</div>
                      <div className="text-xs font-mono text-gray-700 break-all">
                        {selectedLog.http_method && <span className="font-bold mr-1">{selectedLog.http_method}</span>}
                        {selectedLog.endpoint || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">IP Address</div>
                      <div className="text-sm text-gray-700">{selectedLog.ip_address || '—'}</div>
                    </div>
                  </div>

                  {/* Changed Fields */}
                  {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-2">Changed Fields:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedLog.changed_fields.map((f) => (
                          <span key={f} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded border border-blue-200">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Old / New Values */}
                  <JsonDiff label="Previous Values" value={selectedLog.old_values} />
                  <JsonDiff label="New Values" value={selectedLog.new_values} />

                  {/* User Agent */}
                  {selectedLog.user_agent && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">User Agent</div>
                      <div className="text-xs text-gray-400 break-all">{selectedLog.user_agent}</div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
