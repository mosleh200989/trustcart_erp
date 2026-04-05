import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { stockAdjustments, warehouses } from '@/services/api';
import { FaBalanceScale, FaPlus, FaEye, FaPaperPlane, FaCheck, FaTimes } from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-200 text-gray-500',
};

const TYPE_LABELS: Record<string, string> = {
  increase: 'Increase',
  decrease: 'Decrease',
  write_off: 'Write Off',
  damage: 'Damage',
  expiry: 'Expiry',
  recount: 'Recount',
};

const STATUS_TABS = ['all', 'draft', 'pending_approval', 'approved', 'rejected'];

export default function AdjustmentsListPage() {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<any[]>([]);
  const [warehouseMap, setWarehouseMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [items, whs] = await Promise.all([stockAdjustments.list(), warehouses.list()]);
      setList(items);
      const wMap: Record<number, string> = {};
      whs.forEach((w: any) => { wMap[w.id] = w.name; });
      setWarehouseMap(wMap);
    } catch { toast.error('Failed to load adjustments'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (id: number) => {
    try {
      await stockAdjustments.submit(id);
      toast.success('Adjustment submitted for approval');
      loadData();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to submit'); }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this adjustment? Stock will be updated.')) return;
    try {
      await stockAdjustments.approve(id);
      toast.success('Adjustment approved — stock updated');
      loadData();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to approve'); }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await stockAdjustments.reject(id, reason);
      toast.success('Adjustment rejected');
      loadData();
    } catch { toast.error('Failed to reject'); }
  };

  const filtered = activeTab === 'all' ? list : list.filter(a => a.status === activeTab);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <FaBalanceScale className="text-indigo-600" /> Stock Adjustments
          </h1>
          <button onClick={() => router.push('/admin/inventory/adjustments/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <FaPlus /> New Adjustment
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {STATUS_TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {tab === 'all' ? 'All' : tab.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {tab !== 'all' && <span className="ml-1 text-xs">({list.filter(a => a.status === tab).length})</span>}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No adjustments found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Adjustment #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Warehouse</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Reason</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs">Items</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-indigo-600">{a.adjustment_number}</td>
                    <td className="px-4 py-3">{warehouseMap[a.warehouse_id] || `#${a.warehouse_id}`}</td>
                    <td className="px-4 py-3">{TYPE_LABELS[a.adjustment_type] || a.adjustment_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] || 'bg-gray-100'}`}>
                        {a.status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 truncate max-w-[200px]">{a.reason}</td>
                    <td className="px-4 py-3 text-center">{a.items?.length || 0}</td>
                    <td className="px-4 py-3">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => router.push(`/admin/inventory/adjustments/${a.id}`)} title="View" className="p-1.5 text-gray-500 hover:text-blue-600"><FaEye size={14} /></button>
                        {a.status === 'draft' && (
                          <button onClick={() => handleSubmit(a.id)} title="Submit" className="p-1.5 text-gray-500 hover:text-indigo-600"><FaPaperPlane size={14} /></button>
                        )}
                        {a.status === 'pending_approval' && (
                          <>
                            <button onClick={() => handleApprove(a.id)} title="Approve" className="p-1.5 text-gray-500 hover:text-green-600"><FaCheck size={14} /></button>
                            <button onClick={() => handleReject(a.id)} title="Reject" className="p-1.5 text-gray-500 hover:text-red-600"><FaTimes size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
