import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/services/api';

interface Agent {
  agentId: number;
  agentName: string;
  phone: string;
}

interface BreakdownRow {
  date: string;
  orderCount: number;
  orderRate: number;
  orderCommission: number;
  upsellCount: number;
  upsellRate: number;
  upsellCommission: number;
  crossSellCount: number;
  crossSellRate: number;
  crossSellCommission: number;
  dailyTotal: number;
}

interface BreakdownData {
  agent: { id: number; name: string; phone: string; tier: string };
  month: string;
  summary: {
    totalOrders: number;
    totalUpsells: number;
    totalCrossSells: number;
    orderRate: number;
    upsellRate: number;
    crossSellRate: number;
    totalOrderCommission: number;
    totalUpsellCommission: number;
    totalCrossSellCommission: number;
    grandTotal: number;
  };
  breakdown: BreakdownRow[];
}

function getCurrentMonth() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit' }).formatToParts(now);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  return `${y}-${m}`;
}

export default function CommissionPaymentBreakdownPage() {
  const toast = useToast();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BreakdownData | null>(null);

  // Load agents list
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/crm/commissions/agents', { params: { limit: 500 } });
        setAgents(res.data.data || []);
      } catch {
        toast.error('Failed to load agents');
      }
    })();
  }, []);

  const loadBreakdown = useCallback(async () => {
    if (!selectedAgent || !selectedMonth) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/crm/commissions/payment-breakdown', {
        params: { agentId: selectedAgent, month: selectedMonth },
      });
      setData(res.data);
    } catch (error: any) {
      console.error('Failed to load breakdown:', error);
      toast.error(error?.response?.data?.message || 'Failed to load payment breakdown');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAgent, selectedMonth]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (val: number) => `৳${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-6">Payment Breakdown</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent</label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Agent</option>
                {agents.map((a) => (
                  <option key={a.agentId} value={a.agentId}>
                    {(a.agentName || '').trim() || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[160px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={loadBreakdown}
              disabled={!selectedAgent || !selectedMonth || loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Generate'}
            </button>
          </div>
        </div>

        {/* Results */}
        {data && (
          <>
            {/* Agent Info + Summary Cards */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <h2 className="text-lg font-semibold">{data.agent.name}</h2>
                <span className="text-sm text-gray-500">{data.agent.phone}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  data.agent.tier === 'platinum' ? 'bg-purple-100 text-purple-800' :
                  data.agent.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                  data.agent.tier === 'website_sale' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {data.agent.tier === 'website_sale' ? 'Website Sale' : data.agent.tier.charAt(0).toUpperCase() + data.agent.tier.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 font-medium">Orders</div>
                  <div className="text-2xl font-bold text-blue-800">{data.summary.totalOrders}</div>
                  <div className="text-sm text-blue-500 mt-1">
                    Rate: {formatCurrency(data.summary.orderRate)} &times; {data.summary.totalOrders} = {formatCurrency(data.summary.totalOrderCommission)}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-600 font-medium">Upsells</div>
                  <div className="text-2xl font-bold text-green-800">{data.summary.totalUpsells}</div>
                  <div className="text-sm text-green-500 mt-1">
                    Rate: {formatCurrency(data.summary.upsellRate)} &times; {data.summary.totalUpsells} = {formatCurrency(data.summary.totalUpsellCommission)}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-purple-600 font-medium">Cross-sells</div>
                  <div className="text-2xl font-bold text-purple-800">{data.summary.totalCrossSells}</div>
                  <div className="text-sm text-purple-500 mt-1">
                    Rate: {formatCurrency(data.summary.crossSellRate)} &times; {data.summary.totalCrossSells} = {formatCurrency(data.summary.totalCrossSellCommission)}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-sm text-orange-600 font-medium">Grand Total</div>
                  <div className="text-2xl font-bold text-orange-800">{formatCurrency(data.summary.grandTotal)}</div>
                  <div className="text-sm text-orange-500 mt-1">
                    All commissions combined
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold text-gray-600">Date</th>
                      <th className="px-3 py-3 text-center font-semibold text-blue-600">Order Count</th>
                      <th className="px-3 py-3 text-center font-semibold text-blue-600">Rate</th>
                      <th className="px-3 py-3 text-right font-semibold text-blue-600">Order Commission</th>
                      <th className="px-3 py-3 text-center font-semibold text-green-600">Upsell Count</th>
                      <th className="px-3 py-3 text-center font-semibold text-green-600">Rate</th>
                      <th className="px-3 py-3 text-right font-semibold text-green-600">Upsell Commission</th>
                      <th className="px-3 py-3 text-center font-semibold text-purple-600">Cross-sell Count</th>
                      <th className="px-3 py-3 text-center font-semibold text-purple-600">Rate</th>
                      <th className="px-3 py-3 text-right font-semibold text-purple-600">Cross-sell Commission</th>
                      <th className="px-3 py-3 text-right font-semibold text-gray-800">Daily Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.breakdown.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-3 py-8 text-center text-gray-400">No orders found for this month</td>
                      </tr>
                    ) : (
                      <>
                        {data.breakdown.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap font-medium">{formatDate(row.date)}</td>
                            <td className="px-3 py-2 text-center">{row.orderCount}</td>
                            <td className="px-3 py-2 text-center">{formatCurrency(row.orderRate)}</td>
                            <td className="px-3 py-2 text-right font-medium text-blue-700">
                              {row.orderCount} &times; {row.orderRate} = {formatCurrency(row.orderCommission)}
                            </td>
                            <td className="px-3 py-2 text-center">{row.upsellCount}</td>
                            <td className="px-3 py-2 text-center">{formatCurrency(row.upsellRate)}</td>
                            <td className="px-3 py-2 text-right font-medium text-green-700">
                              {row.upsellCount} &times; {row.upsellRate} = {formatCurrency(row.upsellCommission)}
                            </td>
                            <td className="px-3 py-2 text-center">{row.crossSellCount}</td>
                            <td className="px-3 py-2 text-center">{formatCurrency(row.crossSellRate)}</td>
                            <td className="px-3 py-2 text-right font-medium text-purple-700">
                              {row.crossSellCount} &times; {row.crossSellRate} = {formatCurrency(row.crossSellCommission)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold">{formatCurrency(row.dailyTotal)}</td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="bg-gray-100 font-bold">
                          <td className="px-3 py-3">Total</td>
                          <td className="px-3 py-3 text-center">{data.summary.totalOrders}</td>
                          <td className="px-3 py-3 text-center">{formatCurrency(data.summary.orderRate)}</td>
                          <td className="px-3 py-3 text-right text-blue-700">{formatCurrency(data.summary.totalOrderCommission)}</td>
                          <td className="px-3 py-3 text-center">{data.summary.totalUpsells}</td>
                          <td className="px-3 py-3 text-center">{formatCurrency(data.summary.upsellRate)}</td>
                          <td className="px-3 py-3 text-right text-green-700">{formatCurrency(data.summary.totalUpsellCommission)}</td>
                          <td className="px-3 py-3 text-center">{data.summary.totalCrossSells}</td>
                          <td className="px-3 py-3 text-center">{formatCurrency(data.summary.crossSellRate)}</td>
                          <td className="px-3 py-3 text-right text-purple-700">{formatCurrency(data.summary.totalCrossSellCommission)}</td>
                          <td className="px-3 py-3 text-right text-orange-700">{formatCurrency(data.summary.grandTotal)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!data && !loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
            Select an agent and month, then click Generate to view the payment breakdown.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
