import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

interface LeadCustomer {
  id: number | string;
  name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  priority?: string;
  status?: string;
  assigned_to?: number | null;
}

interface PaginatedResponse {
  data: LeadCustomer[];
  total: number;
}

export default function CrmLeadsPage() {
  const toast = useToast();
  const [leads, setLeads] = useState<LeadCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<number | string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [priority, setPriority] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const pageSize = 20;

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, priority, status]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: pageSize };
      if (priority) params.priority = priority;
      if (status) params.status = status;

      const res = await apiClient.get<PaginatedResponse>('/crm/team/leads', { params });
      setLeads(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (error) {
      console.error('Failed to load leads', error);
      setLeads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatName = (lead: LeadCustomer) => {
    if (lead.name) return lead.name;
    const full = [lead.name, lead.last_name].filter(Boolean).join(' ');
    return full || 'N/A';
  };

  const convertLead = async (customerId: number | string) => {
    if (!customerId) return;
    const ok = window.confirm('Convert this lead to a customer?');
    if (!ok) return;

    try {
      setConvertingId(customerId);
      await apiClient.post(`/crm/team/leads/${customerId}/convert`);
      await loadLeads();
    } catch (error) {
      console.error('Failed to convert lead', error);
      toast.error('Failed to convert lead');
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">CRM Leads</h1>
          <div className="flex gap-3">
            <select
              className="border rounded-lg px-3 py-1 text-sm"
              value={priority}
              onChange={(e) => {
                setPage(1);
                setPriority(e.target.value);
              }}
            >
              <option value="">All Priorities</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
            <select
              className="border rounded-lg px-3 py-1 text-sm"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Team Leads</h2>
          {loading ? (
            <div className="text-center text-gray-500">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="text-center text-gray-500">No leads found</div>
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
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Assigned To</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">#{lead.id}</td>
                      <td className="px-4 py-2">{formatName(lead)}</td>
                      <td className="px-4 py-2">{lead.email || 'N/A'}</td>
                      <td className="px-4 py-2">{lead.phone || 'N/A'}</td>
                      <td className="px-4 py-2 capitalize">{lead.priority || '-'}</td>
                      <td className="px-4 py-2 capitalize">{lead.status || '-'}</td>
                      <td className="px-4 py-2">{lead.assigned_to ?? 'Unassigned'}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Link
                            className="px-3 py-1 border rounded hover:bg-gray-50"
                            href={`/admin/crm/customer/${lead.id}`}
                          >
                            View
                          </Link>
                          <button
                            className="px-3 py-1 border rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            disabled={convertingId === lead.id}
                            onClick={() => convertLead(lead.id)}
                          >
                            {convertingId === lead.id ? 'Converting…' : 'Convert'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
            <span>
              Page {page} of {totalPages} (Total {total} leads)
            </span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
