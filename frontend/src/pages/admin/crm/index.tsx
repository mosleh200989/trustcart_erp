import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import Link from 'next/link';
import { FaPlus, FaUserTie, FaUsers, FaPhone, FaFire, FaThermometerHalf, FaClipboardList, FaExclamationTriangle } from 'react-icons/fa';
// Commented out icons for Phase 1 features (keeping for future use):
// import { FaProjectDiagram, FaTasks, FaEnvelope, FaCogs, FaFileInvoice, FaCheckCircle, FaChartLine, FaUserFriends } from 'react-icons/fa';

interface DashboardStats {
  totalCustomers: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number; // sleep/dead leads
  todayActiveTasks: number;
  todayTotalCalls: number;
  todayCompletedCalls: number;
  overdueTasks: number;
  recentLeads: number;
}

export default function AdminCRM() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    loadLeads();
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await apiClient.get('/crm/analytics/dashboard');
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const response = await apiClient.get('/crm');
      setLeads(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  /* PHASE 1 FEATURES - COMMENTED OUT FOR NOW
  const phase1Features = [
    {
      title: 'Pipeline Settings',
      description: 'Manage custom pipelines and deal stages',
      icon: FaProjectDiagram,
      color: 'bg-blue-500',
      href: '/admin/crm/pipeline-settings'
    },
    {
      title: 'Activity Templates',
      description: 'Create reusable activity templates',
      icon: FaTasks,
      color: 'bg-green-500',
      href: '/admin/crm/activity-templates'
    },
    {
      title: 'Customer Segments',
      description: 'Segment customers with dynamic criteria',
      icon: FaUsers,
      color: 'bg-purple-500',
      href: '/admin/crm/segments'
    },
    {
      title: 'Email Templates',
      description: 'Design and manage email templates',
      icon: FaEnvelope,
      color: 'bg-red-500',
      href: '/admin/crm/email-templates'
    },
    {
      title: 'Workflows',
      description: 'Automate CRM workflows',
      icon: FaCogs,
      color: 'bg-yellow-500',
      href: '/admin/crm/workflows'
    },
    {
      title: 'Quote Templates',
      description: 'Create professional quote templates',
      icon: FaFileInvoice,
      color: 'bg-indigo-500',
      href: '/admin/crm/quote-templates'
    },
    {
      title: 'Quote Approvals',
      description: 'Manage quote approval workflow',
      icon: FaCheckCircle,
      color: 'bg-teal-500',
      href: '/admin/crm/quote-approvals'
    },
    {
      title: 'Sales Forecasts',
      description: 'View sales forecasts and quotas',
      icon: FaChartLine,
      color: 'bg-orange-500',
      href: '/admin/crm/forecasts'
    },
    {
      title: 'Customers',
      description: 'Manage customer records',
      icon: FaUserFriends,
      color: 'bg-pink-500',
      href: '/admin/crm/customers'
    }
  ];
  END PHASE 1 FEATURES */

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaUserTie className="text-pink-600" />
            CRM Dashboard
          </h1>
          <Link 
            href="/admin/crm/customers"
            className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <FaUsers /> View Customers
          </Link>
        </div>

        {/* Dashboard Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Customers */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Customers</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {statsLoading ? '...' : (dashboardStats?.totalCustomers || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <FaUsers className="text-blue-500 text-2xl" />
              </div>
            </div>
          </div>

          {/* Hot Leads */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Hot Leads</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {statsLoading ? '...' : (dashboardStats?.hotLeads || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <FaFire className="text-red-500 text-2xl" />
              </div>
            </div>
          </div>

          {/* Warm Leads */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Warm Leads</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {statsLoading ? '...' : (dashboardStats?.warmLeads || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <FaThermometerHalf className="text-orange-500 text-2xl" />
              </div>
            </div>
          </div>

          {/* Today's Active Tasks */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Today's Active Tasks</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {statsLoading ? '...' : (dashboardStats?.todayActiveTasks || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <FaClipboardList className="text-purple-500 text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Total Calls */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Today's Total Calls</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {statsLoading ? '...' : (dashboardStats?.todayTotalCalls || 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  {statsLoading ? '' : `${dashboardStats?.todayCompletedCalls || 0} completed`}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FaPhone className="text-green-500 text-2xl" />
              </div>
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Overdue Tasks</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {statsLoading ? '...' : (dashboardStats?.overdueTasks || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <FaExclamationTriangle className="text-yellow-500 text-2xl" />
              </div>
            </div>
          </div>

          {/* Sleep/Dead Leads */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-cyan-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Sleep/Dead Leads</p>
                <p className="text-3xl font-bold text-cyan-600 mt-1">
                  {statsLoading ? '...' : (dashboardStats?.coldLeads || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-cyan-100 p-3 rounded-full">
                <FaUsers className="text-cyan-500 text-2xl" />
              </div>
            </div>
          </div>

          {/* Recent Leads (7 days) */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-pink-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">New Leads (7 days)</p>
                <p className="text-3xl font-bold text-pink-600 mt-1">
                  {statsLoading ? '...' : (dashboardStats?.recentLeads || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-pink-100 p-3 rounded-full">
                <FaPlus className="text-pink-500 text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Manage Teams */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Team Management</h2>
            <Link href="/admin/crm/teams">
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                <FaUsers /> Manage Teams
              </button>
            </Link>
          </div>
          <p className="text-gray-600 mt-2">Create teams, assign agents, and manage your sales workforce</p>
        </div>

        {/* PHASE 1 FEATURES NAVIGATION - COMMENTED OUT 
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">CRM Phase 1 Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {phase1Features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.href} href={feature.href}>
                  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group">
                    <div className="flex items-start gap-4">
                      <div className={`${feature.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                        <Icon className="text-2xl" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 group-hover:text-pink-600 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        END PHASE 1 FEATURES NAVIGATION */}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Leads</h2>
          {loading ? (
            <div className="text-center text-gray-500">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="text-center text-gray-500">No leads found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">#{lead.id}</td>
                      <td className="px-6 py-4">{lead.name || 'N/A'}</td>
                      <td className="px-6 py-4">{lead.email || 'N/A'}</td>
                      <td className="px-6 py-4">{lead.phone || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">
                          {lead.status || 'New'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
