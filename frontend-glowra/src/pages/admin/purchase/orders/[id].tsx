import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { purchaseOrders, suppliers, warehouses, grns } from '@/services/api';
import apiClient from '@/services/api';
import {
  FaArrowLeft, FaSave, FaPaperPlane, FaCheck, FaTimes, FaPlus,
  FaTrash, FaTruck, FaCopy, FaFileInvoice,
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

interface POItem {
  product_id: number;
  variant_key?: string;
  description?: string;
  quantity_ordered: number;
  quantity_received?: number;
  unit_price: number;
  tax_rate: number;
  discount_amount: number;
  line_total: number;
}

export default function PurchaseOrderDetail() {
  const router = useRouter();
  const toast = useToast();
  const { id, edit } = router.query;
  const isNew = id === 'new';
  const [isEditing, setIsEditing] = useState(isNew || edit === 'true');
  const [po, setPo] = useState<any>(null);
  const [poGrns, setPoGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [supplierList, setSupplierList] = useState<any[]>([]);
  const [warehouseList, setWarehouseList] = useState<any[]>([]);
  const [productList, setProductList] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({
    supplier_id: 0,
    warehouse_id: 0,
    expected_delivery_date: '',
    priority: 'normal',
    payment_terms: 'net_30',
    notes: '',
    internal_notes: '',
  });
  const [items, setItems] = useState<POItem[]>([]);

  useEffect(() => {
    loadDropdowns();
    if (!isNew && id) loadPo(Number(id));
  }, [id]);

  const loadDropdowns = async () => {
    try {
      const [sups, whs, prods] = await Promise.all([
        suppliers.list(),
        warehouses.list(),
        apiClient.get('/products').then(r => Array.isArray(r.data) ? r.data : r.data?.data || []),
      ]);
      setSupplierList(sups);
      setWarehouseList(whs);
      setProductList(prods);
    } catch {
      toast.error('Failed to load form data');
    }
  };

  const loadPo = async (poId: number) => {
    setLoading(true);
    try {
      const [data, grnList] = await Promise.all([
        purchaseOrders.get(poId),
        grns.list(poId),
      ]);
      setPo(data);
      setPoGrns(grnList);
      setForm({
        supplier_id: data.supplier_id,
        warehouse_id: data.warehouse_id,
        expected_delivery_date: data.expected_delivery_date
          ? new Date(data.expected_delivery_date).toISOString().slice(0, 10)
          : '',
        priority: data.priority || 'normal',
        payment_terms: data.payment_terms || 'net_30',
        notes: data.notes || '',
        internal_notes: data.internal_notes || '',
      });
      setItems(
        (data.items || []).map((it: any) => ({
          product_id: it.product_id,
          variant_key: it.variant_key || '',
          description: it.description || '',
          quantity_ordered: it.quantity_ordered,
          quantity_received: it.quantity_received || 0,
          unit_price: Number(it.unit_price),
          tax_rate: Number(it.tax_rate || 0),
          discount_amount: Number(it.discount_amount || 0),
          line_total: Number(it.line_total || 0),
        })),
      );
    } catch {
      toast.error('Failed to load purchase order');
      router.push('/admin/purchase/orders');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { product_id: 0, quantity_ordered: 1, unit_price: 0, tax_rate: 0, discount_amount: 0, line_total: 0 },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    // recalculate line_total
    const it = updated[idx];
    const lineBase = it.quantity_ordered * it.unit_price - it.discount_amount;
    it.line_total = lineBase + lineBase * (it.tax_rate / 100);
    setItems(updated);
  };

  const subtotal = items.reduce((s, it) => s + it.quantity_ordered * it.unit_price - it.discount_amount, 0);
  const taxTotal = items.reduce((s, it) => {
    const lineBase = it.quantity_ordered * it.unit_price - it.discount_amount;
    return s + lineBase * (it.tax_rate / 100);
  }, 0);
  const grandTotal = subtotal + taxTotal;

  const handleSave = async (submitAfter = false) => {
    if (!form.supplier_id || !form.warehouse_id) {
      toast.error('Supplier and Warehouse are required');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    if (items.some((it) => !it.product_id || it.quantity_ordered <= 0 || it.unit_price <= 0)) {
      toast.error('All items must have a product, quantity, and unit price');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        expected_delivery_date: form.expected_delivery_date || null,
        items: items.map(({ line_total, quantity_received, ...rest }) => rest),
      };

      let saved: any;
      if (isNew) {
        saved = await purchaseOrders.create(payload);
        toast.success('Purchase order created');
      } else {
        saved = await purchaseOrders.update(Number(id), payload);
        toast.success('Purchase order updated');
      }

      if (submitAfter) {
        await purchaseOrders.submit(saved.id);
        toast.success('PO submitted for approval');
      }

      router.push(`/admin/purchase/orders/${saved.id}`);
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-gray-500">Loading...</div>
      </AdminLayout>
    );
  }

  // Detail (read-only) view
  if (!isEditing && po) {
    const sup = supplierList.find((s) => s.id === po.supplier_id);
    const wh = warehouseList.find((w) => w.id === po.warehouse_id);

    return (
      <AdminLayout>
        <div className="p-6 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/admin/purchase/orders')} className="text-gray-500 hover:text-gray-800">
                <FaArrowLeft />
              </button>
              <h1 className="text-2xl font-bold">{po.po_number}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] || 'bg-gray-100'}`}>
                {po.status?.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div className="flex gap-2">
              {po.status === 'draft' && (
                <>
                  <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm flex items-center gap-2"><FaFileInvoice size={12} /> Edit</button>
                  <button onClick={async () => { await purchaseOrders.submit(po.id); toast.success('Submitted'); loadPo(po.id); }} className="px-4 py-2 bg-green-600 text-white rounded text-sm flex items-center gap-2"><FaPaperPlane size={12} /> Submit</button>
                </>
              )}
              {po.status === 'pending_approval' && (
                <>
                  <button onClick={async () => { await purchaseOrders.approve(po.id); toast.success('Approved'); loadPo(po.id); }} className="px-4 py-2 bg-green-600 text-white rounded text-sm flex items-center gap-2"><FaCheck size={12} /> Approve</button>
                  <button onClick={async () => { const r = prompt('Reason:'); if (r !== null) { await purchaseOrders.reject(po.id, r); toast.success('Rejected'); loadPo(po.id); }}} className="px-4 py-2 bg-red-600 text-white rounded text-sm flex items-center gap-2"><FaTimes size={12} /> Reject</button>
                </>
              )}
              {['approved', 'partially_received'].includes(po.status) && (
                <button onClick={() => router.push(`/admin/purchase/grns/new?po_id=${po.id}`)} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm flex items-center gap-2"><FaTruck size={12} /> Receive Goods</button>
              )}
              <button onClick={async () => { const n = await purchaseOrders.duplicate(po.id); toast.success('Duplicated'); router.push(`/admin/purchase/orders/${n.id}`); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm flex items-center gap-2"><FaCopy size={12} /> Duplicate</button>
            </div>
          </div>

          {/* PO Info Grid */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500 block">Supplier</span><span className="font-medium">{sup?.company_name || `#${po.supplier_id}`}</span></div>
            <div><span className="text-gray-500 block">Warehouse</span><span className="font-medium">{wh?.name || `#${po.warehouse_id}`}</span></div>
            <div><span className="text-gray-500 block">Priority</span><span className="font-medium capitalize">{po.priority}</span></div>
            <div><span className="text-gray-500 block">Payment Terms</span><span className="font-medium">{po.payment_terms || '—'}</span></div>
            <div><span className="text-gray-500 block">Order Date</span><span className="font-medium">{po.order_date ? new Date(po.order_date).toLocaleDateString() : '—'}</span></div>
            <div><span className="text-gray-500 block">Expected Delivery</span><span className="font-medium">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '—'}</span></div>
            <div><span className="text-gray-500 block">Total Amount</span><span className="font-bold text-lg">৳{Number(po.total_amount || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span></div>
            <div><span className="text-gray-500 block">Payment Status</span><span className="font-medium capitalize">{po.payment_status}</span></div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Order Items</h2>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ordered</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tax %</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(po.items || []).map((it: any, i: number) => {
                  const prod = productList.find((p: any) => p.id === it.product_id);
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2">{prod?.name_en || `Product #${it.product_id}`}</td>
                      <td className="px-3 py-2">{it.variant_key || '—'}</td>
                      <td className="px-3 py-2 text-right">{it.quantity_ordered}</td>
                      <td className="px-3 py-2 text-right">{it.quantity_received || 0}</td>
                      <td className="px-3 py-2 text-right">৳{Number(it.unit_price).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{Number(it.tax_rate || 0).toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-medium">৳{Number(it.line_total || 0).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t font-medium">
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-right">Subtotal:</td>
                  <td className="px-3 py-2 text-right">৳{Number(po.subtotal || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-right">Tax:</td>
                  <td className="px-3 py-2 text-right">৳{Number(po.tax_amount || 0).toFixed(2)}</td>
                </tr>
                <tr className="text-lg">
                  <td colSpan={6} className="px-3 py-2 text-right">Total:</td>
                  <td className="px-3 py-2 text-right">৳{Number(po.total_amount || 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {(po.notes || po.internal_notes) && (
            <div className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-2 gap-4 text-sm">
              {po.notes && <div><span className="text-gray-500 block mb-1">Notes (Supplier)</span><p>{po.notes}</p></div>}
              {po.internal_notes && <div><span className="text-gray-500 block mb-1">Internal Notes</span><p>{po.internal_notes}</p></div>}
            </div>
          )}

          {/* GRN History */}
          {poGrns.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Goods Received Notes</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">GRN #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Received Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {poGrns.map((g: any) => (
                    <tr key={g.id}>
                      <td className="px-3 py-2 font-medium text-blue-600">{g.grn_number}</td>
                      <td className="px-3 py-2">{g.received_date ? new Date(g.received_date).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.status === 'accepted' ? 'bg-green-100 text-green-800' : g.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{g.status}</span></td>
                      <td className="px-3 py-2">{g.items?.length || 0}</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => router.push(`/admin/purchase/grns/${g.id}`)} className="text-blue-600 hover:underline text-xs">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminLayout>
    );
  }

  // Create / Edit form
  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800"><FaArrowLeft /></button>
          <h1 className="text-2xl font-bold">{isNew ? 'New Purchase Order' : `Edit ${po?.po_number || ''}`}</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Details</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              <select
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: Number(e.target.value) })}
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Select supplier...</option>
                {supplierList.filter((s) => s.is_active).map((s) => (
                  <option key={s.id} value={s.id}>{s.company_name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receiving Warehouse *</label>
              <select
                value={form.warehouse_id}
                onChange={(e) => setForm({ ...form, warehouse_id: Number(e.target.value) })}
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Select warehouse...</option>
                {warehouseList.filter((w) => w.is_active).map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
              <input
                type="date"
                value={form.expected_delivery_date}
                onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <select
                value={form.payment_terms}
                onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="cod">COD</option>
                <option value="net_15">Net 15</option>
                <option value="net_30">Net 30</option>
                <option value="net_60">Net 60</option>
                <option value="advance">Advance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Order Items</h2>
            <button onClick={addItem} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><FaPlus size={12} /> Add Item</button>
          </div>
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 w-24">Variant</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-20">Qty</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-28">Unit Price</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-20">Tax %</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-28">Discount</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-28">Line Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-2 py-1">
                        <select value={it.product_id} onChange={(e) => updateItem(idx, 'product_id', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm">
                          <option value={0}>Select...</option>
                          {productList.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name_en} ({p.sku})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1"><input type="text" value={it.variant_key || ''} onChange={(e) => updateItem(idx, 'variant_key', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="e.g. 500g" /></td>
                      <td className="px-2 py-1"><input type="number" min={1} value={it.quantity_ordered} onChange={(e) => updateItem(idx, 'quantity_ordered', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                      <td className="px-2 py-1"><input type="number" step="0.01" min={0} value={it.unit_price} onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                      <td className="px-2 py-1"><input type="number" step="0.1" min={0} value={it.tax_rate} onChange={(e) => updateItem(idx, 'tax_rate', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                      <td className="px-2 py-1"><input type="number" step="0.01" min={0} value={it.discount_amount} onChange={(e) => updateItem(idx, 'discount_amount', Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm text-right" /></td>
                      <td className="px-2 py-1 text-right font-medium">৳{it.line_total.toFixed(2)}</td>
                      <td className="px-1"><button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 p-1"><FaTrash size={12} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-6">No items added yet. Click &quot;Add Item&quot; to begin.</p>
          )}
          {items.length > 0 && (
            <div className="mt-4 text-sm text-right space-y-1">
              <div>Subtotal: <span className="font-medium">৳{subtotal.toFixed(2)}</span></div>
              <div>Tax: <span className="font-medium">৳{taxTotal.toFixed(2)}</span></div>
              <div className="text-lg font-bold">Grand Total: ৳{grandTotal.toFixed(2)}</div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (for Supplier)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} rows={3} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button onClick={() => handleSave(false)} disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <FaSave /> {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <FaPaperPlane /> {saving ? 'Saving...' : 'Save & Submit'}
          </button>
          <button onClick={() => isNew ? router.push('/admin/purchase/orders') : setIsEditing(false)} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
