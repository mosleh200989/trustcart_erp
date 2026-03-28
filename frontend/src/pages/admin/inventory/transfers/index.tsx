import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { stockTransfers, warehouses } from '@/services/api';
import { FaExchangeAlt, FaPlus, FaEye, FaCheck, FaTruck, FaBoxOpen, FaTimes } from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-500',
};

const STATUS_TABS = ['all', 'draft', 'approved', 'in_transit', 'received', 'cancelled'];

export default function TransfersListPage() {
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
      const [items, whs] = await Promise.all([stockTransfers.list(), warehouses.list()]);
      setList(items);
      const wMap: Record<number, string> = {};
      whs.forEach((w: any) => { wMap[w.id] = w.name; });
      setWarehouseMap(wMap);
    } catch { toast.error('Failed to load transfers'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id: number) => {
    try { await stockTransfers.approve(id); toast.success('Transfer approved'); loadData(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };
  const handleShip = async (id: number) => {
    if (!confirm('Ship this transfer? Source stock will be deducted.')) return;
    try { await stockTransfers.ship(id); toast.success('Transfer shipped — source stock deducted'); loadData(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };
  const handleReceive = async (id: number) => {
    try { await stockTransfers.receive(id); toast.success('Transfer received — destination stock updated'); loadData(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };
  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this transfer?')) return;
    try { await stockTransfers.cancel(id); toast.success('Transfer cancelled'); loadData(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const filtered = activeTab === 'all' ? list : list.filter(t => t.status === activeTab);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <FaExchangeAlt className="text-indigo-600" /> Stock Transfers
          </h1>
          <button onClick={() => router.push('/admin/inventory/transfers/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <FaPlus /> New Transfer
          </button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {tab === 'all' ? 'All' : tab.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {tab !== 'all' && <span className="ml-1 text-xs">({list.filter(t => t.status === tab).length})</span>}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No transfers found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Transfer #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Source → Destination</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Priority</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs">Items</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-indigo-600">{t.transfer_number}</td>
                    <td className="px-4 py-3">{warehouseMap[t.source_warehouse_id] || `#${t.source_warehouse_id}`} → {warehouseMap[t.destination_warehouse_id] || `#${t.destination_warehouse_id}`}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100'}`}>
                        {t.status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">{t.priority || 'normal'}</td>
                    <td className="px-4 py-3 text-center">{t.items?.length || 0}</td>
                    <td className="px-4 py-3">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => router.push(`/admin/inventory/transfers/${t.id}`)} title="View" className="p-1.5 text-gray-500 hover:text-blue-600"><FaEye size={14} /></button>
                        {t.status === 'draft' && (
                          <>
                            <button onClick={() => handleApprove(t.id)} title="Approve" className="p-1.5 text-gray-500 hover:text-green-600"><FaCheck size={14} /></button>
                            <button onClick={() => handleCancel(t.id)} title="Cancel" className="p-1.5 text-gray-500 hover:text-red-600"><FaTimes size={14} /></button>
                          </>
                        )}
                        {t.status === 'approved' && (
                          <button onClick={() => handleShip(t.id)} title="Ship" className="p-1.5 text-gray-500 hover:text-purple-600"><FaTruck size={14} /></button>
                        )}
                        {t.status === 'in_transit' && (
                          <button onClick={() => handleReceive(t.id)} title="Receive" className="p-1.5 text-gray-500 hover:text-green-600"><FaBoxOpen size={14} /></button>
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
