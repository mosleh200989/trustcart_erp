import { useState, useEffect } from 'react';
import AdminLayout from '../../../../layouts/AdminLayout';
import api from '../../../../services/api';
import { useToast } from '@/contexts/ToastContext';

interface JobRequisition {
  id: number;
  title?: string;
  departmentId: number;
  positions: number;
  urgency?: string;
  status?: string;
}

export default function JobRequisitionPage() {
  const toast = useToast();
  const [jobRequisitions, setJobRequisitions] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJobRequisition, setEditingJobRequisition] = useState<JobRequisition | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    departmentId: '',
    positions: '',
    urgency: '',
    status: '',
  });

  useEffect(() => {
    fetchJobRequisitions();
  }, []);

  const fetchJobRequisitions = async () => {
    try {
      const response = await api.get('/hrm/job-requisitions');
      setJobRequisitions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch job requisitions:', error);
      setJobRequisitions([]);
    } finally {
      setLoading(false);
    }
  };

    const prepareData = (data: any) => { const prepared = { ...data }; const idFields = ['branchId', 'departmentId', 'employeeId', 'managerId', 'designationId', 'awardTypeId', 'fromBranchId', 'toBranchId', 'fromDepartmentId', 'toDepartmentId', 'fromDesignationId', 'toDesignationId', 'typeId', 'categoryId', 'roomId', 'cycleId', 'goalTypeId', 'indicatorId', 'candidateId', 'jobPostingId', 'roundId', 'componentId', 'policyId', 'leaveTypeId', 'sessionId', 'programId', 'templateId']; idFields.forEach(field => { if (prepared[field] !== undefined && prepared[field] !== '' && prepared[field] !== null) { prepared[field] = Number(prepared[field]); } else if (prepared[field] === '') { delete prepared[field]; } }); return prepared; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingJobRequisition) {
        await api.patch(`/hrm/job-requisitions/{editingJobRequisition.id}`, prepareData(formData));
      } else {
        await api.post('/hrm/job-requisitions', prepareData(formData));
      }
      fetchJobRequisitions();
      resetForm();
    } catch (error) {
      console.error('Failed to save job requisitions:', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleEdit = (jobRequisition: JobRequisition) => {
    setEditingJobRequisition(jobRequisition);
    setFormData({
      title: jobRequisition.title || '',
      departmentId: jobRequisition.departmentId.toString(),
      positions: jobRequisition.positions.toString(),
      urgency: jobRequisition.urgency || '',
      status: jobRequisition.status || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this job requisitions?')) {
      try {
        await api.delete(`/hrm/job-requisitions/{id}`);
        fetchJobRequisitions();
      } catch (error) {
        console.error('Failed to delete job requisitions:', error);
        toast.error('Failed to delete. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      departmentId: '',
      positions: '',
      urgency: '',
      status: '',
    });
    setEditingJobRequisition(null);
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Job Requisitions</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add New Job Requisition
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : jobRequisitions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No job requisitions found. Click "Add New Job Requisition" to create one.</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobRequisitions.map((jobRequisition) => (
                  <tr key={jobRequisition.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jobRequisition.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jobRequisition.departmentId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jobRequisition.positions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jobRequisition.urgency}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jobRequisition.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(jobRequisition)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(jobRequisition.id)}
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
                {editingJobRequisition ? 'Edit Job Requisition' : 'Add New Job Requisition'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="number"
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="number"
                    value={formData.positions}
                    onChange={(e) => setFormData({ ...formData, positions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="text"
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
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
                    {editingJobRequisition ? 'Update' : 'Create'}
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


