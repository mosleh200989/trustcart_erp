import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

interface TeamPerformance {
  totalLeads: number;
  assignedLeads: number;
  unassignedLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  conversionRate: number;
  averageResponseTime: string;
  teamMembers: any[];
}

export default function CrmReportsPage() {
  const [performance, setPerformance] = useState<TeamPerformance | null>(null);
  const [leadAging, setLeadAging] = useState<any | null>(null);
  const [missedFollowups, setMissedFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const [perfRes, agingRes, missedRes] = await Promise.all([
        apiClient.get('/crm/team/performance'),
        apiClient.get('/crm/team/lead-aging'),
        apiClient.get('/crm/team/missed-followups')
      ]);
      setPerformance(perfRes.data);
      setLeadAging(agingRes.data);
      setMissedFollowups(Array.isArray(missedRes.data) ? missedRes.data : []);
    } catch (error) {
      console.error('Failed to load CRM reports', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">CRM Reports</h1>
          <button
            onClick={loadReports}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div className="text-gray-500">Loading reports...</div>
        )}

        {!loading && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Summary card */}
            <div className="bg-white rounded-lg shadow p-6 space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Team Summary</h2>
              {performance ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Total Leads</span>
                    <span className="font-semibold">{performance.totalLeads}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Assigned Leads</span>
                    <span className="font-semibold">{performance.assignedLeads}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Unassigned Leads</span>
                    <span className="font-semibold">{performance.unassignedLeads}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Hot / Warm / Cold</span>
                    <span className="font-semibold">
                      {performance.hotLeads} / {performance.warmLeads} / {performance.coldLeads}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Conversion Rate</span>
                    <span className="font-semibold">{performance.conversionRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg. Response Time</span>
                    <span className="font-semibold">{performance.averageResponseTime}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">No performance data.</p>
              )}
            </div>

            {/* Lead aging */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Lead Aging</h2>
              {leadAging ? (
                <div className="space-y-2 text-sm">
                  {Object.entries(leadAging).map(([bucket, value]) => (
                    <div key={bucket} className="flex justify-between">
                      <span>{bucket}</span>
                      <span className="font-semibold">{value as any}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No aging data.</p>
              )}
            </div>

            {/* Missed follow-ups */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Missed Follow-ups</h2>
              {missedFollowups.length === 0 ? (
                <p className="text-sm text-gray-500">No missed follow-ups. Great job!</p>
              ) : (
                <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
                  {missedFollowups.map((item, idx) => (
                    <li key={idx} className="border-b last:border-b-0 pb-2">
                      <div className="font-semibold">{item.customer_name || item.customer_id}</div>
                      <div className="text-xs text-gray-500">Last contact: {item.last_contact_date}</div>
                      <div className="text-xs text-red-600">Missed by: {item.days_overdue} days</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
