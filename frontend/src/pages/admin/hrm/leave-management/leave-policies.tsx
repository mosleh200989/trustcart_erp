import { useState, useEffect } from 'react';
import AdminLayout from '../../../../layouts/AdminLayout';
import api from '../../../../services/api';
import { useToast } from '@/contexts/ToastContext';

interface LeavePolicy {
  id: number;
  name?: string;
  description?: string;
  maxDays: number;
  status: boolean;
}

export default function LeavePolicyPage() {
  const toast = useToast();
  const [leavePolicys, setLeavePolicys] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLeavePolicy, setEditingLeavePolicy] = useState<LeavePolicy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxDays: '',
    status: true,
  });

  useEffect(() => {
    fetchLeavePolicys();
  }, []);

  const fetchLeavePolicys = async () => {
    try {
      const response = await api.get('/hrm/leave-policies');
      setLeavePolicys(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch leave policies:', error);
      setLeavePolicys([]);
    } finally {
      setLoading(false);
    }
  };

    const prepareData = (data: any) => { const prepared = { ...data }; const idFields = ['branchId', 'departmentId', 'employeeId', 'managerId', 'designationId', 'awardTypeId', 'fromBranchId', 'toBranchId', 'fromDepartmentId', 'toDepartmentId', 'fromDesignationId', 'toDesignationId', 'typeId', 'categoryId', 'roomId', 'cycleId', 'goalTypeId', 'indicatorId', 'candidateId', 'jobPostingId', 'roundId', 'componentId', 'policyId', 'leaveTypeId', 'sessionId', 'programId', 'templateId']; idFields.forEach(field => { if (prepared[field] !== undefined && prepared[field] !== '' && prepared[field] !== null) { prepared[field] = Number(prepared[field]); } else if (prepared[field] === '') { delete prepared[field]; } }); return prepared; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLeavePolicy) {
        await api.patch(`/hrm/leave-policies/{editingLeavePolicy.id}`, prepareData(formData));
      } else {
        await api.post('/hrm/leave-policies', prepareData(formData));
      }
      fetchLeavePolicys();
      resetForm();
    } catch (error) {
      console.error('Failed to save', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleEdit = (leavePolicy: LeavePolicy) => {
    setEditingLeavePolicy(leavePolicy);
    setFormData({
      name: leavePolicy.name || '',
      description: leavePolicy.description || '',
      maxDays: leavePolicy.maxDays.toString(),
      status: leavePolicy.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this leave policies?')) {
      try {
        await api.delete(`/hrm/leave-policies/{id}`);
        fetchLeavePolicys();
      } catch (error) {
        console.error('Failed to delete', error);
        toast.error('Failed to delete. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      maxDays: '',
      status: true,
    });
    setEditingLeavePolicy(null);
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Leave Policies</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add New Leave Policie
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : leavePolicys.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No leave policies found. Click "Add New Leave Policie" to create one.</p>
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
                {leavePolicys.map((leavePolicy) => (
                  <tr key={leavePolicy.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leavePolicy.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leavePolicy.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leavePolicy.maxDays}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${leavePolicy.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {leavePolicy.status ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(leavePolicy)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(leavePolicy.id)}
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
                {editingLeavePolicy ? 'Edit Leave Policie' : 'Add New Leave Policie'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                  <input
                    type="number"
                    value={formData.maxDays}
                    onChange={(e) => setFormData({ ...formData, maxDays: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700"></span>
                  </label>
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
                    {editingLeavePolicy ? 'Update' : 'Create'}
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




