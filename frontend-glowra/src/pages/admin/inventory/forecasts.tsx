import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { inventoryForecasts } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaChartLine, FaSync, FaFilter } from 'react-icons/fa';

interface Forecast {
  id: number;
  product_id: number;
  warehouse_id: number;
  forecast_period: number;
  moving_average_qty: number;
  historical_std_dev: number;
  suggested_reorder_qty: number;
  velocity: string;
  forecasted_date: string;
  effective_from: string;
}

export default function ForecastsPage() {
  const toast = useToast();
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [accuracy, setAccuracy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<number | null>(null);
  const [tab, setTab] = useState<'forecasts' | 'accuracy'>('forecasts');

  useEffect(() => { loadForecasts(); }, []);

  const loadForecasts = async () => {
    setLoading(true);
    try {
      const [data, acc] = await Promise.all([
        inventoryForecasts.list(),
        inventoryForecasts.accuracy(),
      ]);
      setForecasts(data);
      setAccuracy(acc);
    } catch (err: any) {
      toast.error('Failed to load forecasts');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await inventoryForecasts.generate();
      toast.success(`Generated ${result.generated} forecast(s)`);
      loadForecasts();
    } catch (err: any) {
      toast.error('Failed to generate forecasts');
    } finally {
      setGenerating(false);
    }
  };

  const velocityColor = (v: string) => {
    const colors: Record<string, string> = {
      fast: 'bg-green-100 text-green-800',
      normal: 'bg-blue-100 text-blue-800',
      slow: 'bg-yellow-100 text-yellow-800',
      dead: 'bg-red-100 text-red-800',
    };
    return colors[v] || 'bg-gray-100 text-gray-800';
  };

  const filtered = periodFilter
    ? forecasts.filter((f) => f.forecast_period === periodFilter)
    : forecasts;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaChartLine className="text-blue-600" />
            Demand Forecasting
          </h1>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FaSync className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating...' : 'Generate Forecasts'}
          </button>
        </div>

        {/* Summary Cards */}
        {accuracy && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border p-4">
              <p className="text-sm text-gray-500">Total Forecasts</p>
              <p className="text-2xl font-bold">{forecasts.length}</p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <p className="text-sm text-gray-500">Average Accuracy</p>
              <p className="text-2xl font-bold text-green-600">{accuracy.average_accuracy_pct}%</p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <p className="text-sm text-gray-500">Products Forecasted</p>
              <p className="text-2xl font-bold">{new Set(forecasts.map(f => f.product_id)).size}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => setTab('forecasts')}
            className={`px-4 py-2 border-b-2 ${tab === 'forecasts' ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-500'}`}
          >
            Forecasts
          </button>
          <button
            onClick={() => setTab('accuracy')}
            className={`px-4 py-2 border-b-2 ${tab === 'accuracy' ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-500'}`}
          >
            Accuracy Report
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : tab === 'forecasts' ? (
          <>
            {/* Period Filter */}
            <div className="flex items-center gap-2 mb-4">
              <FaFilter className="text-gray-400" />
              <span className="text-sm text-gray-600">Period:</span>
              {[null, 3, 6, 12].map((p) => (
                <button
                  key={String(p)}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1 rounded text-sm ${
                    periodFilter === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p ? `${p} months` : 'All'}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No forecasts yet. Click "Generate Forecasts" to calculate demand predictions.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Product ID</th>
                      <th className="text-left p-3">Warehouse ID</th>
                      <th className="text-center p-3">Period</th>
                      <th className="text-right p-3">Avg Monthly Qty</th>
                      <th className="text-right p-3">Std Dev</th>
                      <th className="text-right p-3">Suggested Reorder</th>
                      <th className="text-center p-3">Velocity</th>
                      <th className="text-left p-3">Forecast Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50">
                        <td className="p-3">{f.product_id}</td>
                        <td className="p-3">{f.warehouse_id}</td>
                        <td className="p-3 text-center">{f.forecast_period}mo</td>
                        <td className="p-3 text-right font-medium">{f.moving_average_qty}</td>
                        <td className="p-3 text-right">{f.historical_std_dev}</td>
                        <td className="p-3 text-right font-medium text-blue-600">{f.suggested_reorder_qty}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${velocityColor(f.velocity)}`}>
                            {f.velocity}
                          </span>
                        </td>
                        <td className="p-3">{f.forecasted_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* Accuracy Tab */
          accuracy && accuracy.items?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Product</th>
                    <th className="text-right p-3">Forecast Qty</th>
                    <th className="text-right p-3">Actual Qty</th>
                    <th className="text-right p-3">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {accuracy.items.map((a: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{a.product_name || `Product #${a.product_id}`}</td>
                      <td className="p-3 text-right">{a.forecast_qty}</td>
                      <td className="p-3 text-right">{a.actual_qty}</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          a.accuracy_pct >= 80 ? 'bg-green-100 text-green-800' :
                          a.accuracy_pct >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {a.accuracy_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No accuracy data available yet.</div>
          )
        )}
      </div>
    </AdminLayout>
  );
}
