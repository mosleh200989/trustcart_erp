import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import InventoryProductPicker from '@/components/admin/InventoryProductPicker';
import { inventoryPackagingConfigs, products as productsApi } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaEdit, FaPlus, FaRecycle, FaSync, FaTimes, FaTrash } from 'react-icons/fa';

export default function PackagingConfPage() {
  const toast = useToast();
  const [configs, setConfigs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    source_product_id: '',
    source_variant_key: '',
    source_qty: '',
    output_product_id: '',
    output_variant_key: '',
    output_qty: '',
    waste_percentage: '0',
    description: '',
    is_active: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [configData, productData] = await Promise.all([
        inventoryPackagingConfigs.list(),
        productsApi.listAll(),
      ]);
      setConfigs(configData);
      setProducts(productData);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load packaging configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ source_product_id: '', source_variant_key: '', source_qty: '', output_product_id: '', output_variant_key: '', output_qty: '', waste_percentage: '0', description: '', is_active: true });
  };

  const openEdit = (config: any) => {
    setEditing(config);
    setForm({
      source_product_id: String(config.source_product_id || ''),
      source_variant_key: config.source_variant_key || '',
      source_qty: String(config.source_qty || ''),
      output_product_id: String(config.output_product_id || ''),
      output_variant_key: config.output_variant_key || '',
      output_qty: String(config.output_qty || ''),
      waste_percentage: String(config.waste_percentage ?? 0),
      description: config.description || '',
      is_active: config.is_active !== false,
    });
  };

  const saveConfig = async () => {
    if (!form.source_product_id || !form.source_qty || !form.output_product_id || !form.output_qty) {
      toast.error('Source product, output product, and quantities are required');
      return;
    }
    const payload = {
      source_product_id: Number(form.source_product_id),
      source_variant_key: form.source_variant_key || undefined,
      source_qty: Number(form.source_qty),
      output_product_id: Number(form.output_product_id),
      output_variant_key: form.output_variant_key || undefined,
      output_qty: Number(form.output_qty),
      waste_percentage: Number(form.waste_percentage || 0),
      description: form.description || undefined,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        await inventoryPackagingConfigs.update(editing.id, payload);
        toast.success('Packaging configuration updated');
      } else {
        await inventoryPackagingConfigs.create(payload);
        toast.success('Packaging configuration created');
      }
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save configuration');
    }
  };

  const deleteConfig = async (id: number) => {
    if (!confirm('Delete this packaging configuration?')) return;
    try {
      await inventoryPackagingConfigs.remove(id);
      toast.success('Packaging configuration deleted');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FaRecycle className="text-emerald-600" /> Packaging Conf</h1>
          <button onClick={loadData} className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2"><FaSync className={loading ? 'animate-spin' : ''} /> Refresh</button>
        </div>

        <div className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            {editing ? <FaEdit /> : <FaPlus />} {editing ? 'Edit Configuration' : 'New Configuration'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1">Source Product *</span>
              <InventoryProductPicker products={products} productId={form.source_product_id} variantKey={form.source_variant_key} onChange={(productId, variantKey) => setForm({ ...form, source_product_id: productId, source_variant_key: variantKey || '' })} />
            </label>
            <Input label="Source Qty *" value={form.source_qty} onChange={(value) => setForm({ ...form, source_qty: value })} type="number" />
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1">Output Product *</span>
              <InventoryProductPicker products={products} productId={form.output_product_id} variantKey={form.output_variant_key} onChange={(productId, variantKey) => setForm({ ...form, output_product_id: productId, output_variant_key: variantKey || '' })} />
            </label>
            <Input label="Output Qty *" value={form.output_qty} onChange={(value) => setForm({ ...form, output_qty: value })} type="number" />
            <Input label="Waste %" value={form.waste_percentage} onChange={(value) => setForm({ ...form, waste_percentage: value })} type="number" />
            <div className="lg:col-span-2"><Input label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} /></div>
            <label className="flex items-center gap-2 text-sm pt-6">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {editing && <button onClick={resetForm} className="px-4 py-2 text-sm border rounded-lg flex items-center gap-2"><FaTimes /> Cancel</button>}
            <button onClick={saveConfig} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">{editing ? 'Update' : 'Create'}</button>
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading configurations...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Output</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Waste</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {configs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{config.source_product_name || `#${config.source_product_id}`}</div>
                      <div className="text-xs text-gray-400">Consumes {config.source_qty} {config.source_uom || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{config.output_product_name || `#${config.output_product_id}`}</div>
                      <div className="text-xs text-gray-400">Produces {config.output_qty} {config.output_uom || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{Number(config.waste_percentage || 0).toFixed(2)}%</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {config.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(config)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><FaEdit /></button>
                        <button onClick={() => deleteConfig(config.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete"><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {configs.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-500">No packaging configurations found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
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
