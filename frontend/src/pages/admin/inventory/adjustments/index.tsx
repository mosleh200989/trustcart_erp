import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { stockAdjustments, warehouses } from '@/services/api';
import { FaBalanceScale, FaPlus, FaEye } from 'react-icons/fa';

const TYPE_LABELS: Record<string, string> = {
  increase: 'Increase',
  decrease: 'Decrease',
  write_off: 'Write Off',
  damage: 'Damage',
  expiry: 'Expiry',
  recount: 'Recount',
};

export default function AdjustmentsListPage() {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<any[]>([]);
  const [warehouseMap, setWarehouseMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

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

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No adjustments found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Adjustment #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Warehouse</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Reason</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs">Items</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-indigo-600">{a.adjustment_number}</td>
                    <td className="px-4 py-3">{warehouseMap[a.warehouse_id] || `#${a.warehouse_id}`}</td>
                    <td className="px-4 py-3">{TYPE_LABELS[a.adjustment_type] || a.adjustment_type}</td>
                    <td className="px-4 py-3 truncate max-w-[200px]">{a.reason}</td>
                    <td className="px-4 py-3 text-center">{a.items?.length || 0}</td>
                    <td className="px-4 py-3">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => router.push(`/admin/inventory/adjustments/${a.id}`)} title="View" className="p-1.5 text-gray-500 hover:text-blue-600"><FaEye size={14} /></button>
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
