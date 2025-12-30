import { useState, useEffect } from 'react';
import AdminLayout from '../../../../layouts/AdminLayout';
import api from '../../../../services/api';

interface CandidateOnboarding {
  id: number;
  candidateId: number;
  checklistId: number;
  status?: string;
  completedDate?: string;
}

export default function CandidateOnboardingPage() {
  const [candidateOnboardings, setCandidateOnboardings] = useState<CandidateOnboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCandidateOnboarding, setEditingCandidateOnboarding] = useState<CandidateOnboarding | null>(null);
  const [formData, setFormData] = useState({
    candidateId: '',
    checklistId: '',
    status: '',
    completedDate: '',
  });

  useEffect(() => {
    fetchCandidateOnboardings();
  }, []);

  const fetchCandidateOnboardings = async () => {
    try {
      const response = await api.get('/hrm/candidate-onboarding');
      setCandidateOnboardings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch candidate onboarding:', error);
      setCandidateOnboardings([]);
    } finally {
      setLoading(false);
    }
  };

    const prepareData = (data: any) => { const prepared = { ...data }; const idFields = ['branchId', 'departmentId', 'employeeId', 'managerId', 'designationId', 'awardTypeId', 'fromBranchId', 'toBranchId', 'fromDepartmentId', 'toDepartmentId', 'fromDesignationId', 'toDesignationId', 'typeId', 'categoryId', 'roomId', 'cycleId', 'goalTypeId', 'indicatorId', 'candidateId', 'jobPostingId', 'roundId', 'componentId', 'policyId', 'leaveTypeId', 'sessionId', 'programId', 'templateId']; idFields.forEach(field => { if (prepared[field] !== undefined && prepared[field] !== '' && prepared[field] !== null) { prepared[field] = Number(prepared[field]); } else if (prepared[field] === '') { delete prepared[field]; } }); return prepared; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCandidateOnboarding) {
        await api.patch(`/hrm/candidate-onboarding/{editingCandidateOnboarding.id}`, prepareData(formData));
      } else {
        await api.post('/hrm/candidate-onboarding', prepareData(formData));
      }
      fetchCandidateOnboardings();
      resetForm();
    } catch (error) {
      console.error('Failed to save', error);
      alert('Failed to save. Please try again.');
    }
  };

  const handleEdit = (candidateOnboarding: CandidateOnboarding) => {
    setEditingCandidateOnboarding(candidateOnboarding);
    setFormData({
      candidateId: candidateOnboarding.candidateId.toString(),
      checklistId: candidateOnboarding.checklistId.toString(),
      status: candidateOnboarding.status || '',
      completedDate: candidateOnboarding.completedDate || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this candidate onboarding?')) {
      try {
        await api.delete(`/hrm/candidate-onboarding/{id}`);
        fetchCandidateOnboardings();
      } catch (error) {
        console.error('Failed to delete', error);
        alert('Failed to delete. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      candidateId: '',
      checklistId: '',
      status: '',
      completedDate: '',
    });
    setEditingCandidateOnboarding(null);
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Candidate Onboarding</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add New Candidate Onboarding
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : candidateOnboardings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No candidate onboarding found. Click "Add New Candidate Onboarding" to create one.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidateOnboardings.map((candidateOnboarding) => (
                  <tr key={candidateOnboarding.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {candidateOnboarding.candidateId ? new Date(candidateOnboarding.candidateId).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidateOnboarding.checklistId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidateOnboarding.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {candidateOnboarding.completedDate ? new Date(candidateOnboarding.completedDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(candidateOnboarding)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(candidateOnboarding.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {editingCandidateOnboarding ? 'Edit Candidate Onboarding' : 'Add New Candidate Onboarding'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="date"
                    value={formData.candidateId}
                    onChange={(e) => setFormData({ ...formData, candidateId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="number"
                    value={formData.checklistId}
                    onChange={(e) => setFormData({ ...formData, checklistId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="text"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="date"
                    value={formData.completedDate}
                    onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {editingCandidateOnboarding ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}



