import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/services/api';

interface Agent {
  agentId: number;
  agentName: string;
  phone: string;
}

interface TL {
  tlId: number;
  tlName: string;
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
    extraPartial: number;
    extraPartialNotes: string;
    grandTotal: number;
  };
  breakdown: BreakdownRow[];
}

interface SupervisionBreakdownRow {
  date: string;
  orderCount: number;
  agentCount: number;
  rate: number;
  commission: number;
}

interface OwnSalesBreakdownRow {
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

interface TLBreakdownData {
  teamLeader: { id: number; name: string; phone: string };
  month: string;
  commissionRate: number;
  supervision: {
    totalOrders: number;
    rate: number;
    totalCommission: number;
    breakdown: SupervisionBreakdownRow[];
  };
  ownSales: {
    totalOrders: number;
    totalUpsells: number;
    totalCrossSells: number;
    orderRate: number;
    upsellRate: number;
    crossSellRate: number;
    totalOrderCommission: number;
    totalUpsellCommission: number;
    totalCrossSellCommission: number;
    totalCommission: number;
    breakdown: OwnSalesBreakdownRow[];
  };
  grandTotal: number;
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

  const [activeTab, setActiveTab] = useState<'agent' | 'team_leader'>('agent');

  // Agent state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BreakdownData | null>(null);

  // Team Leader state
  const [teamLeaders, setTeamLeaders] = useState<TL[]>([]);
  const [selectedTL, setSelectedTL] = useState('');
  const [selectedTLMonth, setSelectedTLMonth] = useState(getCurrentMonth());
  const [tlLoading, setTLLoading] = useState(false);
  const [tlData, setTLData] = useState<TLBreakdownData | null>(null);

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

