import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { inventoryCounts, warehouses } from '@/services/api';
import { FaClipboardList, FaEye, FaPlus } from 'react-icons/fa';

export default function InventoryCountsListPage() {
  const router = useRouter();
  const toast = useToast();
  const [counts, setCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseMap, setWarehouseMap] = useState<Record<number, string>>({});

  useEffect(() => { loadCounts(); loadWarehouses(); }, []);

  const loadWarehouses = async () => {
    try {
      const list = await warehouses.list();
      const map: Record<number, string> = {};
      list.forEach((warehouse: any) => { map[warehouse.id] = warehouse.name; });
      setWarehouseMap(map);
    } catch {}
  };

  const loadCounts = async () => {
    setLoading(true);
    try { setCounts(await inventoryCounts.list()); }
    catch { toast.error('Failed to load inventory counts'); }
    finally { setLoading(false); }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FaClipboardList className="text-indigo-600" /> Inventory Count</h1>
          <button onClick={() => router.push('/admin/inventory/counts/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"><FaPlus /> New Manual Count</button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading counts...</div>
        ) : counts.length === 0 ? (
          <div className="bg-white border rounded-lg p-10 text-center text-gray-500">No inventory counts yet</div>
        ) : (
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variances</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {counts.map((count: any) => {
                  const items = Array.isArray(count.items) ? count.items : [];
                  const variances = items.filter((item: any) => Number(item.counted_quantity || 0) !== Number(item.system_quantity || 0)).length;
                  return (
                    <tr key={count.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{count.count_number}</td>
                      <td className="px-4 py-3">{warehouseMap[count.warehouse_id] || '#' + count.warehouse_id}</td>
                      <td className="px-4 py-3 text-right">{items.length}</td>
                      <td className="px-4 py-3 text-right">{variances}</td>
                      <td className="px-4 py-3 text-gray-500">{count.created_at ? new Date(count.created_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-right"><button onClick={() => router.push('/admin/inventory/counts/' + count.id)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><FaEye /> Open</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
