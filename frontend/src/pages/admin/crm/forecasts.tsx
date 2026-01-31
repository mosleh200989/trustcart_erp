import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { Line, Bar } from 'react-chartjs-2';
import { useToast } from '@/contexts/ToastContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface SalesQuota {
  id: number;
  userId?: number;
  teamId?: number;
  quotaPeriod: string;
  startDate: string;
  endDate: string;
  quotaAmount: number;
  actualAmount: number;
  attainmentPercentage: number;
}

interface SalesForecast {
  id: number;
  forecastPeriod: string;
  startDate: string;
  endDate: string;
  forecastType: string;
  forecastAmount: number;
  actualAmount?: number;
  accuracyPercentage?: number;
  dealCount: number;
  createdAt: string;
}

export default function ForecastDashboardPage() {
  const toast = useToast();
  const [quotas, setQuotas] = useState<SalesQuota[]>([]);
  const [forecasts, setForecasts] = useState<SalesForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [quotasRes, forecastsRes] = await Promise.all([
        apiClient.get<SalesQuota[]>('/crm/forecasts/quotas', {
          params: { period },
        }),
        apiClient.get<SalesForecast[]>('/crm/forecasts', {
          params: { period },
        }),
      ]);
      const quotasData = Array.isArray(quotasRes.data) ? quotasRes.data : [];
      const forecastsData = Array.isArray(forecastsRes.data) ? forecastsRes.data : [];
      setQuotas(quotasData);
      setForecasts(forecastsData);
    } catch (error) {
      console.error('Failed to load forecast data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForecast = async (type: string) => {
    try {
      await apiClient.post('/crm/forecasts/generate', {
        forecastType: type,
        period,
      });
      loadData();
      setShowForecastModal(false);
    } catch (error) {
      console.error('Failed to generate forecast', error);
      toast.error('Failed to generate forecast');
    }
  };

  const quotaChartData = {
    labels: quotas.map((q) => q.quotaPeriod),
    datasets: [
      {
        label: 'Quota',
        data: quotas.map((q) => q.quotaAmount),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      },
      {
        label: 'Actual',
        data: quotas.map((q) => q.actualAmount),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
      },
    ],
  };

  const forecastChartData = {
    labels: forecasts.map((f) => f.forecastPeriod),
    datasets: [
      {
        label: 'Forecast',
        data: forecasts.map((f) => f.forecastAmount),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Actual',
        data: forecasts.map((f) => f.actualAmount || 0),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
      },
    ],
  };

  const totalQuota = quotas.reduce((sum, q) => sum + q.quotaAmount, 0);
  const totalActual = quotas.reduce((sum, q) => sum + q.actualAmount, 0);
  const avgAttainment = quotas.length > 0
    ? quotas.reduce((sum, q) => sum + q.attainmentPercentage, 0) / quotas.length
    : 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Sales Forecasting</h1>
          <div className="flex gap-3">
            <select
              className="border border-gray-300 rounded-lg px-4 py-2"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <button
              onClick={() => setShowQuotaModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Set Quota
            </button>
            <button
              onClick={() => setShowForecastModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Generate Forecast
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Quota</div>
            <div className="text-3xl font-bold text-gray-900">${totalQuota.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Actual</div>
            <div className="text-3xl font-bold text-green-600">${totalActual.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Avg Attainment</div>
            <div className="text-3xl font-bold text-blue-600">{avgAttainment.toFixed(1)}%</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quota Performance</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <Bar data={quotaChartData} options={{ responsive: true, maintainAspectRatio: true }} />
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Forecast vs Actual</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <Line data={forecastChartData} options={{ responsive: true, maintainAspectRatio: true }} />
            )}
          </div>
        </div>

        {/* Quotas Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quotas</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quota</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attainment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotas.map((quota) => (
                  <tr key={quota.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{quota.quotaPeriod}</td>
                    <td className="px-4 py-3 text-sm">${quota.quotaAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">${quota.actualAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{quota.attainmentPercentage.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          quota.attainmentPercentage >= 100
                            ? 'bg-green-100 text-green-800'
                            : quota.attainmentPercentage >= 75
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {quota.attainmentPercentage >= 100
                          ? 'Exceeded'
                          : quota.attainmentPercentage >= 75
                          ? 'On Track'
                          : 'Behind'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Forecasts Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Forecasts</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forecast</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {forecasts.map((forecast) => (
                  <tr key={forecast.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{forecast.forecastPeriod}</td>
                    <td className="px-4 py-3 text-sm capitalize">{forecast.forecastType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm">${forecast.forecastAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">
                      {forecast.actualAmount ? `$${forecast.actualAmount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {forecast.accuracyPercentage ? `${forecast.accuracyPercentage.toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">{forecast.dealCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        {showQuotaModal && (
          <QuotaModal
            onClose={() => setShowQuotaModal(false)}
            onSaved={() => {
              setShowQuotaModal(false);
              loadData();
            }}
            period={period}
            toast={toast}
          />
        )}

        {showForecastModal && (
          <ForecastModal
            onClose={() => setShowForecastModal(false)}
            onGenerate={handleGenerateForecast}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function QuotaModal({
  onClose,
  onSaved,
  period,
  toast,
}: {
  onClose: () => void;
  onSaved: () => void;
  period: string;
  toast: ReturnType<typeof useToast>;
}) {
  const [formData, setFormData] = useState({
    quotaAmount: '',
    targetType: 'user',
  });

  const handleSave = async () => {
    try {
      await apiClient.post('/crm/forecasts/quotas', {
        quotaAmount: Number(formData.quotaAmount),
        quotaPeriod: period,
      });
      onSaved();
    } catch (error) {
      console.error('Failed to set quota', error);
      toast.error('Failed to set quota');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Set Quota</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quota Amount</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.quotaAmount}
              onChange={(e) => setFormData({ ...formData, quotaAmount: e.target.value })}
              placeholder="e.g., 100000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
              value={period}
              disabled
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ForecastModal({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: (type: string) => void;
}) {
  const [forecastType, setForecastType] = useState('weighted_pipeline');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Generate Forecast</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={forecastType}
              onChange={(e) => setForecastType(e.target.value)}
            >
              <option value="weighted_pipeline">Weighted Pipeline</option>
              <option value="historical_trend">Historical Trend</option>
              <option value="quota_based">Quota Based</option>
            </select>
          </div>
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            {forecastType === 'weighted_pipeline' && 'Based on deal values weighted by stage probabilities'}
            {forecastType === 'historical_trend' && 'Based on historical sales data and growth trends'}
            {forecastType === 'quota_based' && 'Based on current quota achievement rates'}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(forecastType)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
