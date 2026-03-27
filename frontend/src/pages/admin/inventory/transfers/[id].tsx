import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { stockTransfers, warehouses, products as productsApi } from '@/services/api';
import { FaExchangeAlt, FaArrowLeft, FaPlus, FaTrash, FaSave, FaCheck, FaTruck, FaBoxOpen, FaTimes } from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-500',
};

interface TransferItemRow {
  product_id: number;
  variant_key?: string;
  batch_id?: number;
  quantity_requested: number;
  source_location_id?: number;
  destination_location_id?: number;
  notes?: string;
}

const emptyItem = (): TransferItemRow => ({ product_id: 0, quantity_requested: 0 });

export default function TransferDetailPage() {
  const router = useRouter();
  const toast = useToast();
  const { id } = router.query;
  const isNew = id === 'new';

  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [warehouseList, setWarehouseList] = useState<any[]>([]);
  const [warehouseMap, setWarehouseMap] = useState<Record<number, string>>({});
  const [productList, setProductList] = useState<any[]>([]);

  const [form, setForm] = useState({ source_warehouse_id: '', destination_warehouse_id: '', priority: 'normal', notes: '' });
  const [items, setItems] = useState<TransferItemRow[]>([emptyItem()]);

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => {
    if (!router.isReady) return;
    if (!isNew) loadTransfer();
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

  const loadTransfer = async () => {
    setLoading(true);
    try { setTransfer(await stockTransfers.get(Number(id))); }
    catch { toast.error('Failed to load transfer'); }
    finally { setLoading(false); }
  };

  const productName = (pid: number) => productList.find((p: any) => p.id === pid)?.name || `#${pid}`;

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const handleSave = async () => {
    if (!form.source_warehouse_id || !form.destination_warehouse_id) { toast.error('Source and destination warehouses are required'); return; }
    if (form.source_warehouse_id === form.destination_warehouse_id) { toast.error('Source and destination must be different'); return; }
    if (items.every(i => !i.product_id)) { toast.error('Add at least one item'); return; }
    setSaving(true);
    try {
      const payload = {
        source_warehouse_id: Number(form.source_warehouse_id),
        destination_warehouse_id: Number(form.destination_warehouse_id),
        priority: form.priority,
        notes: form.notes,
        items: items.filter(i => i.product_id).map(i => ({ ...i, quantity_requested: Number(i.quantity_requested) })),
      };
      const result = await stockTransfers.create(payload);
      toast.success('Transfer created');
      router.push(`/admin/inventory/transfers/${result.id}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const handleApprove = async () => {
    try { await stockTransfers.approve(transfer.id); toast.success('Approved'); loadTransfer(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };
  const handleShip = async () => {
    if (!confirm('Ship transfer? Source stock will be deducted.')) return;
    try { await stockTransfers.ship(transfer.id); toast.success('Shipped'); loadTransfer(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };
  const handleReceive = async () => {
    try { await stockTransfers.receive(transfer.id); toast.success('Received — stock updated'); loadTransfer(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };
  const handleCancel = async () => {
    if (!confirm('Cancel this transfer?')) return;
    try { await stockTransfers.cancel(transfer.id); toast.success('Cancelled'); loadTransfer(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  if (loading) return <AdminLayout><div className="p-6 text-center text-gray-500">Loading...</div></AdminLayout>;

  // ─── Detail View ────────────────────────────────────
  if (!isNew && transfer) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/admin/inventory/transfers')} className="text-gray-500 hover:text-gray-700"><FaArrowLeft /></button>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FaExchangeAlt className="text-indigo-600" /> {transfer.transfer_number}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[transfer.status] || 'bg-gray-100'}`}>
                {transfer.status?.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div className="flex gap-2">
              {transfer.status === 'draft' && (
                <>
                  <button onClick={handleApprove} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FaCheck /> Approve</button>
                  <button onClick={handleCancel} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FaTimes /> Cancel</button>
                </>
              )}
              {transfer.status === 'approved' && (
                <button onClick={handleShip} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FaTruck /> Ship</button>
              )}
              {transfer.status === 'in_transit' && (
                <button onClick={handleReceive} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FaBoxOpen /> Receive</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Source</span><div className="font-medium">{warehouseMap[transfer.source_warehouse_id] || `#${transfer.source_warehouse_id}`}</div></div>
            <div><span className="text-gray-500">Destination</span><div className="font-medium">{warehouseMap[transfer.destination_warehouse_id] || `#${transfer.destination_warehouse_id}`}</div></div>
            <div><span className="text-gray-500">Priority</span><div className="font-medium capitalize">{transfer.priority}</div></div>
            <div><span className="text-gray-500">Requested</span><div className="font-medium">{transfer.requested_at ? new Date(transfer.requested_at).toLocaleString() : '—'}</div></div>
            {transfer.shipped_at && <div><span className="text-gray-500">Shipped</span><div className="font-medium">{new Date(transfer.shipped_at).toLocaleString()}</div></div>}
            {transfer.received_at && <div><span className="text-gray-500">Received</span><div className="font-medium">{new Date(transfer.received_at).toLocaleString()}</div></div>}
          </div>
          {transfer.notes && <div className="bg-white rounded-lg shadow p-4 mb-6 text-sm"><span className="text-gray-500">Notes:</span> {transfer.notes}</div>}

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <div className="p-4 border-b"><h2 className="font-semibold text-gray-800">Items</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Requested</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Shipped</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Received</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transfer.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{productName(item.product_id)}{item.variant_key ? ` (${item.variant_key})` : ''}</td>
                    <td className="px-3 py-2 text-right">{item.quantity_requested}</td>
                    <td className="px-3 py-2 text-right">{item.quantity_shipped || '—'}</td>
                    <td className="px-3 py-2 text-right">{item.quantity_received || '—'}</td>
                    <td className="px-3 py-2">{item.notes || '—'}</td>
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
          <button onClick={() => router.push('/admin/inventory/transfers')} className="text-gray-500 hover:text-gray-700"><FaArrowLeft /></button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FaExchangeAlt className="text-indigo-600" /> New Stock Transfer</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Warehouse *</label>
              <select value={form.source_warehouse_id} onChange={e => setForm({ ...form, source_warehouse_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select source</option>
                {warehouseList.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination Warehouse *</label>
              <select value={form.destination_warehouse_id} onChange={e => setForm({ ...form, destination_warehouse_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select destination</option>
                {warehouseList.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Transfer Items</h2>
            <button onClick={addItem} className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"><FaPlus size={12} /> Add Item</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 w-28">Quantity</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500">Notes</th>
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
                  <td className="px-3 py-2"><input type="number" min="1" value={item.quantity_requested || ''} onChange={e => updateItem(idx, 'quantity_requested', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                  <td className="px-3 py-2"><input value={item.notes || ''} onChange={e => updateItem(idx, 'notes', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></td>
                  <td className="px-3 py-2"><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><FaTrash size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => router.push('/admin/inventory/transfers')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50">
            <FaSave /> {saving ? 'Creating...' : 'Create Transfer'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
