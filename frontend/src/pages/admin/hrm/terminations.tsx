
import { useState, useEffect } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';
import { useToast } from '@/contexts/ToastContext';

interface Termination {
  id: number;
  employeeId?: number;
  terminationDate?: string;
  reason?: string;
  status: boolean;
}

export default function TerminationsPage() {
  const toast = useToast();
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTermination, setEditingTermination] = useState<Termination | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    terminationDate: '',
    reason: '',
    status: true,
  });

  useEffect(() => {
    fetchTerminations();
  }, []);

  const fetchTerminations = async () => {
    try {
      const response = await api.get('/hrm/terminations');
      setTerminations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch terminations:', error);
      setTerminations([]);
    } finally {
      setLoading(false);
    }
  };

    const prepareData = (data: any) => { const prepared = { ...data }; const idFields = ['branchId', 'departmentId', 'employeeId', 'managerId', 'designationId', 'awardTypeId', 'fromBranchId', 'toBranchId', 'fromDepartmentId', 'toDepartmentId', 'fromDesignationId', 'toDesignationId', 'typeId', 'categoryId', 'roomId', 'cycleId', 'goalTypeId', 'indicatorId', 'candidateId', 'jobPostingId', 'roundId', 'componentId', 'policyId', 'leaveTypeId', 'sessionId', 'programId', 'templateId']; idFields.forEach(field => { if (prepared[field] !== undefined && prepared[field] !== '' && prepared[field] !== null) { prepared[field] = Number(prepared[field]); } else if (prepared[field] === '') { delete prepared[field]; } }); return prepared; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTermination) {
        await api.patch(`/hrm/terminations/${editingTermination.id}`, prepareData(formData));
      } else {
        await api.post('/hrm/terminations', prepareData(formData));
      }
      fetchTerminations();
      resetForm();
    } catch (error) {
      console.error('Failed to save termination:', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleEdit = (termination: Termination) => {
    setEditingTermination(termination);
    setFormData({
      employeeId: termination.employeeId?.toString() || '',
      terminationDate: termination.terminationDate || '',
      reason: termination.reason || '',
      status: termination.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this termination?')) {
      try {
        await api.delete(`/hrm/terminations/${id}`);
        fetchTerminations();
      } catch (error) {
        console.error('Failed to delete termination:', error);
        toast.error('Failed to delete. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      terminationDate: '',
      reason: '',
      status: true,
    });
    setEditingTermination(null);
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Terminations</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add New Termination
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : terminations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No terminations found. Click "Add New Termination" to create one.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Termination Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {terminations.map((termination) => (
                  <tr key={termination.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {termination.terminationDate || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{termination.reason || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          termination.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {termination.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(termination)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(termination.id)}
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
                {editingTermination ? 'Edit Termination' : 'Add New Termination'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Termination Date</label>
                  <input
                    type="date"
                    value={formData.terminationDate}
                    onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
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
                    <span className="text-sm font-medium text-gray-700">Active</span>
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
                    {editingTermination ? 'Update' : 'Create'}
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



