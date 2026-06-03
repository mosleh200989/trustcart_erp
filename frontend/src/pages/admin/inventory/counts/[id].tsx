import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { inventoryCounts, products as productsApi, stockLevels, warehouses } from '@/services/api';
import { FaArrowLeft, FaClipboardList, FaPlus, FaSave, FaTrash } from 'react-icons/fa';

type CountRow = { product_id: string; system_quantity: number; counted_quantity: string; variance_reason: string };
const emptyRow = (): CountRow => ({ product_id: '', system_quantity: 0, counted_quantity: '', variance_reason: '' });

export default function ManualInventoryCountPage() {
  const router = useRouter();
  const toast = useToast();
  const { id } = router.query;
  const isNew = id === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState<any>(null);
  const [warehousesList, setWarehousesList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [form, setForm] = useState({ warehouse_id: '', notes: '' });
  const [rows, setRows] = useState<CountRow[]>([emptyRow()]);

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => { if (router.isReady && !isNew) loadCount(); }, [router.isReady, id]);

  const loadLookups = async () => {
    try {
      const [warehouseData, productData] = await Promise.all([warehouses.list(), typeof productsApi.listAll === 'function' ? productsApi.listAll() : productsApi.list()]);
      setWarehousesList(Array.isArray(warehouseData) ? warehouseData : []);
      setProductsList(Array.isArray(productData) ? productData : []);
    } catch { toast.error('Failed to load count options'); }
  };

  const loadCount = async () => {
    setLoading(true);
    try {
      const data = await inventoryCounts.get(Number(id));
      setCount(data);
      setForm({ warehouse_id: String(data.warehouse_id || ''), notes: data.notes || '' });
      setRows(Array.isArray(data.items) && data.items.length > 0 ? data.items.map((item: any) => ({ product_id: String(item.product_id || ''), system_quantity: Number(item.system_quantity || 0), counted_quantity: item.counted_quantity != null ? String(item.counted_quantity) : '', variance_reason: item.variance_reason || '' })) : [emptyRow()]);
    } catch { toast.error('Failed to load inventory count'); }
    finally { setLoading(false); }
  };

  const updateRow = async (index: number, field: keyof CountRow, value: string) => {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    if (field === 'product_id' && value && form.warehouse_id) {
      try {
        const levels = await stockLevels.list({ product_id: Number(value), warehouse_id: Number(form.warehouse_id) });
        const systemQuantity = Array.isArray(levels) ? levels.reduce((sum: number, level: any) => sum + Number(level.quantity || 0), 0) : 0;
        setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, system_quantity: systemQuantity } : row));
      } catch {}
    }
  };

  const addRow = () => setRows((current) => [...current, emptyRow()]);
  const removeRow = (index: number) => setRows((current) => current.length === 1 ? current : current.filter((_, rowIndex) => rowIndex !== index));

  const saveCount = async () => {
    if (!form.warehouse_id) { toast.error('Warehouse is required'); return; }
    const validRows = rows.filter((row) => row.product_id && row.counted_quantity !== '');
    if (validRows.length === 0) { toast.error('Add at least one counted product'); return; }
    setSaving(true);
    try {
      const countId = isNew ? (await inventoryCounts.create({ warehouse_id: Number(form.warehouse_id), count_type: 'spot', notes: form.notes || undefined })).id : Number(id);
      await inventoryCounts.recordItems(countId, validRows.map((row) => ({ product_id: Number(row.product_id), counted_quantity: Number(row.counted_quantity), variance_reason: row.variance_reason || undefined })));
      toast.success('Inventory count saved');
      if (isNew) router.replace('/admin/inventory/counts/' + countId); else loadCount();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Failed to save inventory count'); }
    finally { setSaving(false); }
  };

  if (loading) return <AdminLayout><div className="p-6 text-center text-gray-500">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><button onClick={() => router.push('/admin/inventory/counts')} className="text-gray-500 hover:text-gray-700"><FaArrowLeft /></button><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FaClipboardList className="text-indigo-600" /> {isNew ? 'New Manual Inventory Count' : count?.count_number || 'Manual Inventory Count'}</h1></div>
          <button onClick={saveCount} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"><FaSave /> {saving ? 'Saving...' : 'Save Count'}</button>
        </div>
        <div className="bg-white rounded-lg border p-4 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
          <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">Warehouse</span><select value={form.warehouse_id} onChange={(event) => setForm({ ...form, warehouse_id: event.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" disabled={!isNew} required><option value="">Select warehouse</option>{warehousesList.map((warehouse: any) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
          <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">Notes</span><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Optional count note" /></label>
        </div>
        <div className="bg-white rounded-lg border overflow-x-auto">
          <div className="p-4 border-b flex items-center justify-between gap-3"><h2 className="font-semibold text-gray-800">Manual Count Items</h2><button onClick={addRow} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"><FaPlus /> Add Product</button></div>
          <table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th><th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">System Qty</th><th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Counted Qty</th><th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Variance</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th><th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th></tr></thead><tbody className="divide-y">
            {rows.map((row, index) => { const counted = row.counted_quantity === '' ? 0 : Number(row.counted_quantity); const variance = counted - Number(row.system_quantity || 0); return (<tr key={index}><td className="px-3 py-2 min-w-[260px]"><select value={row.product_id} onChange={(event) => updateRow(index, 'product_id', event.target.value)} className="w-full border rounded px-2 py-1.5" required><option value="">Select product</option>{productsList.map((product: any) => <option key={product.id} value={product.id}>{product.name || product.nameEn || '#' + product.id}</option>)}</select></td><td className="px-3 py-2 text-right text-gray-600">{Number(row.system_quantity || 0)}</td><td className="px-3 py-2 text-right"><input type="number" min="0" value={row.counted_quantity} onChange={(event) => updateRow(index, 'counted_quantity', event.target.value)} className="w-28 border rounded px-2 py-1.5 text-right" required /></td><td className={'px-3 py-2 text-right font-semibold ' + (variance === 0 ? 'text-gray-600' : variance > 0 ? 'text-green-700' : 'text-red-600')}>{row.counted_quantity === '' ? '-' : variance}</td><td className="px-3 py-2 min-w-[220px]"><input value={row.variance_reason} onChange={(event) => updateRow(index, 'variance_reason', event.target.value)} className="w-full border rounded px-2 py-1.5" placeholder="Optional" /></td><td className="px-3 py-2 text-right"><button onClick={() => removeRow(index)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Remove row"><FaTrash /></button></td></tr>); })}
          </tbody></table>
        </div>
      </div>
    </AdminLayout>
  );
}
