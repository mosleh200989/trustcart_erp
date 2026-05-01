import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { repackOrders } from '@/services/api';
import { FaRecycle, FaArrowLeft, FaPlay, FaCheck, FaTimes, FaBox, FaArrowRight } from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};

export default function RepackOrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const toast = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    source_qty_consumed: '',
    output_qty_actual: '',
    waste_qty: '',
    output_batch_number: '',
    notes: '',
  });

  useEffect(() => {
    if (id) loadOrder();
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await repackOrders.get(parseInt(id as string));
      setOrder(data);
      // Pre-fill form with planned quantities
      setCompleteForm(f => ({
        ...f,
        source_qty_consumed: String(data.source_qty_to_consume),
        output_qty_actual: String(data.output_qty_expected),
      }));
    } catch { toast.error('Failed to load order'); }
    finally { setLoading(false); }
  };

  const handleStart = async () => {
    try {
      await repackOrders.start(order.id);
      toast.success('Repack started');
      loadOrder();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to start'); }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeForm.source_qty_consumed || !completeForm.output_qty_actual) {
      toast.error('Enter actual quantities');
      return;
    }
    setCompleting(true);
    try {
      await repackOrders.complete(order.id, {
        source_qty_consumed: parseFloat(completeForm.source_qty_consumed),
        output_qty_actual: parseInt(completeForm.output_qty_actual),
        waste_qty: completeForm.waste_qty ? parseFloat(completeForm.waste_qty) : 0,
        output_batch_number: completeForm.output_batch_number || undefined,
        notes: completeForm.notes || undefined,
      });
      toast.success('Repack completed — stock updated');
      setShowCompleteForm(false);
      loadOrder();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to complete');
    } finally { setCompleting(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this repack order?')) return;
    try {
      await repackOrders.cancel(order.id);
      toast.success('Order cancelled');
      loadOrder();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to cancel'); }
  };

  if (loading) return <AdminLayout><div className="p-6 text-gray-500">Loading...</div></AdminLayout>;
  if (!order) return <AdminLayout><div className="p-6 text-gray-500">Order not found</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin/inventory/repack')} className="text-gray-500 hover:text-gray-700">
            <FaArrowLeft />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FaRecycle className="text-blue-600" />
              {order.repack_number}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{order.warehouse_name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
            {order.status.replace('_', ' ')}
          </span>
        </div>

        {/* Flow Card */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-4">
            {/* Source */}
            <div className="flex-1 bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Source (Bulk)</div>
              <div className="font-semibold text-gray-800">{order.source_product_name}</div>
              <div className="text-sm text-gray-500">{order.source_product_sku}</div>
              {order.source_uom && <div className="text-xs text-gray-400 mt-1">Unit: {order.source_uom}</div>}
              {order.source_batch_number && <div className="text-xs text-gray-400">Batch: {order.source_batch_number}</div>}
              <div className="mt-3 text-sm">
                <span className="text-gray-500">Planned: </span>
                <span className="font-medium">{Number(order.source_qty_to_consume)}</span>
              </div>
              {order.source_qty_consumed && (
                <div className="text-sm text-green-700">
                  <span>Actual: </span><span className="font-medium">{Number(order.source_qty_consumed)}</span>
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <FaArrowRight className="text-2xl text-blue-500" />
              <div className="text-xs text-gray-400">repack</div>
            </div>

            {/* Output */}
            <div className="flex-1 bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Output (Packaged)</div>
              <div className="font-semibold text-gray-800">{order.output_product_name}</div>
              <div className="text-sm text-gray-500">{order.output_product_sku}</div>
              {order.output_uom && <div className="text-xs text-gray-400 mt-1">Unit: {order.output_uom}</div>}
              {order.output_batch_number && <div className="text-xs text-gray-400">Batch: {order.output_batch_number}</div>}
              <div className="mt-3 text-sm">
                <span className="text-gray-500">Expected: </span>
                <span className="font-medium">{order.output_qty_expected}</span>
              </div>
              {order.output_qty_actual !== null && order.output_qty_actual !== undefined && (
                <div className="text-sm text-green-700">
                  <span>Actual: </span><span className="font-medium">{order.output_qty_actual}</span>
                </div>
              )}
            </div>
          </div>
          {order.waste_qty > 0 && (
            <div className="mt-4 text-sm text-orange-600 bg-orange-50 rounded p-2 border border-orange-200">
              Waste / Loss: {Number(order.waste_qty)} units
            </div>
          )}
          {order.notes && <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-2">{order.notes}</div>}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h3 className="font-semibold mb-4 text-gray-700">Timeline</h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="w-24 text-gray-400 shrink-0">Created</span>
              <span>{new Date(order.created_at).toLocaleString()}</span>
            </div>
            {order.completed_at && (
              <div className="flex gap-3">
                <span className="w-24 text-gray-400 shrink-0">Completed</span>
                <span>{new Date(order.completed_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {(order.status === 'draft' || order.status === 'in_progress') && (
          <div className="flex gap-3">
            {order.status === 'draft' && (
              <button onClick={handleStart} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                <FaPlay /> Start Repack
              </button>
            )}
            {(order.status === 'draft' || order.status === 'in_progress') && (
              <button onClick={() => setShowCompleteForm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                <FaCheck /> Complete &amp; Apply Stock
              </button>
            )}
            <button onClick={handleCancel} className="flex items-center gap-2 px-5 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm">
              <FaTimes /> Cancel
            </button>
          </div>
        )}

        {/* Complete Form Modal */}
        {showCompleteForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="font-semibold text-lg flex items-center gap-2"><FaCheck className="text-green-600" /> Complete Repack</h2>
                <button onClick={() => setShowCompleteForm(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
              </div>
              <form onSubmit={handleComplete} className="p-5 space-y-4">
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 text-sm">
                  <div className="font-medium text-orange-700 mb-1">Source deducted from stock:</div>
                  <div className="text-gray-600">{order.source_product_name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Source Qty Consumed *</label>
                  <input type="number" step="0.001" min="0.001" value={completeForm.source_qty_consumed} onChange={e => setCompleteForm(f => ({ ...f, source_qty_consumed: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                  <p className="text-xs text-gray-400 mt-1">Planned: {Number(order.source_qty_to_consume)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-sm">
                  <div className="font-medium text-green-700 mb-1">Output added to stock:</div>
                  <div className="text-gray-600">{order.output_product_name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Output Qty Produced *</label>
                  <input type="number" min="1" value={completeForm.output_qty_actual} onChange={e => setCompleteForm(f => ({ ...f, output_qty_actual: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                  <p className="text-xs text-gray-400 mt-1">Expected: {order.output_qty_expected}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Waste / Loss Qty</label>
                    <input type="number" step="0.001" min="0" value={completeForm.waste_qty} onChange={e => setCompleteForm(f => ({ ...f, waste_qty: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Output Batch Number</label>
                    <input type="text" value={completeForm.output_batch_number} onChange={e => setCompleteForm(f => ({ ...f, output_batch_number: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. BTH-20260501" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={completeForm.notes} onChange={e => setCompleteForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
                  This will immediately update stock levels: deduct from source product and add to output product.
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setShowCompleteForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={completing} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                    {completing ? 'Applying...' : 'Confirm & Apply Stock'}
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
