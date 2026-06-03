import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import InventoryProductPicker from '@/components/admin/InventoryProductPicker';
import { inventoryPackagingConfigs, inventoryRepackOrders, products as productsApi, warehouses } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaBoxes, FaPlus, FaSync, FaTimes } from 'react-icons/fa';

const statusTone: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function RepackingPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouseList, setWarehouseList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    warehouse_id: '',
    config_id: '',
    source_product_id: '',
    source_variant_key: '',
    source_qty_to_consume: '',
    output_product_id: '',
    output_variant_key: '',
    output_qty_expected: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderData, configData, productData, warehouseData] = await Promise.all([
        inventoryRepackOrders.list(),
        inventoryPackagingConfigs.list(),
        productsApi.listAll(),
        warehouses.list(),
      ]);
      setOrders(orderData);
      setConfigs(configData);
      setProducts(productData);
      setWarehouseList(warehouseData);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load repacking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const applyConfig = (configId: string) => {
    const config = configs.find((item) => String(item.id) === configId);
    setForm({
      ...form,
      config_id: configId,
      source_product_id: config ? String(config.source_product_id) : form.source_product_id,
      source_variant_key: config ? (config.source_variant_key || '') : form.source_variant_key,
      source_qty_to_consume: config ? String(config.source_qty) : form.source_qty_to_consume,
      output_product_id: config ? String(config.output_product_id) : form.output_product_id,
      output_variant_key: config ? (config.output_variant_key || '') : form.output_variant_key,
      output_qty_expected: config ? String(config.output_qty) : form.output_qty_expected,
    });
  };

  const createOrder = async () => {
    if (!form.warehouse_id || !form.source_product_id || !form.output_product_id || !form.source_qty_to_consume || !form.output_qty_expected) {
      toast.error('Warehouse, source product, output product, and quantities are required');
      return;
    }
    setCreating(true);
    try {
      await inventoryRepackOrders.create({
        warehouse_id: Number(form.warehouse_id),
        config_id: form.config_id ? Number(form.config_id) : undefined,
        source_product_id: Number(form.source_product_id),
        source_variant_key: form.source_variant_key || undefined,
        source_qty_to_consume: Number(form.source_qty_to_consume),
        output_product_id: Number(form.output_product_id),
        output_variant_key: form.output_variant_key || undefined,
        output_qty_expected: Number(form.output_qty_expected),
        notes: form.notes || undefined,
      });
      toast.success('Repack completed successfully');
      setShowCreate(false);
      setForm({ warehouse_id: '', config_id: '', source_product_id: '', source_variant_key: '', source_qty_to_consume: '', output_product_id: '', output_variant_key: '', output_qty_expected: '', notes: '' });
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create repack order');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FaBoxes className="text-indigo-600" /> Repacking</h1>
          <div className="flex gap-2">
            <button onClick={loadData} className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2"><FaSync className={loading ? 'animate-spin' : ''} /> Refresh</button>
            <button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><FaPlus /> New Repack</button>
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-x-auto">
          {loading ? <div className="p-10 text-center text-gray-500">Loading repack orders...</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Output</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{order.repack_number}</td>
                    <td className="px-4 py-3">{order.source_product_name || `#${order.source_product_id}`}{order.source_variant_key ? ` (${order.source_variant_key})` : ''}<div className="text-xs text-gray-400">Plan: {order.source_qty_to_consume}</div></td>
                    <td className="px-4 py-3">{order.output_product_name || `#${order.output_product_id}`}{order.output_variant_key ? ` (${order.output_variant_key})` : ''}<div className="text-xs text-gray-400">Expected: {order.output_qty_expected}</div></td>
                    <td className="px-4 py-3">{order.warehouse_name || `#${order.warehouse_id}`}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusTone[order.status] || 'bg-gray-100 text-gray-600'}`}>{order.status}</span></td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-500">No repack orders found</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        {showCreate && (
          <Modal title="New Repack Order" onClose={() => setShowCreate(false)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select label="Warehouse *" value={form.warehouse_id} onChange={(value) => setForm({ ...form, warehouse_id: value })} options={warehouseList.map((item) => ({ value: item.id, label: item.name }))} />
              <Select label="Packaging Config" value={form.config_id} onChange={applyConfig} options={configs.map((item) => ({ value: item.id, label: `${item.source_product_name} -> ${item.output_product_name}` }))} />
              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1">Source Product *</span>
                <InventoryProductPicker products={products} productId={form.source_product_id} variantKey={form.source_variant_key} onChange={(productId, variantKey) => setForm({ ...form, source_product_id: productId, source_variant_key: variantKey || '' })} />
              </label>
              <Input label="Source Qty *" value={form.source_qty_to_consume} onChange={(value) => setForm({ ...form, source_qty_to_consume: value })} type="number" />
              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1">Output Product *</span>
                <InventoryProductPicker products={products} productId={form.output_product_id} variantKey={form.output_variant_key} onChange={(productId, variantKey) => setForm({ ...form, output_product_id: productId, output_variant_key: variantKey || '' })} />
              </label>
              <Input label="Expected Output Qty *" value={form.output_qty_expected} onChange={(value) => setForm({ ...form, output_qty_expected: value })} type="number" />
              <div className="md:col-span-2"><Input label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={createOrder} disabled={creating} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-60">{creating ? 'Processing...' : 'Create & Complete'}</button>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><FaTimes /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string | number; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
        <option value="">Select</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
