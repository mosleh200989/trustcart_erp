import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { inventoryCounts, warehouses, products as productsApi, inventoryBarcode } from '@/services/api';
import { FaClipboardList, FaArrowLeft, FaPlus, FaTrash, FaSave, FaPlay, FaCheckDouble, FaCheck, FaBarcode } from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
};
const ITEM_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  counted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  discrepancy: 'bg-red-100 text-red-700',
};

export default function InventoryCountDetailPage() {
  const router = useRouter();
  const toast = useToast();
  const { id } = router.query;
  const isNew = id === 'new';

  const [count, setCount] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [warehouseList, setWarehouseList] = useState<any[]>([]);
  const [warehouseMap, setWarehouseMap] = useState<Record<number, string>>({});
  const [productList, setProductList] = useState<any[]>([]);

  const [form, setForm] = useState({ warehouse_id: '', count_type: 'full', notes: '' });
  const [countItems, setCountItems] = useState<any[]>([]);

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => {
    if (!router.isReady) return;
    if (!isNew) loadCount();
  }, [router.isReady, id]);

  const loadLookups = async () => {
    try {
      const [whs, prods] = await Promise.all([warehouses.list(), productsApi.list()]);
      setWarehouseList(whs);
      const m: Record<number, string> = {};
      whs.forEach((w: any) => { m[w.id] = w.name; });
      setWarehouseMap(m);
      setProductList(Array.isArray(prods) ? prods : []);
    } catch { /* ignore */ }
  };

  const loadCount = async () => {
    setLoading(true);
    try { setCount(await inventoryCounts.get(Number(id))); }
    catch { toast.error('Failed to load count'); }
    finally { setLoading(false); }
  };

  const productName = (pid: number) => productList.find((p: any) => p.id === pid)?.name || `#${pid}`;

  const handleSave = async () => {
    if (!form.warehouse_id) { toast.error('Warehouse is required'); return; }
    setSaving(true);
    try {
      const result = await inventoryCounts.create({ warehouse_id: Number(form.warehouse_id), count_type: form.count_type, notes: form.notes || undefined });
      toast.success('Count created');
      router.push(`/admin/inventory/counts/${result.id}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const handleStart = async () => {
    try { await inventoryCounts.start(count.id); toast.success('Count started — items populated'); loadCount(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const handleRecordItems = async () => {
    const toRecord = countItems.filter(i => i._dirty);
    if (toRecord.length === 0) { toast.error('No items to record'); return; }
    try {
      await inventoryCounts.recordItems(count.id, toRecord.map((i: any) => ({
        product_id: i.product_id,
        variant_key: i.variant_key || undefined,
        location_id: i.location_id || undefined,
        batch_id: i.batch_id || undefined,
        counted_quantity: Number(i.counted_quantity),
        variance_reason: i.variance_reason || undefined,
      })));
      toast.success('Items recorded');
      loadCount();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const handleComplete = async () => {
    try { await inventoryCounts.complete(count.id); toast.success('Count completed — pending review'); loadCount(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const handleApprove = async () => {
    if (!confirm('Approve count? Variances will be applied to stock.')) return;
    try { await inventoryCounts.approve(count.id); toast.success('Count approved — stock adjusted'); loadCount(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  // Initialize editable items from loaded count
  useEffect(() => {
    if (count?.items) setCountItems(count.items.map((i: any) => ({ ...i, _dirty: false })));
  }, [count]);

  const updateCountItem = (idx: number, field: string, value: any) => {
    const updated = [...countItems];
    updated[idx] = { ...updated[idx], [field]: value, _dirty: true };
    setCountItems(updated);
  };

  const [scanInput, setScanInput] = useState('');
  const handleCountScan = async (code: string) => {
    if (!code.trim()) return;
    try {
      const result = await inventoryBarcode.lookup(code.trim());
      if (result.found && result.type === 'product') {
        const existingIdx = countItems.findIndex((i: any) => i.product_id === result.data.id);
        if (existingIdx >= 0) {
          // Focus on existing item - increment counted qty
          const updated = [...countItems];
          const current = Number(updated[existingIdx].counted_quantity) || 0;
          updated[existingIdx] = { ...updated[existingIdx], counted_quantity: current + 1, _dirty: true };
          setCountItems(updated);
          toast.success(`Scanned: ${result.data.name} (qty +1)`);
        } else {
          toast.error('Product not in count items. Start count to populate items first.');
        }
      } else {
        toast.error('No product found for this barcode');
      }
    } catch {
      toast.error('Barcode lookup failed');
    }
    setScanInput('');
  };

  if (loading) return <AdminLayout><div className="p-6 text-center text-gray-500">Loading...</div></AdminLayout>;

  // ─── Detail View ────────────────────────────────────
  if (!isNew && count) {
    const isInProgress = count.status === 'in_progress';
    return (
      <AdminLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/admin/inventory/counts')} className="text-gray-500 hover:text-gray-700"><FaArrowLeft /></button>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FaClipboardList className="text-indigo-600" /> {count.count_number}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[count.status] || 'bg-gray-100'}`}>{count.status?.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div className="flex gap-2">
              {count.status === 'planned' && <button onClick={handleStart} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FaPlay /> Start Count</button>}
              {isInProgress && (
                <>
                  <button onClick={handleRecordItems} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FaSave /> Save Items</button>
                  <button onClick={handleComplete} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FaCheckDouble /> Complete</button>
                </>
              )}
              {count.status === 'pending_review' && <button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FaCheck /> Approve</button>}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Warehouse</span><div className="font-medium">{warehouseMap[count.warehouse_id] || `#${count.warehouse_id}`}</div></div>
            <div><span className="text-gray-500">Type</span><div className="font-medium capitalize">{count.count_type}</div></div>
            <div><span className="text-gray-500">Items Counted</span><div className="font-medium">{count.total_items_counted || '—'}</div></div>
            <div><span className="text-gray-500">Variances</span><div className="font-medium">{count.total_variances || '—'}</div></div>
            {count.started_at && <div><span className="text-gray-500">Started</span><div className="font-medium">{new Date(count.started_at).toLocaleString()}</div></div>}
            {count.completed_at && <div><span className="text-gray-500">Completed</span><div className="font-medium">{new Date(count.completed_at).toLocaleString()}</div></div>}
            {count.total_variance_value != null && <div><span className="text-gray-500">Variance Value</span><div className="font-medium">${Number(count.total_variance_value).toFixed(2)}</div></div>}
          </div>
          {count.notes && <div className="bg-white rounded-lg shadow p-4 mb-6 text-sm"><span className="text-gray-500">Notes:</span> {count.notes}</div>}

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="font-semibold text-gray-800">Count Items</h2>
              {isInProgress && (
                <div className="relative">
                  <FaBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCountScan(scanInput); }}
                    placeholder="Scan barcode to count..."
                    className="pl-9 pr-3 py-1.5 border rounded text-sm w-full sm:w-56"
                  />
                </div>
              )}
            </div>
            {countItems.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No items yet. Press &quot;Start Count&quot; to populate items from current stock levels.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">System Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-28">{isInProgress ? 'Counted Qty' : 'Counted'}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Variance</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{isInProgress ? 'Reason' : 'Variance Reason'}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {countItems.map((item: any, idx: number) => {
                    const variance = item.counted_quantity != null ? Number(item.counted_quantity) - Number(item.system_quantity) : null;
                    return (
                      <tr key={item.id || idx} className={`hover:bg-gray-50 ${variance && variance !== 0 ? 'bg-red-50/30' : ''}`}>
                        <td className="px-3 py-2 font-medium">{productName(item.product_id)}{item.variant_key ? ` (${item.variant_key})` : ''}</td>
                        <td className="px-3 py-2 text-right">{item.system_quantity}</td>
                        <td className="px-3 py-2 text-right">
                          {isInProgress ? (
                            <input type="number" min="0" value={item.counted_quantity ?? ''} onChange={e => updateCountItem(idx, 'counted_quantity', e.target.value === '' ? null : Number(e.target.value))} className="w-24 border rounded px-2 py-1 text-sm text-right" />
                          ) : (
                            item.counted_quantity ?? '—'
                          )}
                        </td>
                        <td className={`px-3 py-2 text-right font-medium ${variance && variance > 0 ? 'text-green-600' : variance && variance < 0 ? 'text-red-600' : ''}`}>
                          {variance != null ? (variance > 0 ? `+${variance}` : variance) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {isInProgress ? (
                            <input value={item.variance_reason || ''} onChange={e => updateCountItem(idx, 'variance_reason', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Reason..." />
                          ) : (
                            item.variance_reason || '—'
                          )}
                        </td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ITEM_COLORS[item.status] || 'bg-gray-100'}`}>{item.status?.toUpperCase()}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ─── Create Form ────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin/inventory/counts')} className="text-gray-500 hover:text-gray-700"><FaArrowLeft /></button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FaClipboardList className="text-indigo-600" /> New Inventory Count</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
              <select value={form.warehouse_id} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select warehouse</option>
                {warehouseList.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Count Type</label>
              <select value={form.count_type} onChange={e => setForm({ ...form, count_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="full">Full Count</option>
                <option value="cycle">Cycle Count</option>
                <option value="spot">Spot Check</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => router.push('/admin/inventory/counts')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50">
            <FaSave /> {saving ? 'Creating...' : 'Create Count'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
