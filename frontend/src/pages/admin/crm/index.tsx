import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import Link from 'next/link';
import { FaPlus, FaUserTie, FaProjectDiagram, FaTasks, FaUsers, FaEnvelope, FaCogs, FaFileInvoice, FaCheckCircle, FaChartLine, FaUserFriends } from 'react-icons/fa';
import CrmQuickActions from '@/components/admin/CrmQuickActions';

export default function AdminCRM() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

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

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaUserTie className="text-pink-600" />
            CRM - Customer Relationship
          </h1>
          <button className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg flex items-center gap-2">
            <FaPlus /> New Lead
          </button>
        </div>

        {/* CRM Automation Quick Actions */}
        <CrmQuickActions />

        {/* Phase 1 Features Navigation */}
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
