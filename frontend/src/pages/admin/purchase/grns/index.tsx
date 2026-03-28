import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { grns, suppliers, warehouses } from '@/services/api';
import { FaTruck, FaPlus, FaEye, FaCheck, FaTimes } from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_qc: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function GrnListPage() {
  const router = useRouter();
  const toast = useToast();
  const [grnList, setGrnList] = useState<any[]>([]);
  const [supplierMap, setSupplierMap] = useState<Record<number, string>>({});
  const [warehouseMap, setWarehouseMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, sups, whs] = await Promise.all([
        grns.list(),
        suppliers.list(),
        warehouses.list(),
      ]);
      setGrnList(list);
      const sMap: Record<number, string> = {};
      sups.forEach((s: any) => { sMap[s.id] = s.company_name; });
      setSupplierMap(sMap);
      const wMap: Record<number, string> = {};
      whs.forEach((w: any) => { wMap[w.id] = w.name; });
      setWarehouseMap(wMap);
    } catch {
      toast.error('Failed to load GRNs');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    if (!confirm('Accept this GRN? This will add received goods to stock.')) return;
    try {
      await grns.accept(id);
      toast.success('GRN accepted — stock updated');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to accept GRN');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await grns.reject(id, reason);
      toast.success('GRN rejected');
      loadData();
    } catch {
      toast.error('Failed to reject GRN');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <FaTruck className="text-indigo-600" />
            Goods Received Notes
          </h1>
          <button
            onClick={() => router.push('/admin/purchase/grns/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
          >
            <FaPlus /> New GRN
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : grnList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No goods received notes found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">GRN #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">PO #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Supplier</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Warehouse</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Received Date</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs">Items</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {grnList.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-indigo-600">{g.grn_number}</td>
                    <td className="px-4 py-3 text-blue-600">{g.purchase_order_id ? `PO-${g.purchase_order_id}` : '—'}</td>
                    <td className="px-4 py-3">{supplierMap[g.supplier_id] || `#${g.supplier_id}`}</td>
                    <td className="px-4 py-3">{warehouseMap[g.warehouse_id] || `#${g.warehouse_id}`}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[g.status] || 'bg-gray-100'}`}>
                        {g.status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">{g.received_date ? new Date(g.received_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-center">{g.items?.length || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => router.push(`/admin/purchase/grns/${g.id}`)} title="View" className="p-1.5 text-gray-500 hover:text-blue-600"><FaEye size={14} /></button>
                        {['draft', 'pending_qc'].includes(g.status) && (
                          <>
                            <button onClick={() => handleAccept(g.id)} title="Accept" className="p-1.5 text-gray-500 hover:text-green-600"><FaCheck size={14} /></button>
                            <button onClick={() => handleReject(g.id)} title="Reject" className="p-1.5 text-gray-500 hover:text-red-600"><FaTimes size={14} /></button>
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
