import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { repackOrders, warehouses, products as productsApi } from '@/services/api';
import { FaRecycle, FaPlus, FaEye, FaPlay, FaCheck, FaTimes, FaBox } from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_TABS = ['all', 'draft', 'in_progress', 'completed', 'cancelled'];

export default function RepackOrdersPage() {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [warehouseList, setWarehouseList] = useState<any[]>([]);
  const [productList, setProductList] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    warehouse_id: '',
    source_product_id: '',
    source_batch_id: '',
    source_qty_to_consume: '',
    output_product_id: '',
    output_qty_expected: '',
    notes: '',
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [orders, whs, prods] = await Promise.all([
        repackOrders.list(),
        warehouses.list(),
        productsApi.list(),
      ]);
      setList(orders);
      setWarehouseList(whs);
      setProductList(prods);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.warehouse_id || !form.source_product_id || !form.source_qty_to_consume || !form.output_product_id || !form.output_qty_expected) {
      toast.error('Fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      const order = await repackOrders.create({
        warehouse_id: parseInt(form.warehouse_id),
        source_product_id: parseInt(form.source_product_id),
        source_batch_id: form.source_batch_id ? parseInt(form.source_batch_id) : undefined,
        source_qty_to_consume: parseFloat(form.source_qty_to_consume),
        output_product_id: parseInt(form.output_product_id),
        output_qty_expected: parseInt(form.output_qty_expected),
        notes: form.notes || undefined,
      });
      toast.success(`Repack order ${order.repack_number} created`);
      setShowCreate(false);
      setForm({ warehouse_id: '', source_product_id: '', source_batch_id: '', source_qty_to_consume: '', output_product_id: '', output_qty_expected: '', notes: '' });
      router.push(`/admin/inventory/repack/${order.id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create');
    } finally { setCreating(false); }
  };

  const handleCancel = async (id: number, number: string) => {
    if (!confirm(`Cancel repack order ${number}?`)) return;
    try {
      await repackOrders.cancel(id);
      toast.success('Order cancelled');
      loadAll();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to cancel'); }
  };

  const filtered = activeTab === 'all' ? list : list.filter(o => o.status === activeTab);

  const counts = {
    draft: list.filter(o => o.status === 'draft').length,
    in_progress: list.filter(o => o.status === 'in_progress').length,
    completed: list.filter(o => o.status === 'completed').length,
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaRecycle className="text-blue-600" /> Repack Orders
            </h1>
            <p className="text-sm text-gray-500 mt-1">Break down bulk stock into retail packaging units</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin/inventory/repack/configs')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <FaBox /> Packaging Configs
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
            >
              <FaPlus /> New Repack Order
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Draft', value: counts.draft, color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'In Progress', value: counts.in_progress, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Completed', value: counts.completed, color: 'text-green-700', bg: 'bg-green-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-lg p-4 border`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm border-b-2 capitalize ${activeTab === tab ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No repack orders found</div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Order #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Source (Bulk)</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Output (Packaged)</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Warehouse</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Qty</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-700">{o.repack_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.source_product_name}</div>
                      <div className="text-xs text-gray-400">{o.source_product_sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.output_product_name}</div>
                      <div className="text-xs text-gray-400">{o.output_product_sku}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.warehouse_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="text-xs">In: {Number(o.source_qty_to_consume)}</div>
                      <div className="text-xs">Out: {o.output_qty_expected}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-700'}`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => router.push(`/admin/inventory/repack/${o.id}`)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View"><FaEye /></button>
                        {(o.status === 'draft' || o.status === 'in_progress') && (
                          <button onClick={() => handleCancel(o.id, o.repack_number)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Cancel"><FaTimes /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="font-semibold text-lg flex items-center gap-2"><FaRecycle className="text-blue-600" /> New Repack Order</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
                  <select value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Select warehouse...</option>
                    {warehouseList.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="border rounded-lg p-4 space-y-3 bg-orange-50">
                  <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Source (Bulk Stock)</div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source Product (bulk) *</label>
                    <select value={form.source_product_id} onChange={e => setForm(f => ({ ...f, source_product_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" required>
                      <option value="">Select product...</option>
                      {productList.map((p: any) => <option key={p.id} value={p.id}>{p.nameEn || p.name_en} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Consume *</label>
                    <input type="number" step="0.001" min="0.001" value={form.source_qty_to_consume} onChange={e => setForm(f => ({ ...f, source_qty_to_consume: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 10 (kg)" required />
                  </div>
                </div>
                <div className="border rounded-lg p-4 space-y-3 bg-green-50">
                  <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Output (Packaged Product)</div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Output Product *</label>
                    <select value={form.output_product_id} onChange={e => setForm(f => ({ ...f, output_product_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" required>
                      <option value="">Select product...</option>
                      {productList.map((p: any) => <option key={p.id} value={p.id}>{p.nameEn || p.name_en} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output Qty *</label>
                    <input type="number" min="1" value={form.output_qty_expected} onChange={e => setForm(f => ({ ...f, output_qty_expected: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 20 (500g bottles)" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Optional notes..." />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {creating ? 'Creating...' : 'Create Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
