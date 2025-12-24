import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

interface LeadCustomer {
  id: number | string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  priority?: string;
  assigned_to?: number | null;
}

interface PaginatedResponse {
  data: LeadCustomer[];
  total: number;
}

export default function CrmAssignLeadsPage() {
  const [leads, setLeads] = useState<LeadCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState('');
  const [selectedLead, setSelectedLead] = useState<LeadCustomer | null>(null);

  useEffect(() => {
    loadUnassignedLeads();
  }, []);

  const loadUnassignedLeads = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PaginatedResponse>('/crm/team/leads', {
        params: { page: 1, limit: 50 }
      });
      const all = res.data?.data ?? [];
      setLeads(all.filter((l) => !l.assigned_to));
    } catch (error) {
      console.error('Failed to load leads', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const formatName = (lead: LeadCustomer) => {
    if (lead.name) return lead.name;
    const full = [lead.name, lead.last_name].filter(Boolean).join(' ');
    return full || 'N/A';
  };

  const handleAssign = async () => {
    if (!selectedLead || !agentId) return;
    try {
      await apiClient.post(`/crm/team/leads/${selectedLead.id}/assign`, {
        agentId: Number(agentId)
      });
      alert('Lead assigned successfully');
      setAgentId('');
      setSelectedLead(null);
      loadUnassignedLeads();
    } catch (error) {
      console.error('Failed to assign lead', error);
      alert('Failed to assign lead');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Assign Leads to Agents</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Unassigned Leads</h2>
            {loading ? (
              <div className="text-gray-500">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="text-gray-500">All leads are assigned.</div>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex justify-between items-center ${
                      selectedLead?.id === lead.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div>
                      <div className="font-medium text-gray-800">{formatName(lead)}</div>
                      <div className="text-xs text-gray-500">{lead.email || 'No email'} • {lead.phone || 'No phone'}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                      {lead.priority || 'new'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Assignment Details</h2>
            {selectedLead ? (
              <>
                <p className="mb-2 text-sm text-gray-700">
                  Lead: <span className="font-semibold">{formatName(selectedLead)}</span>
                </p>
                <label className="block text-sm text-gray-700 mb-1">Agent ID</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 mb-3"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="Enter agent user ID"
                />
                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                  onClick={handleAssign}
                  disabled={!agentId}
                >
                  Assign Lead
                </button>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Select a lead from the left to assign.</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
