import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

type TeamTab = { id: number; name: string; code: string };

export default function TeamDataCollectionPage() {
  const router = useRouter();
  const [activeTeam, setActiveTeam] = useState('A');
  const [teamTabs, setTeamTabs] = useState<TeamTab[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDataModal, setShowDataModal] = useState(false);

  // Team A Form State
  const [teamAData, setTeamAData] = useState({
    gender: '',
    profession: '',
    productInterest: [] as string[],
    orderProductDetails: {},
    notes: '',
  });

  // Team B Form State
  const [teamBData, setTeamBData] = useState({
    dateOfBirth: '',
    marriageDay: '',
    productInterest: [] as string[],
    orderProductDetails: {},
    notes: '',
  });

  // Team C Form State
  const [teamCData, setTeamCData] = useState({
    productInterest: [] as string[],
    orderProductDetails: {},
    notes: '',
  });

  // Team D Form State
  const [teamDData, setTeamDData] = useState({
    healthCardNumber: '',
    healthCardExpiry: '',
    membershipCardNumber: '',
    membershipCardType: '',
    membershipExpiry: '',
    couponCodes: [] as string[],
    productInterest: [] as string[],
    orderProductDetails: {},
    notes: '',
  });

  // Team E Form State
  const [teamEData, setTeamEData] = useState({
    permanentMembershipNumber: '',
    membershipTier: 'silver',
    membershipStartDate: '',
    membershipBenefits: {},
    lifetimeValue: 0,
    notes: '',
  });

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMyAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam]);

  const loadTeams = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const res = await apiClient.get('/crm/team/teams');
      const all = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const allowed = new Set(['A', 'B', 'C', 'D', 'E']);
      const normalized: TeamTab[] = all
        .map((t: any) => ({
          id: Number(t.id),
          name: String(t.name || '').trim() || `Team ${String(t.code || '').trim()}`,
          code: String(t.code || '').trim().toUpperCase(),
        }))
        .filter((t: TeamTab) => Number.isFinite(t.id) && allowed.has(t.code));

      normalized.sort((a, b) => a.code.localeCompare(b.code));
      setTeamTabs(normalized);

      // Ensure active tab is valid
      if (!allowed.has(String(activeTeam || '').toUpperCase())) {
        setActiveTeam('A');
        return;
      }
      if (normalized.length && !normalized.some((t) => t.code === String(activeTeam).toUpperCase())) {
        setActiveTeam(normalized[0].code);
        return;
      }

      // Assignments are fetched by the activeTeam effect.
    } catch (error) {
      console.error('Failed to load teams', error);
      setTeamTabs([]);
    }
  };

  const fetchMyAssignments = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const res = await apiClient.get('/lead-management/assignment/my', {
        params: { teamType: activeTeam, status: 'pending' },
      });
      const data = Array.isArray((res as any)?.data) ? (res as any).data : [];
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const openDataModal = async (assignment: any) => {
    setSelectedCustomer(assignment);
    setShowDataModal(true);

    // Load existing data if any
    try {
      const response = await apiClient.get(`/lead-management/team-${activeTeam.toLowerCase()}/${assignment.customerId}`);
      const existingData = (response as any)?.data;
      if (existingData) {
          switch (activeTeam) {
            case 'A':
              setTeamAData(existingData);
              break;
            case 'B':
              setTeamBData(existingData);
              break;
            case 'C':
              setTeamCData(existingData);
              break;
            case 'D':
              setTeamDData(existingData);
              break;
            case 'E':
              setTeamEData(existingData);
              break;
          }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const handleSaveData = async () => {
    if (!selectedCustomer) return;

    try {
      let dataToSave: any = { customerId: selectedCustomer.customerId };

      switch (activeTeam) {
        case 'A':
          dataToSave = { ...dataToSave, ...teamAData };
          break;
        case 'B':
          dataToSave = { ...dataToSave, ...teamBData };
          break;
        case 'C':
          dataToSave = { ...dataToSave, ...teamCData };
          break;
        case 'D':
          dataToSave = { ...dataToSave, ...teamDData };
          break;
        case 'E':
          dataToSave = { ...dataToSave, ...teamEData };
          break;
      }

      await apiClient.post(`/lead-management/team-${activeTeam.toLowerCase()}`, dataToSave);

      // Mark assignment as completed
      await apiClient.put(`/lead-management/assignment/${selectedCustomer.id}/status`, {
        status: 'completed',
      });

      alert('Data saved successfully!');
      setShowDataModal(false);
      fetchMyAssignments();
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save data');
    }
  };

  const renderTeamAForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Gender</label>
        <select
          value={teamAData.gender}
          onChange={(e) => setTeamAData({ ...teamAData, gender: e.target.value })}
          className="w-full border rounded-lg p-2"
        >
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Profession</label>
        <input
          type="text"
          value={teamAData.profession}
          onChange={(e) => setTeamAData({ ...teamAData, profession: e.target.value })}
          className="w-full border rounded-lg p-2"
          placeholder="Enter profession"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Product Interest (comma-separated)</label>
        <input
          type="text"
          value={teamAData.productInterest.join(', ')}
          onChange={(e) => setTeamAData({ ...teamAData, productInterest: e.target.value.split(',').map(s => s.trim()) })}
          className="w-full border rounded-lg p-2"
          placeholder="Electronics, Fashion, Home"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Notes</label>
        <textarea
          value={teamAData.notes}
          onChange={(e) => setTeamAData({ ...teamAData, notes: e.target.value })}
          className="w-full border rounded-lg p-2"
          rows={3}
        />
      </div>
    </div>
  );

  const renderTeamBForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Date of Birth</label>
        <input
          type="date"
          value={teamBData.dateOfBirth}
          onChange={(e) => setTeamBData({ ...teamBData, dateOfBirth: e.target.value })}
          className="w-full border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Marriage Day</label>
        <input
          type="date"
          value={teamBData.marriageDay}
          onChange={(e) => setTeamBData({ ...teamBData, marriageDay: e.target.value })}
          className="w-full border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Product Interest (comma-separated)</label>
        <input
          type="text"
          value={teamBData.productInterest.join(', ')}
          onChange={(e) => setTeamBData({ ...teamBData, productInterest: e.target.value.split(',').map(s => s.trim()) })}
          className="w-full border rounded-lg p-2"
          placeholder="Electronics, Fashion, Home"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Notes</label>
        <textarea
          value={teamBData.notes}
          onChange={(e) => setTeamBData({ ...teamBData, notes: e.target.value })}
          className="w-full border rounded-lg p-2"
          rows={3}
        />
      </div>
    </div>
  );

  const renderTeamCForm = () => (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 text-blue-700 rounded">
        Team C collects family member information. Use the CDM Family Members section to add family data.
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Product Interest (comma-separated)</label>
        <input
          type="text"
          value={teamCData.productInterest.join(', ')}
          onChange={(e) => setTeamCData({ ...teamCData, productInterest: e.target.value.split(',').map(s => s.trim()) })}
          className="w-full border rounded-lg p-2"
          placeholder="Electronics, Fashion, Home"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Notes</label>
        <textarea
          value={teamCData.notes}
          onChange={(e) => setTeamCData({ ...teamCData, notes: e.target.value })}
          className="w-full border rounded-lg p-2"
          rows={3}
        />
      </div>
    </div>
  );

  const renderTeamDForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Health Card Number</label>
        <input
          type="text"
          value={teamDData.healthCardNumber}
          onChange={(e) => setTeamDData({ ...teamDData, healthCardNumber: e.target.value })}
          className="w-full border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Health Card Expiry</label>
        <input
          type="date"
          value={teamDData.healthCardExpiry}
          onChange={(e) => setTeamDData({ ...teamDData, healthCardExpiry: e.target.value })}
          className="w-full border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Membership Card Number</label>
        <input
          type="text"
          value={teamDData.membershipCardNumber}
          onChange={(e) => setTeamDData({ ...teamDData, membershipCardNumber: e.target.value })}
          className="w-full border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Membership Card Type</label>
        <select
          value={teamDData.membershipCardType}
          onChange={(e) => setTeamDData({ ...teamDData, membershipCardType: e.target.value })}
          className="w-full border rounded-lg p-2"
        >
          <option value="">Select Type</option>
          <option value="Basic">Basic</option>
          <option value="Silver">Silver</option>
          <option value="Gold">Gold</option>
          <option value="Platinum">Platinum</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Membership Expiry</label>
        <input
          type="date"
          value={teamDData.membershipExpiry}
          onChange={(e) => setTeamDData({ ...teamDData, membershipExpiry: e.target.value })}
          className="w-full border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Coupon Codes (comma-separated)</label>
        <input
          type="text"
          value={teamDData.couponCodes.join(', ')}
          onChange={(e) => setTeamDData({ ...teamDData, couponCodes: e.target.value.split(',').map(s => s.trim()) })}
          className="w-full border rounded-lg p-2"
          placeholder="SAVE10, DISCOUNT20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Product Interest (comma-separated)</label>
        <input
          type="text"
          value={teamDData.productInterest.join(', ')}
          onChange={(e) => setTeamDData({ ...teamDData, productInterest: e.target.value.split(',').map(s => s.trim()) })}
          className="w-full border rounded-lg p-2"
          placeholder="Electronics, Fashion, Home"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Notes</label>
        <textarea
          value={teamDData.notes}
          onChange={(e) => setTeamDData({ ...teamDData, notes: e.target.value })}
          className="w-full border rounded-lg p-2"
          rows={3}
        />
      </div>
    </div>
  );

  const renderTeamEForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Permanent Membership Number</label>
        <input
          type="text"
          value={teamEData.permanentMembershipNumber}
          onChange={(e) => setTeamEData({ ...teamEData, permanentMembershipNumber: e.target.value })}
          className="w-full border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Membership Tier</label>
        <select
          value={teamEData.membershipTier}
          onChange={(e) => setTeamEData({ ...teamEData, membershipTier: e.target.value })}
          className="w-full border rounded-lg p-2"
        >
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
          <option value="vip">VIP</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Membership Start Date</label>
        <input
          type="date"
          value={teamEData.membershipStartDate}
          onChange={(e) => setTeamEData({ ...teamEData, membershipStartDate: e.target.value })}
          className="w-full border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Lifetime Value (৳)</label>
        <input
          type="number"
          value={teamEData.lifetimeValue}
          onChange={(e) => setTeamEData({ ...teamEData, lifetimeValue: parseFloat(e.target.value) })}
          className="w-full border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Notes</label>
        <textarea
          value={teamEData.notes}
          onChange={(e) => setTeamEData({ ...teamEData, notes: e.target.value })}
          className="w-full border rounded-lg p-2"
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Team Data Collection</h1>
          <p className="text-gray-600">Collect customer information based on your team assignment</p>
        </div>

        {/* Team Tabs */}
        <div className="mb-6">
          <div className="flex space-x-2 border-b">
            {(teamTabs.length ? teamTabs : [
              { id: 0, name: 'Team A', code: 'A' },
              { id: 1, name: 'Team B', code: 'B' },
              { id: 2, name: 'Team C', code: 'C' },
              { id: 3, name: 'Team D', code: 'D' },
              { id: 4, name: 'Team E', code: 'E' },
            ]).map((team) => (
              <button
                key={team.code}
                onClick={() => {
                  setActiveTeam(team.code);
                  setLoading(true);
                }}
                className={`px-6 py-3 font-semibold ${
                  activeTeam === team.code
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
        </div>

        {/* Team Description */}
        <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-lg">
          {activeTeam === 'A' && '📝 Team A collects: Gender, Profession, Product Interest'}
          {activeTeam === 'B' && '📅 Team B collects: Date of Birth, Marriage Day, Product Interest'}
          {activeTeam === 'C' && '👨‍👩‍👧‍👦 Team C collects: Family Members information, Product Interest'}
          {activeTeam === 'D' && '💳 Team D collects: Health Card, Membership Card, Coupon, Product Interest'}
          {activeTeam === 'E' && '⭐ Team E collects: Permanent Membership details'}
        </div>

        {/* Assignments Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">My Pending Assignments ({assignments.length})</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : assignments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No pending assignments for Team {activeTeam}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">#{assignment.customerId}</td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          {assignment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{assignment.notes || '-'}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openDataModal(assignment)}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          Collect Data
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Data Collection Modal */}
        {showDataModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4">Collect Team {activeTeam} Data</h3>

              <div className="mb-4 p-3 bg-gray-50 rounded">
                <div className="font-semibold">Customer ID: #{selectedCustomer.customerId}</div>
              </div>

              {activeTeam === 'A' && renderTeamAForm()}
              {activeTeam === 'B' && renderTeamBForm()}
              {activeTeam === 'C' && renderTeamCForm()}
              {activeTeam === 'D' && renderTeamDForm()}
              {activeTeam === 'E' && renderTeamEForm()}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowDataModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveData}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save & Complete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
