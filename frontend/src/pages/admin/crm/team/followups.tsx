import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

interface Customer {
  id: number | string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  priority?: string;
  status?: string;
  next_follow_up?: string;
}

interface PaginatedResponse {
  data: Customer[];
  total: number;
}

export default function CrmFollowupsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState('1'); // default to agent 1

  useEffect(() => {
    loadFollowups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const loadFollowups = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PaginatedResponse>(`/crm/team/agent/${agentId}/customers`, {
        params: { page: 1, limit: 50 }
      });
      setCustomers(res.data?.data ?? []);
    } catch (error) {
      console.error('Failed to load follow-ups', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const formatName = (c: Customer) => {
    if (c.name) return c.name;
    const full = [c.name, c.last_name].filter(Boolean).join(' ');
    return full || 'N/A';
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">CRM Follow-ups</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Agent ID:</span>
            <input
              type="number"
              className="border rounded-lg px-3 py-1 text-sm w-24"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value || '1')}
              min={1}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Assigned Customers</h2>
          {loading ? (
            <div className="text-gray-500">Loading follow-ups...</div>
          ) : customers.length === 0 ? (
            <div className="text-gray-500">No customers assigned to this agent.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Next Follow-up</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">#{c.id}</td>
                      <td className="px-4 py-2">{formatName(c)}</td>
                      <td className="px-4 py-2">{c.email || 'N/A'}</td>
                      <td className="px-4 py-2">{c.phone || 'N/A'}</td>
                      <td className="px-4 py-2 capitalize">{c.priority || '-'}</td>
                      <td className="px-4 py-2 capitalize">{c.status || '-'}</td>
                      <td className="px-4 py-2">{c.next_follow_up ? new Date(c.next_follow_up).toLocaleString() : '-'}</td>
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