  // Load team leaders list
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/crm/commissions/team-leaders', { params: { limit: 500 } });
        setTeamLeaders(res.data.data || []);
      } catch {
        toast.error('Failed to load team leaders');
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

  const loadTLBreakdown = useCallback(async () => {
    if (!selectedTL || !selectedTLMonth) return;
    try {
      setTLLoading(true);
      const res = await apiClient.get('/crm/commissions/tl-payment-breakdown', {
        params: { teamLeaderId: selectedTL, month: selectedTLMonth },
      });
      setTLData(res.data);
    } catch (error: any) {
      console.error('Failed to load TL breakdown:', error);
      toast.error(error?.response?.data?.message || 'Failed to load team leader breakdown');
      setTLData(null);
    } finally {
      setTLLoading(false);
    }
  }, [selectedTL, selectedTLMonth]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (val: number) => `৳${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">Payment Breakdown</h1>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('agent')}
            className={`px-6 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'agent'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Agents
          </button>
          <button
            onClick={() => setActiveTab('team_leader')}
            className={`px-6 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'team_leader'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👔 Team Leaders
          </button>
        </div>

        {/* ===== AGENT TAB ===== */}
        {activeTab === 'agent' && (
          <>
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
                {data.summary.extraPartial > 0 && (
                  <div className="bg-teal-50 rounded-lg p-4">
                    <div className="text-sm text-teal-600 font-medium">Extra (Partial)</div>
                    <div className="text-2xl font-bold text-teal-800">{formatCurrency(data.summary.extraPartial)}</div>
                    <div className="text-sm text-teal-500 mt-1">
                      {data.summary.extraPartialNotes || 'For partial deliveries'}
                    </div>
                  </div>
                )}
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

            {/* Extra Partial Table */}
            {data.summary.extraPartial > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
                <div className="px-4 py-3 bg-teal-50 border-b border-teal-100">
                  <h3 className="text-lg font-semibold text-teal-800">Extra Commission (Partial Delivery)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Description</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">Partial Delivery Commission</div>
                          {data.summary.extraPartialNotes && (
                            <div className="text-xs text-gray-500 mt-0.5">{data.summary.extraPartialNotes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-teal-700">{formatCurrency(data.summary.extraPartial)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!data && !loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
            Select an agent and month, then click Generate to view the payment breakdown.
          </div>
        )}
          </>
        )}

        {/* ===== TEAM LEADER TAB ===== */}
        {activeTab === 'team_leader' && (
          <>
            {/* TL Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Leader</label>
                  <select
                    value={selectedTL}
                    onChange={(e) => setSelectedTL(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select Team Leader</option>
                    {teamLeaders.map((tl) => (
                      <option key={tl.tlId} value={tl.tlId}>
                        {(tl.tlName || '').trim() || 'Unknown'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[160px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <input
                    type="month"
                    value={selectedTLMonth}
                    onChange={(e) => setSelectedTLMonth(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={loadTLBreakdown}
                  disabled={!selectedTL || !selectedTLMonth || tlLoading}
                  className="bg-purple-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tlLoading ? 'Loading...' : 'Generate'}
                </button>
              </div>
            </div>

            {/* TL Results */}
            {tlData && (
              <>
                {/* TL Info + Grand Total */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <h2 className="text-lg font-semibold">{tlData.teamLeader.name}</h2>
                    <span className="text-sm text-gray-500">{tlData.teamLeader.phone}</span>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800">Team Leader</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <div className="text-sm text-indigo-600 font-medium">Supervision Commission</div>
                      <div className="text-2xl font-bold text-indigo-800">{formatCurrency(tlData.supervision?.totalCommission)}</div>
                      <div className="text-sm text-indigo-500 mt-1">
                        {tlData.supervision?.totalOrders || 0} agent orders &times; {formatCurrency(tlData.supervision?.rate)} / order
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Own Sales Commission</div>
                      <div className="text-2xl font-bold text-blue-800">{formatCurrency(tlData.ownSales?.totalCommission)}</div>
                      <div className="text-sm text-blue-500 mt-1">
                        {tlData.ownSales?.totalOrders || 0} orders + {tlData.ownSales?.totalUpsells || 0} upsells
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">Grand Total</div>
                      <div className="text-2xl font-bold text-orange-800">{formatCurrency(tlData.grandTotal)}</div>
                      <div className="text-sm text-orange-500 mt-1">Supervision + Own Sales</div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Supervision Breakdown */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                  <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                    <h3 className="text-lg font-semibold text-indigo-800">Supervision Commission (Agent Orders)</h3>
                    <p className="text-sm text-indigo-500">Orders delivered by agents under this team leader &times; {formatCurrency(tlData.supervision?.rate)} per order</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold text-gray-600">Date</th>
                          <th className="px-3 py-3 text-center font-semibold text-indigo-600">Agent Orders</th>
                          <th className="px-3 py-3 text-center font-semibold text-gray-500">Active Agents</th>
                          <th className="px-3 py-3 text-center font-semibold text-indigo-600">Rate</th>
                          <th className="px-3 py-3 text-right font-semibold text-indigo-600">Commission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(!tlData.supervision?.breakdown || tlData.supervision.breakdown.length === 0) ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-8 text-center text-gray-400">No agent orders found for this month</td>
                          </tr>
                        ) : (
                          <>
                            {tlData.supervision.breakdown.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap font-medium">{formatDate(row.date)}</td>
                                <td className="px-3 py-2 text-center">{row.orderCount}</td>
                                <td className="px-3 py-2 text-center text-gray-500">{row.agentCount}</td>
                                <td className="px-3 py-2 text-center">{formatCurrency(row.rate)}</td>
                                <td className="px-3 py-2 text-right font-medium text-indigo-700">
                                  {row.orderCount} &times; {formatCurrency(row.rate)} = {formatCurrency(row.commission)}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold">
                              <td className="px-3 py-3">Total</td>
                              <td className="px-3 py-3 text-center">{tlData.supervision.totalOrders || 0}</td>
                              <td className="px-3 py-3 text-center">-</td>
                              <td className="px-3 py-3 text-center">{formatCurrency(tlData.supervision.rate)}</td>
                              <td className="px-3 py-3 text-right text-indigo-700">{formatCurrency(tlData.supervision.totalCommission)}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: Own Sales Breakdown */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <h3 className="text-lg font-semibold text-blue-800">Own Sales Commission (TL as Agent)</h3>
                    <p className="text-sm text-blue-500">Orders created by the team leader acting as a sales executive</p>
                  </div>
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
                          <th className="px-3 py-3 text-right font-semibold text-gray-800">Daily Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(!tlData.ownSales?.breakdown || tlData.ownSales.breakdown.length === 0) ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-8 text-center text-gray-400">No own sales found for this month</td>
                          </tr>
                        ) : (
                          <>
                            {tlData.ownSales.breakdown.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap font-medium">{formatDate(row.date)}</td>
                                <td className="px-3 py-2 text-center">{row.orderCount}</td>
                                <td className="px-3 py-2 text-center">{formatCurrency(row.orderRate)}</td>
                                <td className="px-3 py-2 text-right font-medium text-blue-700">
                                  {row.orderCount} &times; {formatCurrency(row.orderRate)} = {formatCurrency(row.orderCommission)}
                                </td>
                                <td className="px-3 py-2 text-center">{row.upsellCount}</td>
                                <td className="px-3 py-2 text-center">{formatCurrency(row.upsellRate)}</td>
                                <td className="px-3 py-2 text-right font-medium text-green-700">
                                  {row.upsellCount} &times; {formatCurrency(row.upsellRate)} = {formatCurrency(row.upsellCommission)}
                                </td>
                                <td className="px-3 py-2 text-right font-bold">{formatCurrency(row.dailyTotal)}</td>
                              </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold">
                              <td className="px-3 py-3">Total</td>
                              <td className="px-3 py-3 text-center">{tlData.ownSales.totalOrders || 0}</td>
                              <td className="px-3 py-3 text-center">{formatCurrency(tlData.ownSales.orderRate)}</td>
                              <td className="px-3 py-3 text-right text-blue-700">{formatCurrency(tlData.ownSales.totalOrderCommission)}</td>
                              <td className="px-3 py-3 text-center">{tlData.ownSales.totalUpsells || 0}</td>
                              <td className="px-3 py-3 text-center">{formatCurrency(tlData.ownSales.upsellRate)}</td>
                              <td className="px-3 py-3 text-right text-green-700">{formatCurrency(tlData.ownSales.totalUpsellCommission)}</td>
                              <td className="px-3 py-3 text-right text-orange-700">{formatCurrency(tlData.ownSales.totalCommission)}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {!tlData && !tlLoading && (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
                Select a team leader and month, then click Generate to view the breakdown.
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
