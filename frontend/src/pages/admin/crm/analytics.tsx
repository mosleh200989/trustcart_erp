import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users, Target, Calendar, Award, Activity, Filter } from 'lucide-react';
import AdminLayout from '@/layouts/AdminLayout';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [dealStats, setDealStats] = useState<any>(null);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      // Fetch all analytics data
      const [dealsRes, activitiesRes, tasksRes, pipelineRes] = await Promise.all([
        fetch('http://localhost:3001/api/crm/deals/pipeline-stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/crm/activities/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/crm/tasks/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/crm/deals/pipeline-stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // Parse responses safely
      const deals = dealsRes.ok ? await dealsRes.json() : null;
      const activities = activitiesRes.ok ? await activitiesRes.json() : null;
      const tasks = tasksRes.ok ? await tasksRes.json() : null;

      setDealStats(deals);
      setActivityStats(activities);
      setTaskStats(tasks);

      // Mock pipeline data (replace with real API data)
      setPipelineData([
        { name: 'New Lead', value: 45000, deals: 15 },
        { name: 'Contacted', value: 72000, deals: 12 },
        { name: 'Qualified', value: 108000, deals: 9 },
        { name: 'Proposal', value: 156000, deals: 6 },
        { name: 'Negotiation', value: 240000, deals: 4 },
      ]);

      // Mock revenue data
      setRevenueData([
        { month: 'Jan', revenue: 45000, deals: 8 },
        { month: 'Feb', revenue: 52000, deals: 10 },
        { month: 'Mar', revenue: 48000, deals: 9 },
        { month: 'Apr', revenue: 61000, deals: 12 },
        { month: 'May', revenue: 75000, deals: 14 },
        { month: 'Jun', revenue: 88000, deals: 16 },
      ]);

      // Mock activity data
      setActivityData([
        { type: 'Calls', count: 145 },
        { type: 'Emails', count: 287 },
        { type: 'Meetings', count: 64 },
        { type: 'Follow-ups', count: 198 },
      ]);

      // Mock top performers
      setTopPerformers([
        { name: 'Sarah Johnson', deals: 24, revenue: 340000 },
        { name: 'Michael Chen', deals: 19, revenue: 285000 },
        { name: 'Emily Davis', deals: 16, revenue: 240000 },
        { name: 'David Wilson', deals: 14, revenue: 210000 },
      ]);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CRM Analytics</h1>
              <p className="text-sm text-gray-600 mt-1">Comprehensive insights into your sales performance</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="365">Last Year</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Total Pipeline Value</h3>
                <DollarSign className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-3xl font-bold">$524,000</p>
              <p className="text-sm opacity-80 mt-2">+12.5% from last month</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Active Deals</h3>
                <Target className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-3xl font-bold">46</p>
              <p className="text-sm opacity-80 mt-2">8 deals closed this month</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Win Rate</h3>
                <Award className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-3xl font-bold">68%</p>
              <p className="text-sm opacity-80 mt-2">+5% improvement</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Avg Deal Size</h3>
                <Activity className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-3xl font-bold">$11,391</p>
              <p className="text-sm opacity-80 mt-2">Across all stages</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => `$${value.toLocaleString()}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pipeline by Stage */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline by Stage</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => `$${value.toLocaleString()}`}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Distribution */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={activityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {activityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Performers */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
              <div className="space-y-4">
                {topPerformers.map((performer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{performer.name}</p>
                        <p className="text-sm text-gray-600">{performer.deals} deals closed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${performer.revenue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task & Activity Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Task Summary</h3>
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <span className="text-sm font-medium text-yellow-700">Pending</span>
                  <span className="text-xl font-bold text-yellow-900">{taskStats?.pending || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-blue-700">In Progress</span>
                  <span className="text-xl font-bold text-blue-900">{taskStats?.inProgress || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm font-medium text-green-700">Completed</span>
                  <span className="text-xl font-bold text-green-900">{taskStats?.completed || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
                <Activity className="w-6 h-6 text-gray-400" />
              </div>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-3 py-2">
                  <p className="text-sm font-medium text-gray-900">Call with John Doe</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
                <div className="border-l-4 border-green-500 pl-3 py-2">
                  <p className="text-sm font-medium text-gray-900">Meeting scheduled</p>
                  <p className="text-xs text-gray-500">5 hours ago</p>
                </div>
                <div className="border-l-4 border-purple-500 pl-3 py-2">
                  <p className="text-sm font-medium text-gray-900">Email sent to client</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
                <div className="border-l-4 border-orange-500 pl-3 py-2">
                  <p className="text-sm font-medium text-gray-900">Quote generated</p>
                  <p className="text-xs text-gray-500">2 days ago</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
                <TrendingUp className="w-6 h-6 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Conversion Rate</span>
                    <span className="font-semibold text-gray-900">32%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '32%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Avg Response Time</span>
                    <span className="font-semibold text-gray-900">2.4 hrs</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Customer Satisfaction</span>
                    <span className="font-semibold text-gray-900">4.7/5</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '94%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Follow-up Rate</span>
                    <span className="font-semibold text-gray-900">89%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-600 h-2 rounded-full" style={{ width: '89%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Analytics;
