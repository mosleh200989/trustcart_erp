import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { stockAdjustments, warehouses, products as productsApi } from '@/services/api';
import { FaBalanceScale, FaArrowLeft, FaPlus, FaTrash, FaSave, FaPaperPlane, FaCheck, FaTimes } from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const TYPES = [
  { value: 'increase', label: 'Increase' },
  { value: 'decrease', label: 'Decrease' },
  { value: 'write_off', label: 'Write Off' },
  { value: 'damage', label: 'Damage' },
  { value: 'expiry', label: 'Expiry' },
  { value: 'recount', label: 'Recount' },
];

interface AdjItemRow {
  product_id: number;
  variant_key?: string;
  batch_id?: number;
  location_id?: number;
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  unit_cost?: number;
  reason?: string;
}

const emptyItem = (): AdjItemRow => ({ product_id: 0, quantity_before: 0, quantity_after: 0, quantity_change: 0 });

export default function AdjustmentDetailPage() {
  const router = useRouter();
  const toast = useToast();
  const { id } = router.query;
  const isNew = id === 'new';

  const [adj, setAdj] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [warehouseList, setWarehouseList] = useState<any[]>([]);
  const [warehouseMap, setWarehouseMap] = useState<Record<number, string>>({});
  const [productList, setProductList] = useState<any[]>([]);

  const [form, setForm] = useState({ warehouse_id: '', adjustment_type: 'damage', reason: '', notes: '' });
  const [items, setItems] = useState<AdjItemRow[]>([emptyItem()]);

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => {
    if (!router.isReady) return;
    if (!isNew) loadAdj();
  }, [router.isReady, id]);

  const loadLookups = async () => {
    try {
      const [whs, prods] = await Promise.all([warehouses.list(), productsApi.list()]);
      setWarehouseList(whs);
      const wMap: Record<number, string> = {};
      whs.forEach((w: any) => { wMap[w.id] = w.name; });
      setWarehouseMap(wMap);
      setProductList(Array.isArray(prods) ? prods : []);
    } catch { /* ignore */ }
  };

  const loadAdj = async () => {
    setLoading(true);
    try { setAdj(await stockAdjustments.get(Number(id))); }
    catch { toast.error('Failed to load adjustment'); }
    finally { setLoading(false); }
  };

  const productName = (pid: number) => productList.find((p: any) => p.id === pid)?.name || `#${pid}`;

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    if (field === 'quantity_after' || field === 'quantity_before') {
      updated[idx].quantity_change = updated[idx].quantity_after - updated[idx].quantity_before;
    }
    setItems(updated);
  };

  const handleSave = async () => {
    if (!form.warehouse_id || !form.reason) { toast.error('Warehouse and reason are required'); return; }
    if (items.every(i => !i.product_id)) { toast.error('Add at least one item'); return; }
    setSaving(true);
    try {
      const payload = {
        warehouse_id: Number(form.warehouse_id),
        adjustment_type: form.adjustment_type,
        reason: form.reason,
        notes: form.notes,
        items: items.filter(i => i.product_id).map(i => ({
          ...i, unit_cost: i.unit_cost ? Number(i.unit_cost) : undefined,
        })),
      };
      const result = await stockAdjustments.create(payload);
      toast.success('Adjustment created');
      router.push(`/admin/inventory/adjustments/${result.id}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    try { await stockAdjustments.submit(adj.id); toast.success('Submitted for approval'); loadAdj(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };
  const handleApprove = async () => {
    if (!confirm('Approve? Stock will be updated.')) return;
    try { await stockAdjustments.approve(adj.id); toast.success('Approved'); loadAdj(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };
  const handleReject = async () => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    try { await stockAdjustments.reject(adj.id, reason); toast.success('Rejected'); loadAdj(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <AdminLayout><div className="p-6 text-center text-gray-500">Loading...</div></AdminLayout>;

  // ─── Detail View ────────────────────────────────────
  if (!isNew && adj) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/admin/inventory/adjustments')} className="text-gray-500 hover:text-gray-700"><FaArrowLeft /></button>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FaBalanceScale className="text-indigo-600" /> {adj.adjustment_number}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[adj.status] || 'bg-gray-100'}`}>
                {adj.status?.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div className="flex gap-2">
              {adj.status === 'draft' && (
                <button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FaPaperPlane /> Submit</button>
              )}
              {adj.status === 'pending_approval' && (
                <>
                  <button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FaCheck /> Approve</button>
                  <button onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FaTimes /> Reject</button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Warehouse</span><div className="font-medium">{warehouseMap[adj.warehouse_id] || `#${adj.warehouse_id}`}</div></div>
            <div><span className="text-gray-500">Type</span><div className="font-medium capitalize">{adj.adjustment_type?.replace(/_/g, ' ')}</div></div>
            <div><span className="text-gray-500">Reason</span><div className="font-medium">{adj.reason}</div></div>
            <div><span className="text-gray-500">Value Impact</span><div className="font-medium">₹{Number(adj.total_value_impact || 0).toFixed(2)}</div></div>
          </div>
          {adj.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
              <strong>Rejection Reason:</strong> {adj.rejection_reason}
            </div>
          )}
          {adj.notes && <div className="bg-white rounded-lg shadow p-4 mb-6 text-sm"><span className="text-gray-500">Notes:</span> {adj.notes}</div>}

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <div className="p-4 border-b"><h2 className="font-semibold text-gray-800">Items</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Before</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">After</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Change</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Unit Cost</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {adj.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{productName(item.product_id)}</td>
                    <td className="px-3 py-2 text-right">{item.quantity_before}</td>
                    <td className="px-3 py-2 text-right">{item.quantity_after}</td>
                    <td className={`px-3 py-2 text-right font-medium ${item.quantity_change > 0 ? 'text-green-700' : item.quantity_change < 0 ? 'text-red-700' : ''}`}>
                      {item.quantity_change > 0 ? '+' : ''}{item.quantity_change}
                    </td>
                    <td className="px-3 py-2 text-right">{item.unit_cost ? `₹${Number(item.unit_cost).toFixed(2)}` : '—'}</td>
                    <td className="px-3 py-2">{item.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ─── Create Form ────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin/inventory/adjustments')} className="text-gray-500 hover:text-gray-700"><FaArrowLeft /></button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FaBalanceScale className="text-indigo-600" /> New Stock Adjustment</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
              <select value={form.warehouse_id} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select warehouse</option>
                {warehouseList.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type *</label>
              <select value={form.adjustment_type} onChange={e => setForm({ ...form, adjustment_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Reason for adjustment" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Items</h2>
            <button onClick={addItem} className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"><FaPlus size={12} /> Add Item</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 w-24">Qty Before</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 w-24">Qty After</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 w-24">Change</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 w-24">Unit Cost</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500">Reason</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">
                    <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm">
                      <option value={0}>Select product</option>
                      {productList.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input type="number" min="0" value={item.quantity_before || ''} onChange={e => updateItem(idx, 'quantity_before', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                  <td className="px-3 py-2"><input type="number" min="0" value={item.quantity_after || ''} onChange={e => updateItem(idx, 'quantity_after', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                  <td className="px-3 py-2">
                    <div className={`text-right font-medium ${item.quantity_change > 0 ? 'text-green-700' : item.quantity_change < 0 ? 'text-red-700' : ''}`}>
                      {item.quantity_change > 0 ? '+' : ''}{item.quantity_change}
                    </div>
                  </td>
                  <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={item.unit_cost ?? ''} onChange={e => updateItem(idx, 'unit_cost', e.target.value ? Number(e.target.value) : undefined)} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                  <td className="px-3 py-2"><input value={item.reason || ''} onChange={e => updateItem(idx, 'reason', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Per-item reason" /></td>
                  <td className="px-3 py-2"><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><FaTrash size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => router.push('/admin/inventory/adjustments')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50">
            <FaSave /> {saving ? 'Creating...' : 'Create Adjustment'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
