import { useState, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { inventoryReports } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaChartBar, FaDownload, FaFilter, FaSync } from 'react-icons/fa';

const TABS = [
  { key: 'valuation', label: 'Stock Valuation' },
  { key: 'movement', label: 'Movement Log' },
  { key: 'supplier', label: 'Supplier Performance' },
  { key: 'abc', label: 'ABC Analysis' },
  { key: 'dead', label: 'Dead Stock' },
  { key: 'velocity', label: 'Fast/Slow Movers' },
  { key: 'variance', label: 'Count Variance' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function ReportsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('valuation');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    warehouse_id: '', supplier_id: '', date_from: '', date_to: '',
    movement_type: '', days: '90', count_id: '', limit: '100',
  });

  const fetchReport = useCallback(async (tab?: TabKey) => {
    const t = tab || activeTab;
    try {
      setLoading(true);
      let result: any;
      switch (t) {
        case 'valuation':
          result = await inventoryReports.valuation(filters.warehouse_id ? parseInt(filters.warehouse_id) : undefined);
          break;
        case 'movement':
          result = await inventoryReports.movementLog({
            date_from: filters.date_from || undefined,
            date_to: filters.date_to || undefined,
            movement_type: filters.movement_type || undefined,
            warehouse_id: filters.warehouse_id ? parseInt(filters.warehouse_id) : undefined,
          });
          break;
        case 'supplier':
          result = await inventoryReports.supplierPerformance(filters.supplier_id ? parseInt(filters.supplier_id) : undefined);
          break;
        case 'abc':
          result = await inventoryReports.abcAnalysis();
          break;
        case 'dead':
          result = await inventoryReports.deadStock(filters.days ? parseInt(filters.days) : 90);
          break;
        case 'velocity':
          result = await inventoryReports.fastSlowMovers(filters.date_from, filters.date_to);
          break;
        case 'variance':
          result = await inventoryReports.countVariance(filters.count_id ? parseInt(filters.count_id) : undefined);
          break;
      }
      setData(result);
    } catch (err) {
      toast.error('Failed to load report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters, toast]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setData(null);
  };

  const handleExport = (type: string) => {
    const params: any = {};
    if (filters.warehouse_id) params.warehouse_id = filters.warehouse_id;
    if (filters.days) params.days = filters.days;
    const url = inventoryReports.exportUrl(type, params);
    window.open(url, '_blank');
  };

  const exportableTypes: Record<string, string> = {
    valuation: 'valuation',
    movement: 'movement-log',
    abc: 'abc-analysis',
    dead: 'dead-stock',
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaChartBar className="text-purple-600" /> Inventory Reports
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {(activeTab === 'valuation' || activeTab === 'movement') && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Warehouse ID</label>
                <input type="number" value={filters.warehouse_id} onChange={(e) => setFilters({ ...filters, warehouse_id: e.target.value })}
                  className="border rounded-lg px-3 py-1.5 text-sm w-32" placeholder="All" />
              </div>
            )}
            {(activeTab === 'movement' || activeTab === 'velocity') && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                  <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                    className="border rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                  <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                    className="border rounded-lg px-3 py-1.5 text-sm" />
                </div>
              </>
            )}
            {activeTab === 'movement' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select value={filters.movement_type} onChange={(e) => setFilters({ ...filters, movement_type: e.target.value })}
                  className="border rounded-lg px-3 py-1.5 text-sm">
                  <option value="">All Types</option>
                  <option value="purchase_receipt">Purchase Receipt</option>
                  <option value="sales_dispatch">Sales Dispatch</option>
                  <option value="transfer_in">Transfer In</option>
                  <option value="transfer_out">Transfer Out</option>
                  <option value="adjustment_in">Adjustment In</option>
                  <option value="adjustment_out">Adjustment Out</option>
                </select>
              </div>
            )}
            {activeTab === 'supplier' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Supplier ID</label>
                <input type="number" value={filters.supplier_id} onChange={(e) => setFilters({ ...filters, supplier_id: e.target.value })}
                  className="border rounded-lg px-3 py-1.5 text-sm w-32" placeholder="All" />
              </div>
            )}
            {activeTab === 'dead' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Days Since Movement</label>
                <input type="number" value={filters.days} onChange={(e) => setFilters({ ...filters, days: e.target.value })}
                  className="border rounded-lg px-3 py-1.5 text-sm w-32" />
              </div>
            )}
            {activeTab === 'variance' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Count ID</label>
                <input type="number" value={filters.count_id} onChange={(e) => setFilters({ ...filters, count_id: e.target.value })}
                  className="border rounded-lg px-3 py-1.5 text-sm w-32" placeholder="All" />
              </div>
            )}
            <button onClick={() => fetchReport()} disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
              {loading ? <FaSync className="animate-spin" /> : <FaFilter />}
              {loading ? 'Loading...' : 'Generate'}
            </button>
            {exportableTypes[activeTab] && (
              <button onClick={() => handleExport(exportableTypes[activeTab])}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm flex items-center gap-2">
                <FaDownload /> Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-xl shadow border">
          {!data && !loading ? (
            <div className="p-12 text-center text-gray-400">Click "Generate" to load the report</div>
          ) : loading ? (
            <div className="p-12 text-center text-gray-400">Loading report...</div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === 'valuation' && <ValuationTable data={data} />}
              {activeTab === 'movement' && <MovementTable data={data} />}
              {activeTab === 'supplier' && <SupplierTable data={data} />}
              {activeTab === 'abc' && <AbcTable data={data} />}
              {activeTab === 'dead' && <DeadStockTable data={data} />}
              {activeTab === 'velocity' && <VelocityTable data={data} />}
              {activeTab === 'variance' && <VarianceView data={data} />}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function ValuationTable({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : [];
  if (!items.length) return <div className="p-8 text-center text-gray-400">No data</div>;
  const total = items.reduce((s: number, i: any) => s + parseFloat(i.total_value || 0), 0);
  return (
    <>
      <div className="p-4 border-b bg-gray-50">
        <span className="text-sm font-medium text-gray-600">Total Valuation: </span>
        <span className="text-lg font-bold text-green-700">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((row: any, i: number) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3">{row.product_name || row.product_id}</td>
              <td className="px-4 py-3 text-gray-500">{row.warehouse_name || row.warehouse_id}</td>
              <td className="px-4 py-3 text-right">{parseInt(row.total_quantity).toLocaleString()}</td>
              <td className="px-4 py-3 text-right">${parseFloat(row.unit_cost || 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-right font-medium">${parseFloat(row.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function MovementTable({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : [];
  if (!items.length) return <div className="p-8 text-center text-gray-400">No movements found</div>;
  const typeColors: Record<string, string> = {
    purchase_receipt: 'bg-green-100 text-green-700', sales_dispatch: 'bg-blue-100 text-blue-700',
    transfer_in: 'bg-purple-100 text-purple-700', transfer_out: 'bg-indigo-100 text-indigo-700',
    adjustment_in: 'bg-yellow-100 text-yellow-700', adjustment_out: 'bg-red-100 text-red-700',
  };
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map((row: any, i: number) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-xs text-gray-500">{new Date(row.created_at).toLocaleString()}</td>
            <td className="px-4 py-3">{row.product_name || row.product_id}</td>
            <td className="px-4 py-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[row.movement_type] || 'bg-gray-100 text-gray-600'}`}>
                {row.movement_type?.replace(/_/g, ' ')}
              </span>
            </td>
            <td className="px-4 py-3 text-right">{row.quantity}</td>
            <td className="px-4 py-3 text-xs text-gray-400">{row.reference_type} #{row.reference_id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SupplierTable({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : [];
  if (!items.length) return <div className="p-8 text-center text-gray-400">No supplier data</div>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">On-Time %</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quality %</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Lead Days</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fill Rate %</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Spend</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map((row: any, i: number) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-medium">{row.supplier_name || row.supplier_id}</td>
            <td className="px-4 py-3 text-right">{parseFloat(row.on_time_rate || 0).toFixed(1)}%</td>
            <td className="px-4 py-3 text-right">{parseFloat(row.quality_acceptance_rate || 0).toFixed(1)}%</td>
            <td className="px-4 py-3 text-right">{parseFloat(row.avg_lead_time || 0).toFixed(1)}</td>
            <td className="px-4 py-3 text-right">{parseFloat(row.fill_rate || 0).toFixed(1)}%</td>
            <td className="px-4 py-3 text-right font-medium">${parseFloat(row.total_spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AbcTable({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : [];
  if (!items.length) return <div className="p-8 text-center text-gray-400">No data</div>;
  const classColors: Record<string, string> = { A: 'bg-green-100 text-green-700', B: 'bg-yellow-100 text-yellow-700', C: 'bg-red-100 text-red-700' };
  const summary = { A: 0, B: 0, C: 0 };
  items.forEach((i: any) => { if (i.classification in summary) summary[i.classification as keyof typeof summary]++; });
  return (
    <>
      <div className="p-4 border-b bg-gray-50 flex gap-4">
        {Object.entries(summary).map(([cls, cnt]) => (
          <span key={cls} className={`text-xs px-3 py-1 rounded-full font-semibold ${classColors[cls]}`}>
            Class {cls}: {cnt} items
          </span>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Class</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Value</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cumulative %</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((row: any, i: number) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3">{row.product_name || row.product_id}</td>
              <td className="px-4 py-3 text-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${classColors[row.classification] || 'bg-gray-100'}`}>{row.classification}</span>
              </td>
              <td className="px-4 py-3 text-right">${parseFloat(row.stock_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="px-4 py-3 text-right text-gray-500">{parseFloat(row.cumulative_percentage || 0).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function DeadStockTable({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : [];
  if (!items.length) return <div className="p-8 text-center text-gray-400">No dead stock found</div>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Movement</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Days Idle</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map((row: any, i: number) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="px-4 py-3">{row.product_name || row.product_id}</td>
            <td className="px-4 py-3 text-right">{parseInt(row.quantity || 0).toLocaleString()}</td>
            <td className="px-4 py-3 text-right">${parseFloat(row.stock_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td className="px-4 py-3 text-xs text-gray-400">{row.last_movement ? new Date(row.last_movement).toLocaleDateString() : 'Never'}</td>
            <td className="px-4 py-3 text-right font-medium text-red-600">{row.days_idle || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VelocityTable({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : [];
  if (!items.length) return <div className="p-8 text-center text-gray-400">No data</div>;
  const catColors: Record<string, string> = { fast: 'bg-green-100 text-green-700', normal: 'bg-blue-100 text-blue-700', slow: 'bg-red-100 text-red-700' };
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Category</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Dispatched</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Stock</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map((row: any, i: number) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="px-4 py-3">{row.product_name || row.product_id}</td>
            <td className="px-4 py-3 text-center">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${catColors[row.category] || 'bg-gray-100'}`}>{row.category}</span>
            </td>
            <td className="px-4 py-3 text-right">{parseInt(row.total_dispatched || 0).toLocaleString()}</td>
            <td className="px-4 py-3 text-right">{parseInt(row.current_stock || 0).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VarianceView({ data }: { data: any }) {
  if (!data) return <div className="p-8 text-center text-gray-400">No data</div>;
  const summary = data.summary || data;
  const items = data.items || [];
  return (
    <>
      {summary.accuracy_percentage !== undefined && (
        <div className="p-4 border-b bg-gray-50 flex gap-6">
          <div><span className="text-xs text-gray-500">Accuracy: </span><span className="font-bold text-lg">{parseFloat(summary.accuracy_percentage).toFixed(1)}%</span></div>
          <div><span className="text-xs text-gray-500">Total Items: </span><span className="font-semibold">{summary.total_items}</span></div>
          <div><span className="text-xs text-gray-500">Variance Items: </span><span className="font-semibold text-orange-600">{summary.variance_items}</span></div>
        </div>
      )}
      {items.length > 0 && (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">System Qty</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Counted Qty</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((row: any, i: number) => {
              const variance = (row.counted_quantity || 0) - (row.system_quantity || 0);
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{row.product_name || row.product_id}</td>
                  <td className="px-4 py-3 text-right">{row.system_quantity}</td>
                  <td className="px-4 py-3 text-right">{row.counted_quantity}</td>
                  <td className={`px-4 py-3 text-right font-medium ${variance !== 0 ? (variance > 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                    {variance > 0 ? '+' : ''}{variance}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!items.length && !summary.accuracy_percentage && (
        <div className="p-8 text-center text-gray-400">No variance data</div>
      )}
    </>
  );
}
