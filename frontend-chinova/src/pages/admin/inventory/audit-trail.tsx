import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { inventoryAuditTrail } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaSearch, FaFilter } from 'react-icons/fa';

interface AuditEntry {
  id: number;
  reference_number: string;
  movement_type: string;
  product_name: string;
  product_sku: string;
  source_warehouse_name: string;
  dest_warehouse_name: string;
  quantity: number;
  balance_before: number;
  balance_after: number;
  reason: string;
  notes: string;
  performed_by_name: string;
  created_at: string;
}

export default function AuditTrailPage() {
  const toast = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    product_id: '',
    warehouse_id: '',
    date_from: '',
    date_to: '',
    limit: '100',
  });

  useEffect(() => { loadAuditTrail(); }, []);

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.product_id) params.product_id = parseInt(filters.product_id);
      if (filters.warehouse_id) params.warehouse_id = parseInt(filters.warehouse_id);
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.limit) params.limit = parseInt(filters.limit);
      const data = await inventoryAuditTrail.list(params);
      setEntries(data);
    } catch {
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const typeColor = (t: string) => {
    const colors: Record<string, string> = {
      purchase_receipt: 'bg-green-100 text-green-800',
      sales_dispatch: 'bg-blue-100 text-blue-800',
      adjustment_increase: 'bg-cyan-100 text-cyan-800',
      adjustment_decrease: 'bg-orange-100 text-orange-800',
      transfer_out: 'bg-purple-100 text-purple-800',
      transfer_in: 'bg-indigo-100 text-indigo-800',
      count_adjustment: 'bg-yellow-100 text-yellow-800',
      write_off: 'bg-red-100 text-red-800',
      reservation: 'bg-pink-100 text-pink-800',
    };
    return colors[t] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <FaSearch className="text-blue-600" />
          Inventory Audit Trail
        </h1>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FaFilter className="text-gray-400" />
            <span className="font-medium text-sm">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <input
              type="number"
              placeholder="Product ID"
              value={filters.product_id}
              onChange={(e) => setFilters({ ...filters, product_id: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Warehouse ID"
              value={filters.warehouse_id}
              onChange={(e) => setFilters({ ...filters, warehouse_id: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              type="date"
              placeholder="Date From"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              type="date"
              placeholder="Date To"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
            />
            <button
              onClick={loadAuditTrail}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No audit trail entries found</div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-xs">Reference</th>
                    <th className="text-left p-3 text-xs">Type</th>
                    <th className="text-left p-3 text-xs">Product</th>
                    <th className="text-left p-3 text-xs">From</th>
                    <th className="text-left p-3 text-xs">To</th>
                    <th className="text-right p-3 text-xs">Qty</th>
                    <th className="text-right p-3 text-xs">Before</th>
                    <th className="text-right p-3 text-xs">After</th>
                    <th className="text-left p-3 text-xs">By</th>
                    <th className="text-left p-3 text-xs">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{e.reference_number}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(e.movement_type)}`}>
                          {e.movement_type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{e.product_name}</div>
                        <div className="text-xs text-gray-400">{e.product_sku}</div>
                      </td>
                      <td className="p-3 text-xs">{e.source_warehouse_name || '—'}</td>
                      <td className="p-3 text-xs">{e.dest_warehouse_name || '—'}</td>
                      <td className="p-3 text-right font-medium">{e.quantity}</td>
                      <td className="p-3 text-right text-gray-500">{e.balance_before}</td>
                      <td className="p-3 text-right font-medium">{e.balance_after}</td>
                      <td className="p-3 text-xs">{e.performed_by_name || '—'}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 border-t">
              Showing {entries.length} entries {filters.limit ? `(limit: ${filters.limit})` : ''}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
