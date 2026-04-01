import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';

interface TierCounts {
  silver: number;
  gold: number;
  platinum: number;
  vip: number;
  noTier: number;
}

interface TeamLeaderStat {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  totalCustomers: number;
  leads: number;
  converted: number;
  conversionRate: number;
  teamsCount: number;
  agentsCount: number;
  tiers: TierCounts;
  escalated: number;
  todayTasks: {
    total_tasks: number;
    completed: number;
    failed: number;
    pending: number;
  };
}

interface DashboardData {
  overview: {
    totalCustomers: number;
    totalLeads: number;
    totalConverted: number;
    conversionRate: number;
    unassignedLeads: number;
    escalatedCount: number;
    totalTeamLeaders: number;
  };
  teamLeaderStats: TeamLeaderStat[];
  recentEscalations: any[];
}

const SalesManagerDashboard = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTL, setExpandedTL] = useState<number | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get('/crm/sales-manager/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const getTierBadge = (tier: string) => {
    const map: Record<string, string> = {
      silver: 'bg-gray-100 text-gray-700',
      gold: 'bg-amber-100 text-amber-700',
      platinum: 'bg-indigo-100 text-indigo-700',
      vip: 'bg-purple-100 text-purple-700',
    };
    return map[tier] || 'bg-gray-50 text-gray-500';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          <span className="ml-4 text-lg text-gray-600">Loading Sales Manager Dashboard…</span>
        </div>
      </AdminLayout>
    );
  }

  const overview = dashboard?.overview;
  const tlStats = dashboard?.teamLeaderStats || [];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8 max-w-[1600px]">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Manager Dashboard</h1>
            <p className="text-gray-500 mt-1">Monitor team leaders, track performance, and assign leads</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/admin/crm/sales-manager-leads"
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium inline-flex items-center"
            >
              Assign Leads to Team Leaders
            </a>
            <button
              onClick={() => { setLoading(true); fetchDashboard(); }}
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPICard label="Total Customers" value={overview?.totalCustomers ?? 0} color="bg-gradient-to-br from-blue-500 to-blue-600" />
          <KPICard label="Active Leads" value={overview?.totalLeads ?? 0} color="bg-gradient-to-br from-amber-500 to-amber-600" />
          <KPICard label="Unassigned" value={overview?.unassignedLeads ?? 0} color="bg-gradient-to-br from-red-500 to-red-600" />
          <KPICard label="Team Leaders" value={overview?.totalTeamLeaders ?? 0} color="bg-gradient-to-br from-purple-500 to-purple-600" />
        </div>

        {/* Team Leaders Performance Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Team Leader Performance</h2>
            <p className="text-sm text-gray-500 mt-1">Click on a row to see detailed breakdown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Team Leader</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teams</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agents</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customers</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Silver</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gold</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Platinum</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">VIP</th>
                </tr>
              </thead>
              <tbody>
                {tlStats.map(tl => (
                  <React.Fragment key={tl.id}>
                    <tr
                      className="border-b border-gray-50 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedTL(expandedTL === tl.id ? null : tl.id)}
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                            {tl.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{tl.name}</div>
                            <div className="text-xs text-gray-500">{tl.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4 px-3 font-medium text-gray-700">{tl.teamsCount}</td>
                      <td className="text-center py-4 px-3 font-medium text-gray-700">{tl.agentsCount}</td>
                      <td className="text-center py-4 px-3 font-semibold text-blue-600">{tl.totalCustomers}</td>
                      <td className="text-center py-4 px-3">
                        <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold ${getTierBadge('silver')}`}>
                          {tl.tiers?.silver ?? 0}
                        </span>
                      </td>
                      <td className="text-center py-4 px-3">
                        <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold ${getTierBadge('gold')}`}>
                          {tl.tiers?.gold ?? 0}
                        </span>
                      </td>
                      <td className="text-center py-4 px-3">
                        <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold ${getTierBadge('platinum')}`}>
                          {tl.tiers?.platinum ?? 0}
                        </span>
                      </td>
                      <td className="text-center py-4 px-3">
                        <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold ${getTierBadge('vip')}`}>
                          {tl.tiers?.vip ?? 0}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {expandedTL === tl.id && (
                      <tr>
                        <td colSpan={8} className="bg-indigo-50/30 px-6 py-5 border-b border-gray-100">
                          <div className="grid md:grid-cols-3 gap-5">
                            {/* Today's Task Summary */}
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Today&apos;s Call Tasks</h4>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Total</span>
                                  <span className="font-semibold">{tl.todayTasks.total_tasks}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Completed</span>
                                  <span className="font-semibold text-emerald-600">{tl.todayTasks.completed}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Pending</span>
                                  <span className="font-semibold text-amber-600">{tl.todayTasks.pending}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Failed</span>
                                  <span className="font-semibold text-red-600">{tl.todayTasks.failed}</span>
                                </div>
                              </div>
                              {tl.todayTasks.total_tasks > 0 && (
                                <div className="mt-3">
                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                      className="bg-emerald-500 h-2 rounded-full transition-all"
                                      style={{ width: `${Math.round((tl.todayTasks.completed / tl.todayTasks.total_tasks) * 100)}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1 text-right">
                                    {Math.round((tl.todayTasks.completed / tl.todayTasks.total_tasks) * 100)}% completed
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Tier Breakdown */}
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Customer Tier Breakdown</h4>
                              <div className="space-y-2 text-sm">
                                {[
                                  { label: 'Silver', value: tl.tiers?.silver ?? 0, tier: 'silver' },
                                  { label: 'Gold', value: tl.tiers?.gold ?? 0, tier: 'gold' },
                                  { label: 'Platinum', value: tl.tiers?.platinum ?? 0, tier: 'platinum' },
                                  { label: 'VIP', value: tl.tiers?.vip ?? 0, tier: 'vip' },
                                  { label: 'No Tier', value: tl.tiers?.noTier ?? 0, tier: '' },
                                ].map(t => (
                                  <div key={t.label} className="flex justify-between">
                                    <span className="text-gray-500">{t.label}</span>
                                    <span className={`font-semibold ${t.tier ? '' : 'text-gray-400'}`}>{t.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h4>
                              <div className="space-y-2">
                                <a
                                  href={`/admin/crm/leads?supervisor=${tl.id}`}
                                  className="block w-full text-center py-2 px-3 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-100 transition-colors"
                                >
                                  View All Leads
                                </a>
                                <a
                                  href="/admin/crm/teams"
                                  className="block w-full text-center py-2 px-3 bg-gray-50 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
                                >
                                  Manage Teams
                                </a>
                                <a
                                  href="/admin/crm/team-agents-report"
                                  className="block w-full text-center py-2 px-3 bg-gray-50 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
                                >
                                  View Agent Reports
                                </a>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {tlStats.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      No team leaders found. Create team leaders from the Users page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </AdminLayout>
  );
};

/* ─── KPI Card Component ────────────────────────────── */
const KPICard = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div className={`${color} rounded-xl p-4 text-white shadow-sm`}>
    <div className="text-xs font-medium opacity-80 mb-1">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

export default SalesManagerDashboard;
