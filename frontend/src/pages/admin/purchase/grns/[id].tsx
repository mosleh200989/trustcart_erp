import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { grns, purchaseOrders, suppliers, warehouses, products as productsApi } from '@/services/api';
import { FaTruck, FaArrowLeft, FaCheck, FaTimes, FaPlus, FaTrash, FaSave } from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_qc: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

interface GrnItemRow {
  po_item_id?: number;
  product_id: number;
  variant_key?: string;
  quantity_expected?: number;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  rejection_reason?: string;
  batch_number?: string;
  lot_number?: string;
  manufacturing_date?: string;
  expiry_date?: string;
  unit_cost: number;
  location_id?: number;
  temperature_on_arrival?: number;
  quality_notes?: string;
}

const emptyItem = (): GrnItemRow => ({
  product_id: 0,
  quantity_received: 0,
  quantity_accepted: 0,
  quantity_rejected: 0,
  unit_cost: 0,
});

export default function GrnDetailPage() {
  const router = useRouter();
  const toast = useToast();
  const { id, po_id } = router.query;
  const isNew = id === 'new';
  const isEditing = isNew;

  const [grn, setGrn] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [supplierMap, setSupplierMap] = useState<Record<number, string>>({});
  const [warehouseMap, setWarehouseMap] = useState<Record<number, string>>({});
  const [productList, setProductList] = useState<any[]>([]);
  const [supplierList, setSupplierList] = useState<any[]>([]);
  const [warehouseList, setWarehouseList] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({
    purchase_order_id: '',
    supplier_id: '',
    warehouse_id: '',
    received_date: new Date().toISOString().slice(0, 16),
    invoice_number: '',
    invoice_date: '',
    delivery_note_number: '',
    vehicle_number: '',
    driver_name: '',
    notes: '',
    quality_check_required: true,
  });
  const [items, setItems] = useState<GrnItemRow[]>([emptyItem()]);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (!isNew) {
      loadGrn();
    } else if (po_id) {
      loadFromPo(Number(po_id));
    }
  }, [router.isReady, id, po_id]);

  const loadLookups = async () => {
    try {
      const [sups, whs, prods] = await Promise.all([
        suppliers.list(),
        warehouses.list(),
        productsApi.list(),
      ]);
      setSupplierList(sups);
      setWarehouseList(whs);
      setProductList(Array.isArray(prods) ? prods : (prods as any)?.data || []);
      const sMap: Record<number, string> = {};
      sups.forEach((s: any) => { sMap[s.id] = s.company_name; });
      setSupplierMap(sMap);
      const wMap: Record<number, string> = {};
      whs.forEach((w: any) => { wMap[w.id] = w.name; });
      setWarehouseMap(wMap);
    } catch { /* ignore */ }
  };

  const loadGrn = async () => {
    setLoading(true);
    try {
      const data = await grns.get(Number(id));
      setGrn(data);
    } catch {
      toast.error('Failed to load GRN');
    } finally {
      setLoading(false);
    }
  };

  const loadFromPo = async (poId: number) => {
    try {
      const po = await purchaseOrders.get(poId);
      setForm(prev => ({
        ...prev,
        purchase_order_id: String(po.id),
        supplier_id: String(po.supplier_id),
        warehouse_id: String(po.warehouse_id),
      }));
      if (po.items?.length) {
        setItems(po.items.map((pi: any) => ({
          po_item_id: pi.id,
          product_id: pi.product_id,
          variant_key: pi.variant_key || '',
          quantity_expected: pi.quantity,
          quantity_received: pi.quantity - (pi.quantity_received || 0),
          quantity_accepted: pi.quantity - (pi.quantity_received || 0),
          quantity_rejected: 0,
          unit_cost: Number(pi.unit_price) || 0,
        })));
      }
    } catch {
      toast.error('Failed to load Purchase Order');
    }
  };

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const productName = (pid: number) => {
    const p = productList.find((pr: any) => pr.id === pid);
    return p ? p.name : `#${pid}`;
  };

  const handleSave = async () => {
    if (!form.supplier_id || !form.warehouse_id) {
      toast.error('Supplier and Warehouse are required');
      return;
    }
    if (items.length === 0 || items.every(i => !i.product_id)) {
      toast.error('Add at least one item');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        purchase_order_id: form.purchase_order_id ? Number(form.purchase_order_id) : undefined,
        supplier_id: Number(form.supplier_id),
        warehouse_id: Number(form.warehouse_id),
        items: items.filter(i => i.product_id).map(i => ({
          ...i,
          unit_cost: Number(i.unit_cost),
          quantity_received: Number(i.quantity_received),
          quantity_accepted: Number(i.quantity_accepted),
          quantity_rejected: Number(i.quantity_rejected),
          temperature_on_arrival: i.temperature_on_arrival ? Number(i.temperature_on_arrival) : undefined,
        })),
      };
      const result = await grns.create(payload);
      toast.success('GRN created');
      router.push(`/admin/purchase/grns/${result.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create GRN');
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async () => {
    if (!confirm('Accept this GRN? Stock will be updated.')) return;
    try {
      await grns.accept(grn.id);
      toast.success('GRN accepted — stock updated');
      loadGrn();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to accept GRN');
    }
  };

  const handleReject = async () => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await grns.reject(grn.id, reason);
      toast.success('GRN rejected');
      loadGrn();
    } catch {
      toast.error('Failed to reject GRN');
    }
  };

  if (loading) {
    return <AdminLayout><div className="p-6 text-center text-gray-500">Loading...</div></AdminLayout>;
  }

  // ─── Detail View ────────────────────────────────────────
  if (!isNew && grn) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/admin/purchase/grns')} className="text-gray-500 hover:text-gray-700"><FaArrowLeft /></button>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FaTruck className="text-indigo-600" /> {grn.grn_number}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[grn.status] || 'bg-gray-100'}`}>
                {grn.status?.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div className="flex gap-2">
              {['draft', 'pending_qc'].includes(grn.status) && (
                <>
                  <button onClick={handleAccept} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"><FaCheck /> Accept</button>
                  <button onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"><FaTimes /> Reject</button>
                </>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Supplier</span><div className="font-medium">{supplierMap[grn.supplier_id] || `#${grn.supplier_id}`}</div></div>
            <div><span className="text-gray-500">Warehouse</span><div className="font-medium">{warehouseMap[grn.warehouse_id] || `#${grn.warehouse_id}`}</div></div>
            <div><span className="text-gray-500">PO</span><div className="font-medium">{grn.purchase_order_id ? `PO-${grn.purchase_order_id}` : '—'}</div></div>
            <div><span className="text-gray-500">Received Date</span><div className="font-medium">{grn.received_date ? new Date(grn.received_date).toLocaleString() : '—'}</div></div>
            <div><span className="text-gray-500">Invoice #</span><div className="font-medium">{grn.invoice_number || '—'}</div></div>
            <div><span className="text-gray-500">Vehicle #</span><div className="font-medium">{grn.vehicle_number || '—'}</div></div>
            <div><span className="text-gray-500">Driver</span><div className="font-medium">{grn.driver_name || '—'}</div></div>
            <div><span className="text-gray-500">Delivery Note</span><div className="font-medium">{grn.delivery_note_number || '—'}</div></div>
          </div>
          {grn.notes && <div className="bg-white rounded-lg shadow p-4 mb-6 text-sm"><span className="text-gray-500">Notes:</span> {grn.notes}</div>}

          {/* Items Table */}
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <div className="p-4 border-b"><h2 className="font-semibold text-gray-800">Items</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Expected</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Received</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Accepted</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Rejected</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Batch #</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Expiry</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Unit Cost</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Temp °C</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {grn.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{productName(item.product_id)}{item.variant_key ? ` (${item.variant_key})` : ''}</td>
                    <td className="px-3 py-2 text-right">{item.quantity_expected ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{item.quantity_received}</td>
                    <td className="px-3 py-2 text-right text-green-700">{item.quantity_accepted}</td>
                    <td className="px-3 py-2 text-right text-red-700">{item.quantity_rejected || 0}</td>
                    <td className="px-3 py-2">{item.batch_number || '—'}</td>
                    <td className="px-3 py-2">{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2 text-right">₹{Number(item.unit_cost).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{item.temperature_on_arrival ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ─── Create Form ────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin/purchase/grns')} className="text-gray-500 hover:text-gray-700"><FaArrowLeft /></button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FaTruck className="text-indigo-600" /> New Goods Received Note</h1>
        </div>

        {/* Header Fields */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order</label>
              <input type="number" value={form.purchase_order_id} onChange={e => setForm({...form, purchase_order_id: e.target.value})} placeholder="PO ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              <select value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select supplier</option>
                {supplierList.map((s: any) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
              <select value={form.warehouse_id} onChange={e => setForm({...form, warehouse_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select warehouse</option>
                {warehouseList.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received Date *</label>
              <input type="datetime-local" value={form.received_date} onChange={e => setForm({...form, received_date: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice #</label>
              <input value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
              <input type="date" value={form.invoice_date} onChange={e => setForm({...form, invoice_date: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle #</label>
              <input value={form.vehicle_number} onChange={e => setForm({...form, vehicle_number: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
              <input value={form.driver_name} onChange={e => setForm({...form, driver_name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Note #</label>
              <input value={form.delivery_note_number} onChange={e => setForm({...form, delivery_note_number: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Received Items</h2>
            <button onClick={addItem} className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"><FaPlus size={12} /> Add Item</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 w-20">Expected</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 w-20">Received</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 w-20">Accepted</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 w-20">Rejected</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500">Batch #</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500">Expiry</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 w-24">Unit Cost</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 w-16">Temp °C</th>
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
                  <td className="px-3 py-2"><input type="number" min="0" value={item.quantity_expected || ''} onChange={e => updateItem(idx, 'quantity_expected', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                  <td className="px-3 py-2"><input type="number" min="0" value={item.quantity_received || ''} onChange={e => updateItem(idx, 'quantity_received', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                  <td className="px-3 py-2"><input type="number" min="0" value={item.quantity_accepted || ''} onChange={e => updateItem(idx, 'quantity_accepted', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                  <td className="px-3 py-2"><input type="number" min="0" value={item.quantity_rejected || ''} onChange={e => updateItem(idx, 'quantity_rejected', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                  <td className="px-3 py-2"><input value={item.batch_number || ''} onChange={e => updateItem(idx, 'batch_number', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="BATCH-..." /></td>
                  <td className="px-3 py-2"><input type="date" value={item.expiry_date || ''} onChange={e => updateItem(idx, 'expiry_date', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></td>
                  <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={item.unit_cost || ''} onChange={e => updateItem(idx, 'unit_cost', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                  <td className="px-3 py-2"><input type="number" step="0.1" value={item.temperature_on_arrival ?? ''} onChange={e => updateItem(idx, 'temperature_on_arrival', e.target.value ? Number(e.target.value) : undefined)} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                  <td className="px-3 py-2"><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><FaTrash size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => router.push('/admin/purchase/grns')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50">
            <FaSave /> {saving ? 'Creating...' : 'Create GRN'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
