import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { purchaseOrders, suppliers, warehouses } from '@/services/api';
import {
  FaFileInvoice, FaPlus, FaEdit, FaEye, FaTrash, FaCheck,
  FaTimes, FaPaperPlane, FaCopy, FaFilter, FaTruck,
} from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  partially_received: 'bg-indigo-100 text-indigo-800',
  closed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  partially_received: 'Partially Received',
  closed: 'Closed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const toast = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [supplierMap, setSupplierMap] = useState<Record<number, string>>({});
  const [warehouseMap, setWarehouseMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [poList, supList, whList] = await Promise.all([
        purchaseOrders.list(statusFilter || undefined),
        suppliers.list(),
        warehouses.list(),
      ]);
      setOrders(poList);
      const sMap: Record<number, string> = {};
      supList.forEach((s: any) => { sMap[s.id] = s.company_name; });
      setSupplierMap(sMap);
      const wMap: Record<number, string> = {};
      whList.forEach((w: any) => { wMap[w.id] = w.name; });
      setWarehouseMap(wMap);
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (id: number) => {
    try {
      await purchaseOrders.submit(id);
      toast.success('PO submitted for approval');
      loadData();
    } catch {
      toast.error('Failed to submit PO');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await purchaseOrders.approve(id);
      toast.success('PO approved');
      loadData();
    } catch {
      toast.error('Failed to approve PO');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await purchaseOrders.reject(id, reason);
      toast.success('PO rejected');
      loadData();
    } catch {
      toast.error('Failed to reject PO');
    }
  };

  const handleCancel = async (id: number) => {
    const reason = prompt('Reason for cancellation:');
    if (!reason) return;
    try {
      await purchaseOrders.cancel(id, reason);
      toast.success('PO cancelled');
      loadData();
    } catch {
      toast.error('Failed to cancel PO');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this draft PO?')) return;
    try {
      await purchaseOrders.remove(id);
      toast.success('PO deleted');
      loadData();
    } catch {
      toast.error('Failed to delete PO');
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      const newPo = await purchaseOrders.duplicate(id);
      toast.success('PO duplicated as draft');
      router.push(`/admin/purchase/orders/${newPo.id}`);
    } catch {
      toast.error('Failed to duplicate PO');
    }
  };

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.po_number?.toLowerCase().includes(s) ||
      supplierMap[o.supplier_id]?.toLowerCase().includes(s)
    );
  });

  const statusTabs = ['', 'draft', 'pending_approval', 'approved', 'partially_received', 'closed', 'cancelled'];

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <FaFileInvoice className="text-blue-600" />
            Purchase Orders
          </h1>
          <button
            onClick={() => router.push('/admin/purchase/orders/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
          >
            <FaPlus /> New Purchase Order
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {statusTabs.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st ? STATUS_LABELS[st] || st : 'All'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by PO number or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No purchase orders found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">PO #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Supplier</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Warehouse</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Total (৳)</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Order Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Expected</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Items</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{po.po_number}</td>
                    <td className="px-4 py-3">{supplierMap[po.supplier_id] || `#${po.supplier_id}`}</td>
                    <td className="px-4 py-3">{warehouseMap[po.warehouse_id] || `#${po.warehouse_id}`}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] || 'bg-gray-100'}`}>
                        {STATUS_LABELS[po.status] || po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">৳{Number(po.total_amount || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">{po.order_date ? new Date(po.order_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-center">{po.items?.length || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center flex-wrap">
                        <button onClick={() => router.push(`/admin/purchase/orders/${po.id}`)} title="View" className="p-1.5 text-gray-500 hover:text-blue-600 rounded"><FaEye size={14} /></button>
                        {po.status === 'draft' && (
                          <>
                            <button onClick={() => router.push(`/admin/purchase/orders/${po.id}?edit=true`)} title="Edit" className="p-1.5 text-gray-500 hover:text-green-600 rounded"><FaEdit size={14} /></button>
                            <button onClick={() => handleSubmit(po.id)} title="Submit" className="p-1.5 text-gray-500 hover:text-blue-600 rounded"><FaPaperPlane size={14} /></button>
                            <button onClick={() => handleDelete(po.id)} title="Delete" className="p-1.5 text-gray-500 hover:text-red-600 rounded"><FaTrash size={14} /></button>
                          </>
                        )}
                        {po.status === 'pending_approval' && (
                          <>
                            <button onClick={() => handleApprove(po.id)} title="Approve" className="p-1.5 text-gray-500 hover:text-green-600 rounded"><FaCheck size={14} /></button>
                            <button onClick={() => handleReject(po.id)} title="Reject" className="p-1.5 text-gray-500 hover:text-red-600 rounded"><FaTimes size={14} /></button>
                          </>
                        )}
                        {['approved', 'partially_received'].includes(po.status) && (
                          <button onClick={() => router.push(`/admin/purchase/grns/new?po_id=${po.id}`)} title="Receive Goods" className="p-1.5 text-gray-500 hover:text-indigo-600 rounded"><FaTruck size={14} /></button>
                        )}
                        <button onClick={() => handleDuplicate(po.id)} title="Duplicate" className="p-1.5 text-gray-500 hover:text-purple-600 rounded"><FaCopy size={14} /></button>
                        {!['closed', 'cancelled'].includes(po.status) && po.status !== 'draft' && (
                          <button onClick={() => handleCancel(po.id)} title="Cancel" className="p-1.5 text-gray-500 hover:text-red-600 rounded"><FaTimes size={14} /></button>
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
