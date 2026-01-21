import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';

const SalesTeamLeaderDashboard = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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

  const handleGenerateCalls = async () => {
    try {
      setGenerating(true);
      await api.post('/crm/team/ops/generate-calls', {});
      await fetchDashboard();
      alert('Daily auto calls generated');
    } catch (error) {
      console.error('Failed to generate calls', error);
      alert('Failed to generate calls');
    } finally {
      setGenerating(false);
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
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h1 className="text-3xl font-bold">Sales Team Leader Dashboard</h1>

            <button
              onClick={handleGenerateCalls}
              disabled={generating}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 w-full md:w-auto"
            >
              {generating ? 'Generating...' : 'Generate Today\'s Auto Calls'}
            </button>
          </div>

          {/* Quick Actions (moved from bottom) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <a
              href="/admin/crm/leads"
              className="bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700"
            >
              📊 View All Leads
            </a>
            <a
              href="/admin/crm/team/assign"
              className="bg-green-600 text-white text-center py-3 rounded-lg hover:bg-green-700"
            >
              🎯 Assign Leads
            </a>
            <a
              href="/admin/crm/team/followups"
              className="bg-yellow-600 text-white text-center py-3 rounded-lg hover:bg-yellow-700"
            >
              📞 Track Follow-ups
            </a>
            <a
              href="/admin/crm/reports"
              className="bg-purple-600 text-white text-center py-3 rounded-lg hover:bg-purple-700"
            >
              📈 View Reports
            </a>
            <a
              href="/admin/crm/teams"
              className="bg-pink-600 text-white text-center py-3 rounded-lg hover:bg-pink-700"
            >
              👥 Manage Teams
            </a>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-2">Total Customers (TL Coverage)</div>
            <div className="text-3xl font-bold text-blue-600">{dashboard?.overview.totalCustomers}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-2">Repeat Rate</div>
            <div className="text-3xl font-bold text-green-600">{dashboard?.overview.repeatRate}%</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-2">VIP/Permanent Active (30d)</div>
            <div className="text-3xl font-bold text-purple-600">{dashboard?.overview.vipRetention30}%</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-2">Pending From Previous Days</div>
            <div className="text-3xl font-bold text-red-600">{dashboard?.overview.pendingFromPreviousDays}</div>
          </div>
        </div>

        {/* Segmentation */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Purchase Stage Segmentation</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>New (1st order)</span><span className="font-semibold">{dashboard?.segmentation?.purchaseStageCounts?.new ?? 0}</span></div>
              <div className="flex justify-between"><span>Repeat-2</span><span className="font-semibold">{dashboard?.segmentation?.purchaseStageCounts?.repeat_2 ?? 0}</span></div>
              <div className="flex justify-between"><span>Repeat-3</span><span className="font-semibold">{dashboard?.segmentation?.purchaseStageCounts?.repeat_3 ?? 0}</span></div>
              <div className="flex justify-between"><span>Regular (4–7)</span><span className="font-semibold">{dashboard?.segmentation?.purchaseStageCounts?.regular ?? 0}</span></div>
              <div className="flex justify-between"><span>Permanent (8+)</span><span className="font-semibold">{dashboard?.segmentation?.purchaseStageCounts?.permanent ?? 0}</span></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Value Stage Segmentation</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Normal</span><span className="font-semibold">{dashboard?.segmentation?.valueStageCounts?.normal ?? 0}</span></div>
              <div className="flex justify-between"><span>Medium</span><span className="font-semibold">{dashboard?.segmentation?.valueStageCounts?.medium ?? 0}</span></div>
              <div className="flex justify-between"><span>VIP</span><span className="font-semibold">{dashboard?.segmentation?.valueStageCounts?.vip ?? 0}</span></div>
            </div>
          </div>
        </div>

        {/* Teams Overview */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Teams Overview</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Total Teams</span><span className="font-semibold">{dashboard?.teamPerformance.totalTeams}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Total Members</span><span className="font-semibold text-blue-600">{dashboard?.teamPerformance.totalMembers}</span></div>
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

        {/* Agent-wise Calls */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Agent-wise Calls (Today)</h2>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Agent ID</th>
                <th className="text-left py-3 px-4">Total</th>
                <th className="text-left py-3 px-4">Completed</th>
                <th className="text-left py-3 px-4">Failed</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard?.agentWiseCalls || []).map((row: any) => (
                <tr key={row.agent_id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{row.agent_id ?? 'Unassigned'}</td>
                  <td className="py-3 px-4">{row.total_today}</td>
                  <td className="py-3 px-4 text-green-600 font-semibold">{row.completed_today}</td>
                  <td className="py-3 px-4 text-red-600 font-semibold">{row.failed_today}</td>
                </tr>
              ))}
              {(dashboard?.agentWiseCalls || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-600">No tasks found for today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Scripts */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Call Script Playbook</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm mb-6">
            <div className="border rounded p-4">
              <div className="font-semibold mb-2">{dashboard?.scripts?.commonOpening?.title}</div>
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                {(dashboard?.scripts?.commonOpening?.lines || []).map((l: string, idx: number) => (
                  <li key={idx}>{l}</li>
                ))}
              </ul>
            </div>
            <div className="border rounded p-4">
              <div className="font-semibold mb-2">{dashboard?.scripts?.callEnding?.title}</div>
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                {(dashboard?.scripts?.callEnding?.lines || []).map((l: string, idx: number) => (
                  <li key={idx}>{l}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            {['A', 'B', 'C', 'D', 'E'].map((k) => (
              <div key={k} className="border rounded p-4">
                <div className="font-semibold mb-1">{dashboard?.scripts?.[k]?.title}</div>
                <div className="text-gray-600 mb-2">Goal: {dashboard?.scripts?.[k]?.goal}</div>
                <div className="text-gray-600 mb-2">Style: {(dashboard?.scripts?.[k]?.style || []).join(', ')}</div>
                <ul className="list-disc ml-5 space-y-1 text-gray-700">
                  {(dashboard?.scripts?.[k]?.script || []).map((l: string, idx: number) => (
                    <li key={idx}>{l}</li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="border rounded p-4">
              <div className="font-semibold mb-1">{dashboard?.scripts?.winBack?.title}</div>
              <div className="text-gray-600 mb-2">Goal: {dashboard?.scripts?.winBack?.goal}</div>
              <div className="text-gray-600 mb-2">Style: {(dashboard?.scripts?.winBack?.style || []).join(', ')}</div>
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                {(dashboard?.scripts?.winBack?.script || []).map((l: string, idx: number) => (
                  <li key={idx}>{l}</li>
                ))}
              </ul>
            </div>
            <div className="border rounded p-4">
              <div className="font-semibold mb-1">{dashboard?.scripts?.permanentDeclaration?.title}</div>
              <div className="text-gray-600 mb-2">Goal: {dashboard?.scripts?.permanentDeclaration?.goal}</div>
              <div className="text-gray-600 mb-2">Style: {(dashboard?.scripts?.permanentDeclaration?.style || []).join(', ')}</div>
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                {(dashboard?.scripts?.permanentDeclaration?.script || []).map((l: string, idx: number) => (
                  <li key={idx}>{l}</li>
                ))}
              </ul>
            </div>
            <div className="border rounded p-4">
              <div className="font-semibold mb-2">{dashboard?.scripts?.objectionHandling?.title}</div>
              <div className="space-y-3">
                {(dashboard?.scripts?.objectionHandling?.items || []).map((it: any, idx: number) => (
                  <div key={idx}>
                    <div className="font-medium">❓ {it.objection}</div>
                    <div className="text-gray-700">{it.reply}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Universal flow: {(dashboard?.scripts?.universal?.flow || []).join(' → ')}
          </div>
        </div>

        {/* Agent Training Role Plays */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Agent Training (Role Play)</h2>
          <div className="text-sm text-gray-600 mb-4">
            {dashboard?.trainingRolePlays?.title} — {dashboard?.trainingRolePlays?.format}
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            {(dashboard?.trainingRolePlays?.rolePlays || []).map((rp: any) => (
              <div key={rp.id} className="border rounded p-4">
                <div className="font-semibold mb-2">{rp.title}</div>
                <div className="text-gray-600 mb-2">
                  Training Goal: {(rp.trainingGoal || []).join(' • ')}
                </div>
                <div className="space-y-2">
                  {(rp.script || []).map((line: any, idx: number) => (
                    <div key={idx}>
                      <span className="font-medium">{line.speaker}: </span>
                      <span className="text-gray-700">{line.line}</span>
                    </div>
                  ))}
                </div>
                {(rp.notes || []).length > 0 && (
                  <div className="mt-3 text-gray-600">
                    Notes: {(rp.notes || []).join(' • ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm mt-6">
            <div className="border rounded p-4">
              <div className="font-semibold mb-2">Common Training Mistakes</div>
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                {(dashboard?.trainingRolePlays?.commonMistakes || []).map((m: string, idx: number) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
            <div className="border rounded p-4">
              <div className="font-semibold mb-2">Golden Rules</div>
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                {(dashboard?.trainingRolePlays?.goldenRules || []).map((m: string, idx: number) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
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
      </div>
    </AdminLayout>
  );
};

export default SalesTeamLeaderDashboard;
