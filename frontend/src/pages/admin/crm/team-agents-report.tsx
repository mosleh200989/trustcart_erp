import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaPhone, FaUser, FaChartBar, FaHistory, FaFilter, FaSync } from 'react-icons/fa';

interface Agent {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  teamId: number | null;
  activities: {
    total: number;
    calls: number;
    byType: any[];
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    byStatus: any[];
  };
  telephony: {
    totalCalls: number;
    completedCalls: number;
    failedCalls: number;
    totalTalkTime: number;
    avgCallDuration: number;
  };
  customers: {
    totalAssigned: number;
    converted: number;
  };
}

interface TeamReport {
  dateRange: { from: string; to: string };
  summary: {
    totalAgents: number;
    totalActivities: number;
    totalCalls: number;
    completedCalls: number;
    totalTasks: number;
    completedTasks: number;
    totalCustomersAssigned: number;
  };
  agents: Agent[];
}

interface AgentDetail {
  agent: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: string;
  };
  dateRange: { from: string; to: string };
  activityStats: any[];
  taskStats: any[];
  telephonyStats: any;
  customerStats: any;
  dailyBreakdown: any[];
}

interface Team {
  id: number;
  name: string;
  code: string;
  memberCount: number;
}

export default function TeamAgentsReportPage() {
  const [report, setReport] = useState<TeamReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [agentDetail, setAgentDetail] = useState<AgentDetail | null>(null);
  const [agentDetailLoading, setAgentDetailLoading] = useState(false);
  
  // Teams and filter states
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | 'all'>('all');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<number | 'all'>('all');
  
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadTeams();
    loadReport();
  }, []);

  const loadTeams = async () => {
    try {
      const res = await apiClient.get('/crm/team/teams');
      setTeams(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setTeams([]);
    }
  };

  // Get filtered agents based on team and agent selection
  const getFilteredAgents = (): Agent[] => {
    if (!report) return [];
    let agents = report.agents;
    
    // Filter by team
    if (selectedTeamId !== 'all') {
      agents = agents.filter(a => a.teamId === selectedTeamId);
    }
    
    // Filter by specific agent
    if (selectedAgentFilter !== 'all') {
      agents = agents.filter(a => a.id === selectedAgentFilter);
    }
    
    return agents;
  };

  // Get agents available in selected team (for agent dropdown)
  const getAgentsForTeam = (): Agent[] => {
    if (!report) return [];
    if (selectedTeamId === 'all') return report.agents;
    return report.agents.filter(a => a.teamId === selectedTeamId);
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/crm/team/agents/report', {
        params: { from: dateFrom, to: dateTo },
      });
      setReport(res.data);
    } catch (error) {
      console.error('Failed to load team agents report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentDetail = async (agentId: number) => {
    try {
      setAgentDetailLoading(true);
      setSelectedAgent(agentId);
      const res = await apiClient.get(`/crm/team/agents/${agentId}/report`, {
        params: { from: dateFrom, to: dateTo },
      });
      setAgentDetail(res.data);
    } catch (error) {
      console.error('Failed to load agent detail:', error);
    } finally {
      setAgentDetailLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Team Agents Report</h1>
            <p className="text-gray-600 mt-1">View your team agents' full history, call statistics, and performance</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedAgent(null);
                setAgentDetail(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                !selectedAgent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={loadReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold disabled:opacity-50"
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-4">
          <FaFilter className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Date Range:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <button
            onClick={loadReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Apply Filter
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading report...</div>
        ) : !report ? (
          <div className="text-center py-12 text-gray-500">Failed to load report</div>
        ) : (
          <>
            {/* Summary Cards */}
            {!selectedAgent && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-gray-600 text-sm">Total Agents</div>
                  <div className="text-2xl font-bold text-blue-600">{report.summary.totalAgents}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-gray-600 text-sm">Total Activities</div>
                  <div className="text-2xl font-bold text-purple-600">{report.summary.totalActivities}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-gray-600 text-sm">Total Calls</div>
                  <div className="text-2xl font-bold text-green-600">{report.summary.totalCalls}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-gray-600 text-sm">Completed Calls</div>
                  <div className="text-2xl font-bold text-teal-600">{report.summary.completedCalls}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-gray-600 text-sm">Total Tasks</div>
                  <div className="text-2xl font-bold text-orange-600">{report.summary.totalTasks}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-gray-600 text-sm">Completed Tasks</div>
                  <div className="text-2xl font-bold text-green-600">{report.summary.completedTasks}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-gray-600 text-sm">Customers Assigned</div>
                  <div className="text-2xl font-bold text-indigo-600">{report.summary.totalCustomersAssigned}</div>
                </div>
              </div>
            )}

            {/* Agent Detail View */}
            {selectedAgent && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Agent Detail</h2>
                  <button
                    onClick={() => {
                      setSelectedAgent(null);
                      setAgentDetail(null);
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ← Back to Overview
                  </button>
                </div>
                {agentDetailLoading ? (
                  <div className="p-8 text-center text-gray-500">Loading agent details...</div>
                ) : agentDetail ? (
                  <div className="p-4 space-y-6">
                    {/* Agent Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <FaUser className="text-blue-600 text-2xl" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{agentDetail.agent.name}</h3>
                        <p className="text-gray-600">{agentDetail.agent.email}</p>
                        {agentDetail.agent.phone && (
                          <p className="text-gray-500 text-sm">{agentDetail.agent.phone}</p>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(agentDetail.agent.status)}`}>
                          {agentDetail.agent.status}
                        </span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Activity Stats */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <FaChartBar className="text-purple-600" /> Activity Stats
                        </h4>
                        <div className="space-y-2">
                          {agentDetail.activityStats.length > 0 ? (
                            agentDetail.activityStats.map((stat: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="capitalize">{stat.type}</span>
                                <span className="font-semibold">{stat.count}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">No activities in this period</p>
                          )}
                        </div>
                      </div>

                      {/* Task Stats */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <FaHistory className="text-orange-600" /> Task Stats
                        </h4>
                        <div className="space-y-2">
                          {agentDetail.taskStats.length > 0 ? (
                            agentDetail.taskStats.map((stat: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="capitalize">{stat.status}</span>
                                <span className="font-semibold">{stat.count}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">No tasks in this period</p>
                          )}
                        </div>
                      </div>

                      {/* Telephony Stats */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <FaPhone className="text-green-600" /> Call Stats
                        </h4>
                        {agentDetail.telephonyStats ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Total Calls</span>
                              <span className="font-semibold">{agentDetail.telephonyStats.summary?.total_calls || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Completed</span>
                              <span className="font-semibold text-green-600">{agentDetail.telephonyStats.summary?.completed_calls || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Failed</span>
                              <span className="font-semibold text-red-600">{agentDetail.telephonyStats.summary?.failed_calls || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Talk Time</span>
                              <span className="font-semibold">{formatDuration(agentDetail.telephonyStats.summary?.total_talk_time || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Avg Call Duration</span>
                              <span className="font-semibold">{formatDuration(Math.round(agentDetail.telephonyStats.summary?.avg_call_duration || 0))}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No call data available</p>
                        )}
                      </div>
                    </div>

                    {/* Customer Stats */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <FaUser className="text-indigo-600" /> Customer Stats
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-indigo-600">{agentDetail.customerStats?.total_assigned || 0}</div>
                          <div className="text-sm text-gray-600">Total Assigned</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{agentDetail.customerStats?.converted || 0}</div>
                          <div className="text-sm text-gray-600">Converted</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">{agentDetail.customerStats?.escalated || 0}</div>
                          <div className="text-sm text-gray-600">Escalated</div>
                        </div>
                      </div>
                    </div>

                    {/* Daily Breakdown */}
                    {agentDetail.dailyBreakdown && agentDetail.dailyBreakdown.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Daily Activity Breakdown</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-2">Date</th>
                                <th className="text-left py-2 px-2">Type</th>
                                <th className="text-right py-2 px-2">Count</th>
                              </tr>
                            </thead>
                            <tbody>
                              {agentDetail.dailyBreakdown.slice(0, 20).map((row: any, idx: number) => (
                                <tr key={idx} className="border-b">
                                  <td className="py-2 px-2">{row.date}</td>
                                  <td className="py-2 px-2 capitalize">{row.type}</td>
                                  <td className="py-2 px-2 text-right font-semibold">{row.count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">No detail available</div>
                )}
              </div>
            )}

            {/* Agents Table */}
            {!selectedAgent && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-gray-800">Team Agents ({getFilteredAgents().length})</h2>
                    
                    {/* Team and Agent Filters */}
                    <div className="flex items-center gap-4">
                      {/* Team Dropdown */}
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 font-medium">Team:</label>
                        <select
                          value={selectedTeamId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedTeamId(val === 'all' ? 'all' : Number(val));
                            setSelectedAgentFilter('all'); // Reset agent filter when team changes
                          }}
                          className="border rounded-lg px-3 py-1.5 text-sm min-w-[150px]"
                        >
                          <option value="all">All Teams</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name} ({team.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Agent Dropdown */}
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 font-medium">Agent:</label>
                        <select
                          value={selectedAgentFilter}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedAgentFilter(val === 'all' ? 'all' : Number(val));
                          }}
                          className="border rounded-lg px-3 py-1.5 text-sm min-w-[180px]"
                        >
                          <option value="all">All Agents</option>
                          {getAgentsForTeam().map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                {getFilteredAgents().length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No agents found with current filters</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Activities</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Calls</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Talk Time</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tasks</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Customers</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getFilteredAgents().map((agent) => (
                          <tr key={agent.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <FaUser className="text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{agent.name}</div>
                                  <div className="text-sm text-gray-500">{agent.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(agent.status)}`}>
                                {agent.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="text-lg font-semibold text-purple-600">{agent.activities.total}</div>
                              <div className="text-xs text-gray-500">{agent.activities.calls} calls</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="text-lg font-semibold text-green-600">{agent.telephony.totalCalls}</div>
                              <div className="text-xs text-gray-500">
                                {agent.telephony.completedCalls} completed
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="text-sm font-semibold text-gray-700">
                                {formatDuration(agent.telephony.totalTalkTime)}
                              </div>
                              <div className="text-xs text-gray-500">
                                avg: {formatDuration(Math.round(agent.telephony.avgCallDuration))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="text-lg font-semibold text-orange-600">{agent.tasks.total}</div>
                              <div className="text-xs text-gray-500">
                                {agent.tasks.completed} done, {agent.tasks.pending} pending
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="text-lg font-semibold text-indigo-600">{agent.customers.totalAssigned}</div>
                              <div className="text-xs text-gray-500">{agent.customers.converted} converted</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => loadAgentDetail(agent.id)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
