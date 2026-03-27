import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { inventoryCounts, warehouses } from '@/services/api';
import { FaClipboardList, FaPlus, FaEye, FaPlay, FaCheckDouble, FaCheck } from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-500',
};

const TYPE_LABELS: Record<string, string> = { full: 'Full Count', cycle: 'Cycle Count', spot: 'Spot Check' };

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'planned', label: 'Planned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
];

export default function InventoryCountsListPage() {
  const router = useRouter();
  const toast = useToast();
  const [counts, setCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseMap, setWarehouseMap] = useState<Record<number, string>>({});

  useEffect(() => { loadCounts(); loadWarehouses(); }, []);

  const loadWarehouses = async () => {
    try {
      const list = await warehouses.list();
      const m: Record<number, string> = {};
      list.forEach((w: any) => { m[w.id] = w.name; });
      setWarehouseMap(m);
    } catch { /* ignore */ }
  };

  const loadCounts = async () => {
    setLoading(true);
    try { setCounts(await inventoryCounts.list()); }
    catch { toast.error('Failed to load counts'); }
    finally { setLoading(false); }
  };

  const filtered = statusFilter === 'all' ? counts : counts.filter(c => c.status === statusFilter);

  const handleStart = async (id: number) => {
    try { await inventoryCounts.start(id); toast.success('Count started'); loadCounts(); }
    catch { toast.error('Failed to start'); }
  };
  const handleComplete = async (id: number) => {
    try { await inventoryCounts.complete(id); toast.success('Count completed'); loadCounts(); }
    catch { toast.error('Failed to complete'); }
  };
  const handleApprove = async (id: number) => {
    if (!confirm('Approve count? Variances will be applied to stock.')) return;
    try { await inventoryCounts.approve(id); toast.success('Count approved — stock adjusted'); loadCounts(); }
    catch { toast.error('Failed to approve'); }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FaClipboardList className="text-indigo-600" /> Inventory Counts</h1>
          <button onClick={() => router.push('/admin/inventory/counts/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"><FaPlus /> New Count</button>
        </div>

        <div className="flex gap-2 mb-4 border-b">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setStatusFilter(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${statusFilter === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label} {t.key !== 'all' && <span className="ml-1 text-xs bg-gray-100 rounded-full px-2 py-0.5">{counts.filter(c => c.status === t.key).length}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No counts found</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Count #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Variances</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Started</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => router.push(`/admin/inventory/counts/${c.id}`)}>{c.count_number}</td>
                    <td className="px-4 py-3">{warehouseMap[c.warehouse_id] || `#${c.warehouse_id}`}</td>
                    <td className="px-4 py-3">{TYPE_LABELS[c.count_type] || c.count_type}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>{c.status?.replace(/_/g, ' ').toUpperCase()}</span></td>
                    <td className="px-4 py-3 text-right">{c.total_items_counted || '—'}</td>
                    <td className="px-4 py-3 text-right">{c.total_variances || '—'}</td>
                    <td className="px-4 py-3">{c.started_at ? new Date(c.started_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => router.push(`/admin/inventory/counts/${c.id}`)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="View"><FaEye size={14} /></button>
                        {c.status === 'planned' && <button onClick={() => handleStart(c.id)} className="p-1.5 rounded hover:bg-blue-100 text-blue-600" title="Start"><FaPlay size={14} /></button>}
                        {c.status === 'in_progress' && <button onClick={() => handleComplete(c.id)} className="p-1.5 rounded hover:bg-yellow-100 text-yellow-600" title="Complete"><FaCheckDouble size={14} /></button>}
                        {c.status === 'pending_review' && <button onClick={() => handleApprove(c.id)} className="p-1.5 rounded hover:bg-green-100 text-green-600" title="Approve"><FaCheck size={14} /></button>}
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
