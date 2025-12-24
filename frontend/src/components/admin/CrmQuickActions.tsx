import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaPhone, FaFire, FaClock, FaRobot, FaChartLine, FaBolt, FaUsers } from 'react-icons/fa';
import apiClient from '@/services/api';

export default function CrmQuickActions() {
  const [stats, setStats] = useState({
    hotCustomers: 0,
    warmCustomers: 0,
    todayTasks: 0,
    activeCampaigns: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [hotRes, warmRes, campaignsRes] = await Promise.all([
        apiClient.get('/crm/automation/customers/hot?limit=1'),
        apiClient.get('/crm/automation/customers/warm?limit=1'),
        apiClient.get('/crm/automation/campaigns/active')
      ]);

      setStats({
        hotCustomers: Array.isArray(hotRes.data) ? hotRes.data.length : 0,
        warmCustomers: Array.isArray(warmRes.data) ? warmRes.data.length : 0,
        todayTasks: 0, // Will be loaded per agent
        activeCampaigns: Array.isArray(campaignsRes.data) ? campaignsRes.data.length : 0
      });
    } catch (error) {
      console.error('Failed to load CRM stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTasks = async () => {
    try {
      await apiClient.post('/crm/automation/tasks/generate');
      alert('Daily tasks generated successfully!');
      loadStats();
    } catch (error) {
      console.error('Failed to generate tasks:', error);
      alert('Failed to generate tasks');
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaRobot className="text-3xl text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-800">CRM Automation</h2>
        </div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaRobot className="text-3xl text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">CRM Automation</h2>
            <p className="text-sm text-gray-600">AI-powered customer intelligence</p>
          </div>
        </div>
        <button
          onClick={generateTasks}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold"
        >
          <FaBolt /> Generate Tasks
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-2">
            <FaFire className="text-red-500" />
            <span className="text-xs text-gray-600">Hot Customers</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.hotCustomers}+</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-2">
            <FaClock className="text-orange-500" />
            <span className="text-xs text-gray-600">Warm Leads</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.warmCustomers}+</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-2">
            <FaPhone className="text-blue-500" />
            <span className="text-xs text-gray-600">Today's Tasks</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.todayTasks}</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-2">
            <FaChartLine className="text-green-500" />
            <span className="text-xs text-gray-600">Active Campaigns</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.activeCampaigns}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/crm/agent-dashboard">
          <div className="bg-white rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaPhone className="text-2xl text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Agent Dashboard</h3>
                <p className="text-xs text-gray-600">View your daily call tasks</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/crm/automation">
          <div className="bg-white rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaRobot className="text-2xl text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Automation Settings</h3>
                <p className="text-xs text-gray-600">Manage rules & campaigns</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/crm/teams">
          <div className="bg-white rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-green-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaUsers className="text-2xl text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Manage Teams</h3>
                <p className="text-xs text-gray-600">Create teams and assign agents</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Feature Highlights */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🤖 Automation Features:</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Auto Call Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Product Recommendations</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Marketing Automation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Customer Intelligence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
