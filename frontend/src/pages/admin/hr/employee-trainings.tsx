
import { useState, useEffect } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';

interface EmployeeTraining {
  id: number;
  employeeId?: number;
  trainingProgramId?: number;
  status?: string;
  remarks?: string;
  isActive: boolean;
}

export default function EmployeeTrainingsPage() {
  const [employeeTrainings, setEmployeeTrainings] = useState<EmployeeTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployeeTraining, setEditingEmployeeTraining] = useState<EmployeeTraining | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    trainingProgramId: '',
    status: '',
    remarks: '',
    isActive: true,
  });

  useEffect(() => {
    fetchEmployeeTrainings();
  }, []);

  const fetchEmployeeTrainings = async () => {
    try {
      const response = await api.get('/hr/employee-trainings');
      setEmployeeTrainings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch employee trainings:', error);
      setEmployeeTrainings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployeeTraining) {
        await api.put(`/hr/employee-trainings/${editingEmployeeTraining.id}`, formData);
      } else {
        await api.post('/hr/employee-trainings', formData);
      }
      fetchEmployeeTrainings();
      resetForm();
    } catch (error) {
      console.error('Failed to save employee training:', error);
    }
  };

  const handleEdit = (employeeTraining: EmployeeTraining) => {
    setEditingEmployeeTraining(employeeTraining);
    setFormData({
      employeeId: employeeTraining.employeeId?.toString() || '',
      trainingProgramId: employeeTraining.trainingProgramId?.toString() || '',
      status: employeeTraining.status || '',
      remarks: employeeTraining.remarks || '',
      isActive: employeeTraining.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this employee training?')) {
      try {
        await api.delete(`/hr/employee-trainings/${id}`);
        fetchEmployeeTrainings();
      } catch (error) {
        console.error('Failed to delete employee training:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      trainingProgramId: '',
      status: '',
      remarks: '',
      isActive: true,
    });
    setEditingEmployeeTraining(null);
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Employee Trainings</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add New Employee Training
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : employeeTrainings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No employee trainings found. Click "Add New Employee Training" to create one.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employeeTrainings.map((training) => (
                  <tr key={training.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {training.status || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{training.remarks || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          training.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {training.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(training)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(training.id)}
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
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">
                {editingEmployeeTraining ? 'Edit Employee Training' : 'Add New Employee Training'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <input
                    type="text"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
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
                    {editingEmployeeTraining ? 'Update' : 'Create'}
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
