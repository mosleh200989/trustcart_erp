import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';

const SalesTeamLeaderDashboard = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/crm/team/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">Loading dashboard...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Sales Team Leader Dashboard</h1>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-2">Total Leads</div>
            <div className="text-3xl font-bold text-blue-600">{dashboard?.overview.totalLeads}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-2">Active Leads</div>
            <div className="text-3xl font-bold text-green-600">{dashboard?.overview.activeLeads}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-2">Closed Deals</div>
            <div className="text-3xl font-bold text-purple-600">{dashboard?.overview.closedDeals}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-2">Lost Deals</div>
            <div className="text-3xl font-bold text-red-600">{dashboard?.overview.lostDeals}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-2">Total Revenue</div>
            <div className="text-2xl font-bold text-indigo-600">৳{dashboard?.overview.revenue.toLocaleString()}</div>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Lead Priority Breakdown</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-red-500 rounded mr-3"></span>
                  <span>🔥 Hot Leads</span>
                </div>
                <span className="font-bold text-xl">{dashboard?.priorityBreakdown.hot}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-yellow-500 rounded mr-3"></span>
                  <span>⚡ Warm Leads</span>
                </div>
                <span className="font-bold text-xl">{dashboard?.priorityBreakdown.warm}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-blue-500 rounded mr-3"></span>
                  <span>❄️ Cold Leads</span>
                </div>
                <span className="font-bold text-xl">{dashboard?.priorityBreakdown.cold}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Teams Overview</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Teams</span>
                <span className="font-semibold">{dashboard?.teamPerformance.totalTeams}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Members</span>
                <span className="font-semibold text-blue-600">{dashboard?.teamPerformance.totalMembers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Teams and Members */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Teams &amp; Members</h2>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Team Name</th>
                <th className="text-left py-3 px-4">Members</th>
                <th className="text-left py-3 px-4">Total Leads</th>
                <th className="text-left py-3 px-4">Converted</th>
                <th className="text-left py-3 px-4">Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.teamPerformance.teams?.map((team: any) => (
                <tr key={team.teamId} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{team.teamName}</td>
                  <td className="py-3 px-4">{team.memberCount}</td>
                  <td className="py-3 px-4">{team.totalLeads}</td>
                  <td className="py-3 px-4 text-green-600 font-semibold">{team.convertedLeads}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
                      {team.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Escalations */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Recent Escalations</h2>
          {dashboard?.recentEscalations?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recentEscalations.map((escalation: any) => (
                <div key={escalation.id} className="border-l-4 border-red-500 pl-4 py-2">
                  <div className="font-semibold">{escalation.name}</div>
                  <div className="text-sm text-gray-600">{escalation.email}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Escalated: {new Date(escalation.escalated_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No recent escalations</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-5 gap-4">
          <a
            href="/admin/crm/leads"
            className="bg-blue-600 text-white text-center py-4 rounded-lg hover:bg-blue-700"
          >
            📊 View All Leads
          </a>
          <a
            href="/admin/crm/team/assign"
            className="bg-green-600 text-white text-center py-4 rounded-lg hover:bg-green-700"
          >
            🎯 Assign Leads
          </a>
          <a
            href="/admin/crm/team/followups"
            className="bg-yellow-600 text-white text-center py-4 rounded-lg hover:bg-yellow-700"
          >
            📞 Track Follow-ups
          </a>
          <a
            href="/admin/crm/reports"
            className="bg-purple-600 text-white text-center py-4 rounded-lg hover:bg-purple-700"
          >
            📈 View Reports
          </a>
          <a
            href="/admin/crm/teams"
            className="bg-pink-600 text-white text-center py-4 rounded-lg hover:bg-pink-700"
          >
            👥 Manage Teams
          </a>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SalesTeamLeaderDashboard;
