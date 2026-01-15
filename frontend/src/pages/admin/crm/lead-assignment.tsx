import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { apiUrl } from '@/config/backend';

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lead_source: string;
  lead_score: number;
  source_details: string;
  campaign_id: string;
  incomplete_order_value: number;
  created_at: string;
}

interface TeamMember {
  id: number;
  user_id: number;
  team_type: string;
  assigned_leads_count: number;
  completed_leads_count: number;
}

export default function LeadAssignmentPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ [key: string]: TeamMember[] }>({});
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('A');
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchUnassignedLeads();
    fetchTeamMembers();
  }, []);

  const fetchUnassignedLeads = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/lead-management/leads/unassigned'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setLeads(data);
      } else {
        console.error('API response is not an array:', data);
        setLeads([]);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      const userId = JSON.parse(atob(token.split('.')[1])).userId;
      
      const teams = ['A', 'B', 'C', 'D', 'E'];
      const membersData: { [key: string]: TeamMember[] } = {};

      for (const team of teams) {
        try {
          const response = await fetch(apiUrl(`/lead-management/team-member/list/${userId}?teamType=${team}`), {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            membersData[team] = Array.isArray(data) ? data : [];
          } else {
            membersData[team] = [];
          }
        } catch (err) {
          console.error(`Error fetching team ${team} members:`, err);
          membersData[team] = [];
        }
      }

      setTeamMembers(membersData);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleAssignLead = async () => {
    if (!selectedLead || !selectedMember) {
      alert('Please select a team member');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const userId = JSON.parse(atob(token!.split('.')[1])).userId;

      const response = await fetch(apiUrl('/lead-management/assignment'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: selectedLead.id,
          teamType: selectedTeam,
          assignedById: userId,
          assignedToId: selectedMember,
          notes: assignmentNotes,
        }),
      });

      if (response.ok) {
        alert('Lead assigned successfully!');
        setShowAssignModal(false);
        setSelectedLead(null);
        setSelectedMember(null);
        setAssignmentNotes('');
        fetchUnassignedLeads();
        fetchTeamMembers();
      }
    } catch (error) {
      console.error('Error assigning lead:', error);
      alert('Failed to assign lead');
    }
  };

  const openAssignModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowAssignModal(true);
  };

//   console.log(leads);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Lead Assignment Dashboard</h1>
          <p className="text-gray-600">Assign unassigned leads to your team members</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {['A', 'B', 'C', 'D', 'E'].map((team) => (
            <div key={team} className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Team {team}</div>
              <div className="text-2xl font-bold text-blue-600">
                {teamMembers[team]?.length || 0}
              </div>
              <div className="text-xs text-gray-500">
                {teamMembers[team]?.reduce((sum, m) => sum + m.assigned_leads_count, 0) || 0} assigned
              </div>
            </div>
          ))}
        </div>

        {/* Unassigned Leads Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Unassigned Leads ({leads.length})</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : leads.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No unassigned leads</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incomplete Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads?.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          lead.lead_score >= 7 ? 'bg-green-100 text-green-800' :
                          lead.lead_score >= 4 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {lead.lead_score}/10
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{lead.first_name} {lead.last_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{lead.email}</div>
                        <div className="text-xs text-gray-500">{lead.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">{lead.source_details || '-'}</td>
                      <td className="px-6 py-4 text-sm">{lead.campaign_id || '-'}</td>
                      <td className="px-6 py-4">
                        {lead.incomplete_order_value ? (
                          <span className="text-sm font-semibold text-orange-600">
                            ৳{lead.incomplete_order_value}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openAssignModal(lead)}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Assignment Modal */}
        {showAssignModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4">Assign Lead to Team</h3>

              <div className="mb-4 p-4 bg-gray-50 rounded">
                <div className="font-semibold">{selectedLead.first_name} {selectedLead.last_name}</div>
                <div className="text-sm text-gray-600">{selectedLead.email} | {selectedLead.phone}</div>
                <div className="text-sm text-gray-600">Lead Score: {selectedLead.lead_score}/10</div>
              </div>

              {/* Team Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Team</label>
                <div className="grid grid-cols-5 gap-2">
                  {['A', 'B', 'C', 'D', 'E'].map((team) => (
                    <button
                      key={team}
                      onClick={() => {
                        setSelectedTeam(team);
                        setSelectedMember(null);
                      }}
                      className={`p-3 rounded-lg border-2 font-semibold ${
                        selectedTeam === team
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      Team {team}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {selectedTeam === 'A' && 'Team A: Gender, Profession, Product Interest'}
                  {selectedTeam === 'B' && 'Team B: Date of Birth, Marriage Day, Product Interest'}
                  {selectedTeam === 'C' && 'Team C: Family Members, Product Interest'}
                  {selectedTeam === 'D' && 'Team D: Health Card, Membership, Coupon'}
                  {selectedTeam === 'E' && 'Team E: Permanent Membership'}
                </div>
              </div>

              {/* Team Member Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Team Member</label>
                {teamMembers[selectedTeam]?.length > 0 ? (
                  <div className="space-y-2">
                    {teamMembers[selectedTeam].map((member) => (
                      <div
                        key={member.id}
                        onClick={() => setSelectedMember(member.user_id)}
                        className={`p-3 rounded-lg border-2 cursor-pointer ${
                          selectedMember === member.user_id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">User ID: {member.user_id}</span>
                          <span className="text-sm text-gray-600">
                            {member.assigned_leads_count} assigned | {member.completed_leads_count} completed
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 text-yellow-700 rounded">
                    No members in Team {selectedTeam}. Add team members first.
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Assignment Notes (Optional)</label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  rows={3}
                  placeholder="Add any special instructions or notes..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedLead(null);
                    setSelectedMember(null);
                    setAssignmentNotes('');
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignLead}
                  disabled={!selectedMember}
                  className={`px-6 py-2 rounded-lg text-white ${
                    selectedMember
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Assign Lead
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
