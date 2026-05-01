import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { packagingConfigs, products as productsApi } from '@/services/api';
import { FaBox, FaPlus, FaEdit, FaTrash, FaArrowRight, FaTimes, FaToggleOn, FaToggleOff } from 'react-icons/fa';

interface Config {
  id: number;
  source_product_id: number;
  source_product_name?: string;
  source_product_sku?: string;
  source_qty: number;
  output_product_id: number;
  output_product_name?: string;
  output_product_sku?: string;
  output_qty: number;
  waste_percentage: number;
  description?: string;
  is_active: boolean;
}

const emptyForm = {
  source_product_id: '',
  source_qty: '',
  output_product_id: '',
  output_qty: '',
  waste_percentage: '0',
  description: '',
  is_active: true,
};

export default function PackagingConfigsPage() {
  const toast = useToast();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgs, prods] = await Promise.all([packagingConfigs.list(), productsApi.list()]);
      setConfigs(cfgs);
      setProducts(prods);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (cfg: Config) => {
    setEditing(cfg);
    setForm({
      source_product_id: String(cfg.source_product_id),
      source_qty: String(cfg.source_qty),
      output_product_id: String(cfg.output_product_id),
      output_qty: String(cfg.output_qty),
      waste_percentage: String(cfg.waste_percentage),
      description: cfg.description || '',
      is_active: cfg.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.source_product_id || !form.source_qty || !form.output_product_id || !form.output_qty) {
      toast.error('Fill in all required fields');
      return;
    }
    if (form.source_product_id === form.output_product_id) {
      toast.error('Source and output products must differ');
      return;
    }
    setSaving(true);
    try {
      const dto = {
        source_product_id: parseInt(form.source_product_id),
        source_qty: parseFloat(form.source_qty),
        output_product_id: parseInt(form.output_product_id),
        output_qty: parseInt(form.output_qty),
        waste_percentage: parseFloat(form.waste_percentage) || 0,
        description: form.description || undefined,
        is_active: form.is_active,
      };
      if (editing) {
        await packagingConfigs.update(editing.id, dto);
        toast.success('Config updated');
      } else {
        await packagingConfigs.create(dto);
        toast.success('Config created');
      }
      setShowModal(false);
      loadAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (cfg: Config) => {
    if (!confirm(`Delete packaging config "${cfg.source_product_name} → ${cfg.output_product_name}"?`)) return;
    try {
      await packagingConfigs.remove(cfg.id);
      toast.success('Config deleted');
      loadAll();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to delete'); }
  };

  const productName = (id: number) => {
    const p = products.find((p: any) => p.id === id);
    return p ? (p.nameEn || p.name_en || `#${id}`) : `#${id}`;
  };

  const yieldPct = (sourceQty: number, outputQty: number, waste: number) => {
    if (!sourceQty) return '-';
    return `${((outputQty / sourceQty) * (1 - waste / 100)).toFixed(1)}×`;
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaBox className="text-blue-600" /> Packaging Configurations
            </h1>
            <p className="text-sm text-gray-500 mt-1">Define how bulk products convert into retail packages</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
            <FaPlus /> New Configuration
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : configs.length === 0 ? (
          <div className="text-center py-16">
            <FaBox className="text-5xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No packaging configurations yet</p>
            <p className="text-sm text-gray-400 mb-4">Example: 10kg barrel of honey → 20 × 500g bottles</p>
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 inline-flex items-center gap-2">
              <FaPlus /> Create First Config
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {configs.map((cfg) => (
              <div key={cfg.id} className={`bg-white border rounded-xl p-5 flex items-center gap-4 ${!cfg.is_active ? 'opacity-60' : ''}`}>
                {/* Source */}
                <div className="flex-1 bg-orange-50 rounded-lg p-3 border border-orange-200 min-w-0">
                  <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Bulk (Source)</div>
                  <div className="font-medium text-gray-800 truncate">{cfg.source_product_name}</div>
                  <div className="text-sm text-gray-500">{cfg.source_product_sku}</div>
                  <div className="text-sm text-orange-700 font-semibold mt-1">{Number(cfg.source_qty)} units</div>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <FaArrowRight className="text-xl text-blue-500" />
                  {cfg.waste_percentage > 0 && (
                    <div className="text-xs text-orange-500">{cfg.waste_percentage}% waste</div>
                  )}
                  <div className="text-xs text-gray-400">{yieldPct(cfg.source_qty, cfg.output_qty, cfg.waste_percentage)} yield</div>
                </div>

                {/* Output */}
                <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-200 min-w-0">
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Retail (Output)</div>
                  <div className="font-medium text-gray-800 truncate">{cfg.output_product_name}</div>
                  <div className="text-sm text-gray-500">{cfg.output_product_sku}</div>
                  <div className="text-sm text-green-700 font-semibold mt-1">{cfg.output_qty} units</div>
                </div>

                {/* Meta + Actions */}
                <div className="shrink-0 text-right">
                  {cfg.description && <div className="text-xs text-gray-400 mb-2 max-w-32 text-right truncate">{cfg.description}</div>}
                  <div className="flex items-center gap-1 justify-end mb-2">
                    {cfg.is_active
                      ? <span className="flex items-center gap-1 text-green-600 text-xs"><FaToggleOn /> Active</span>
                      : <span className="flex items-center gap-1 text-gray-400 text-xs"><FaToggleOff /> Inactive</span>
                    }
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(cfg)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><FaEdit /></button>
                    <button onClick={() => handleDelete(cfg)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><FaTrash /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <FaBox className="text-blue-600" />
                  {editing ? 'Edit Packaging Config' : 'New Packaging Config'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-5">
                {/* Source */}
                <div className="border rounded-lg p-4 space-y-3 bg-orange-50">
                  <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Bulk / Source</div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product (bulk) *</label>
                    <select value={form.source_product_id} onChange={e => setForm(f => ({ ...f, source_product_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white" required>
                      <option value="">Select product...</option>
                      {products.map((p: any) => <option key={p.id} value={p.id}>{p.nameEn || p.name_en} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source Quantity *</label>
                    <input type="number" step="0.001" min="0.001" value={form.source_qty} onChange={e => setForm(f => ({ ...f, source_qty: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 10 (kg barrel)" required />
                    <p className="text-xs text-gray-400 mt-1">How many units of the bulk product go into each repack run</p>
                  </div>
                </div>

                {/* Output */}
                <div className="border rounded-lg p-4 space-y-3 bg-green-50">
                  <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Retail / Output</div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product (retail) *</label>
                    <select value={form.output_product_id} onChange={e => setForm(f => ({ ...f, output_product_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white" required>
                      <option value="">Select product...</option>
                      {products.filter((p: any) => String(p.id) !== form.source_product_id).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.nameEn || p.name_en} ({p.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Output Quantity *</label>
                    <input type="number" min="1" value={form.output_qty} onChange={e => setForm(f => ({ ...f, output_qty: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 20 (500g bottles)" required />
                    <p className="text-xs text-gray-400 mt-1">How many retail units are produced per run</p>
                  </div>
                </div>

                {/* Waste + Meta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waste Percentage (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={form.waste_percentage} onChange={e => setForm(f => ({ ...f, waste_percentage: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  <p className="text-xs text-gray-400 mt-1">Expected loss during repackaging (informational only)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 10kg honey barrel → 500g bottles" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                  <span className="text-sm text-gray-700">Active (available for repack orders)</span>
                </div>

                {/* Preview */}
                {form.source_qty && form.output_qty && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    <span className="font-medium">Preview: </span>
                    {Number(form.source_qty)} {form.source_product_id ? productName(parseInt(form.source_product_id)) : 'bulk unit(s)'}
                    {' '}<FaArrowRight className="inline" />{' '}
                    {form.output_qty} {form.output_product_id ? productName(parseInt(form.output_product_id)) : 'retail unit(s)'}
                    {parseFloat(form.waste_percentage) > 0 && ` (${form.waste_percentage}% waste)`}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Config'}
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
