import { useState, useEffect } from 'react';
import AdminLayout from '../../../../layouts/AdminLayout';
import api from '../../../../services/api';
import { useToast } from '@/contexts/ToastContext';

interface InterviewFeedback {
  id: number;
  interviewId: number;
  rating: number;
  comments?: string;
  recommendation?: string;
}

export default function InterviewFeedbackPage() {
  const toast = useToast();
  const [interviewFeedbacks, setInterviewFeedbacks] = useState<InterviewFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInterviewFeedback, setEditingInterviewFeedback] = useState<InterviewFeedback | null>(null);
  const [formData, setFormData] = useState({
    interviewId: '',
    rating: '',
    comments: '',
    recommendation: '',
  });

  useEffect(() => {
    fetchInterviewFeedbacks();
  }, []);

  const fetchInterviewFeedbacks = async () => {
    try {
      const response = await api.get('/hrm/interview-feedback');
      setInterviewFeedbacks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch interview feedback:', error);
      setInterviewFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

    const prepareData = (data: any) => { const prepared = { ...data }; const idFields = ['branchId', 'departmentId', 'employeeId', 'managerId', 'designationId', 'awardTypeId', 'fromBranchId', 'toBranchId', 'fromDepartmentId', 'toDepartmentId', 'fromDesignationId', 'toDesignationId', 'typeId', 'categoryId', 'roomId', 'cycleId', 'goalTypeId', 'indicatorId', 'candidateId', 'jobPostingId', 'roundId', 'componentId', 'policyId', 'leaveTypeId', 'sessionId', 'programId', 'templateId']; idFields.forEach(field => { if (prepared[field] !== undefined && prepared[field] !== '' && prepared[field] !== null) { prepared[field] = Number(prepared[field]); } else if (prepared[field] === '') { delete prepared[field]; } }); return prepared; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingInterviewFeedback) {
        await api.patch(`/hrm/interview-feedback/{editingInterviewFeedback.id}`, prepareData(formData));
      } else {
        await api.post('/hrm/interview-feedback', prepareData(formData));
      }
      fetchInterviewFeedbacks();
      resetForm();
    } catch (error) {
      console.error('Failed to save interview feedback:', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleEdit = (interviewFeedback: InterviewFeedback) => {
    setEditingInterviewFeedback(interviewFeedback);
    setFormData({
      interviewId: interviewFeedback.interviewId.toString(),
      rating: interviewFeedback.rating.toString(),
      comments: interviewFeedback.comments || '',
      recommendation: interviewFeedback.recommendation || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this interview feedback?')) {
      try {
        await api.delete(`/hrm/interview-feedback/{id}`);
        fetchInterviewFeedbacks();
      } catch (error) {
        console.error('Failed to delete interview feedback:', error);
        toast.error('Failed to delete. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      interviewId: '',
      rating: '',
      comments: '',
      recommendation: '',
    });
    setEditingInterviewFeedback(null);
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Interview Feedback</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add New Interview Feedback
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : interviewFeedbacks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No interview feedback found. Click "Add New Interview Feedback" to create one.</p>
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
                {interviewFeedbacks.map((interviewFeedback) => (
                  <tr key={interviewFeedback.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{interviewFeedback.interviewId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{interviewFeedback.rating}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{interviewFeedback.comments}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{interviewFeedback.recommendation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(interviewFeedback)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(interviewFeedback.id)}
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
                {editingInterviewFeedback ? 'Edit Interview Feedback' : 'Add New Interview Feedback'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="number"
                    value={formData.interviewId}
                    onChange={(e) => setFormData({ ...formData, interviewId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="number"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <textarea
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="text"
                    value={formData.recommendation}
                    onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
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
                    {editingInterviewFeedback ? 'Update' : 'Create'}
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


