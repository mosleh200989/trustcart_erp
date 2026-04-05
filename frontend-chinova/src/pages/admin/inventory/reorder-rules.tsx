import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { reorderRules } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import {
  FaClipboardList, FaPlus, FaEdit, FaTrash, FaSync,
  FaPlay, FaToggleOn, FaToggleOff,
} from 'react-icons/fa';

export default function ReorderRulesPage() {
  const toast = useToast();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    variant_key: '',
    warehouse_id: '',
    reorder_point: '',
    reorder_quantity: '',
    max_stock_level: '',
    safety_stock: '0',
    lead_time_days: '3',
    preferred_supplier_id: '',
    auto_reorder: false,
    is_active: true,
  });

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reorderRules.list();
      setRules(data);
    } catch (err) {
      console.error('Failed to load reorder rules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const resetForm = () => {
    setForm({
      product_id: '', variant_key: '', warehouse_id: '',
      reorder_point: '', reorder_quantity: '', max_stock_level: '',
      safety_stock: '0', lead_time_days: '3', preferred_supplier_id: '',
      auto_reorder: false, is_active: true,
    });
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (rule: any) => {
    setForm({
      product_id: String(rule.product_id || ''),
      variant_key: rule.variant_key || '',
      warehouse_id: rule.warehouse_id ? String(rule.warehouse_id) : '',
      reorder_point: String(rule.reorder_point || ''),
      reorder_quantity: String(rule.reorder_quantity || ''),
      max_stock_level: rule.max_stock_level ? String(rule.max_stock_level) : '',
      safety_stock: String(rule.safety_stock || '0'),
      lead_time_days: String(rule.lead_time_days || '3'),
      preferred_supplier_id: rule.preferred_supplier_id ? String(rule.preferred_supplier_id) : '',
      auto_reorder: rule.auto_reorder || false,
      is_active: rule.is_active !== false,
    });
    setEditId(rule.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !form.reorder_point || !form.reorder_quantity) {
      toast.warning('Product ID, Reorder Point, and Reorder Quantity are required');
      return;
    }
    const payload: any = {
      product_id: parseInt(form.product_id, 10),
      reorder_point: parseInt(form.reorder_point, 10),
      reorder_quantity: parseInt(form.reorder_quantity, 10),
      safety_stock: parseInt(form.safety_stock || '0', 10),
      lead_time_days: parseInt(form.lead_time_days || '3', 10),
      auto_reorder: form.auto_reorder,
      is_active: form.is_active,
    };
    if (form.variant_key) payload.variant_key = form.variant_key;
    if (form.warehouse_id) payload.warehouse_id = parseInt(form.warehouse_id, 10);
    if (form.max_stock_level) payload.max_stock_level = parseInt(form.max_stock_level, 10);
    if (form.preferred_supplier_id) payload.preferred_supplier_id = parseInt(form.preferred_supplier_id, 10);

    try {
      if (editId) {
        await reorderRules.update(editId, payload);
        toast.success('Rule updated');
      } else {
        await reorderRules.create(payload);
        toast.success('Rule created');
      }
      setShowModal(false);
      resetForm();
      loadRules();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save rule');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this reorder rule?')) return;
    try {
      await reorderRules.remove(id);
      toast.success('Rule deleted');
      loadRules();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleEvaluate = async () => {
    try {
      setEvaluating(true);
      const result = await reorderRules.evaluate();
      toast.success(`Evaluated: ${result.alertsCreated} alert(s), ${result.posCreated} PO(s) created`);
    } catch (err) {
      toast.error('Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaClipboardList className="text-blue-600" /> Reorder Rules
          </h1>
          <div className="flex gap-2">
            <button onClick={handleEvaluate} disabled={evaluating} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
              <FaPlay /> {evaluating ? 'Evaluating...' : 'Run Evaluation'}
            </button>
            <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <FaPlus /> Add Rule
            </button>
            <button onClick={loadRules} className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg text-sm">
              <FaSync className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Rules Table */}
        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No reorder rules configured. Click "Add Rule" to create one.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reorder Pt</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reorder Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Max Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Auto</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Triggered</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{rule.product_id}</td>
                    <td className="px-4 py-3 text-gray-500">{rule.variant_key || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{rule.warehouse_id || 'All'}</td>
                    <td className="px-4 py-3 text-right">{rule.reorder_point}</td>
                    <td className="px-4 py-3 text-right">{rule.reorder_quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{rule.max_stock_level || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {rule.auto_reorder ? (
                        <FaToggleOn className="text-green-500 text-lg inline" />
                      ) : (
                        <FaToggleOff className="text-gray-300 text-lg inline" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {rule.is_active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {rule.last_triggered_at ? new Date(rule.last_triggered_at).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(rule)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editId ? 'Edit' : 'Create'} Reorder Rule</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product ID *</label>
                  <input type="number" required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Variant Key</label>
                  <input type="text" value={form.variant_key} onChange={(e) => setForm({ ...form, variant_key: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="optional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse ID</label>
                  <input type="number" value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="All if blank" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Preferred Supplier ID</label>
                  <input type="number" value={form.preferred_supplier_id} onChange={(e) => setForm({ ...form, preferred_supplier_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="For auto-reorder" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reorder Point *</label>
                  <input type="number" required value={form.reorder_point} onChange={(e) => setForm({ ...form, reorder_point: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reorder Quantity *</label>
                  <input type="number" required value={form.reorder_quantity} onChange={(e) => setForm({ ...form, reorder_quantity: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Stock Level</label>
                  <input type="number" value={form.max_stock_level} onChange={(e) => setForm({ ...form, max_stock_level: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Safety Stock</label>
                  <input type="number" value={form.safety_stock} onChange={(e) => setForm({ ...form, safety_stock: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lead Time (days)</label>
                  <input type="number" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.auto_reorder} onChange={(e) => setForm({ ...form, auto_reorder: e.target.checked })} />
                  Auto-Reorder PO
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  Active
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
