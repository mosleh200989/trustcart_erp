import { useState, useEffect } from 'react';
import AdminLayout from '../../../../layouts/AdminLayout';
import api from '../../../../services/api';
import { useToast } from '@/contexts/ToastContext';

interface SalaryComponent {
  id: number;
  name: string;
  code: string;
  type: string;
  amount: number;
  status: boolean;
}

export default function SalaryComponentsPage() {
  const toast = useToast();
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSalaryComponent, setEditingSalaryComponent] = useState<SalaryComponent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'Earning',
    amount: '',
    status: true,
  });

  useEffect(() => {
    fetchSalaryComponents();
  }, []);

  const fetchSalaryComponents = async () => {
    try {
      const response = await api.get('/hrm/salary-components');
      setSalaryComponents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch salary components:', error);
      setSalaryComponents([]);
    } finally {
      setLoading(false);
    }
  };

    const prepareData = (data: any) => { const prepared = { ...data }; const idFields = ['branchId', 'departmentId', 'employeeId', 'managerId', 'designationId', 'awardTypeId', 'fromBranchId', 'toBranchId', 'fromDepartmentId', 'toDepartmentId', 'fromDesignationId', 'toDesignationId', 'typeId', 'categoryId', 'roomId', 'cycleId', 'goalTypeId', 'indicatorId', 'candidateId', 'jobPostingId', 'roundId', 'componentId', 'policyId', 'leaveTypeId', 'sessionId', 'programId', 'templateId']; idFields.forEach(field => { if (prepared[field] !== undefined && prepared[field] !== '' && prepared[field] !== null) { prepared[field] = Number(prepared[field]); } else if (prepared[field] === '') { delete prepared[field]; } }); return prepared; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSalaryComponent) {
        await api.patch(`/hrm/salary-components/${editingSalaryComponent.id}`, prepareData(formData));
      } else {
        await api.post('/hrm/salary-components', prepareData(formData));
      }
      fetchSalaryComponents();
      resetForm();
    } catch (error) {
      console.error('Failed to save', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleEdit = (salaryComponent: SalaryComponent) => {
    setEditingSalaryComponent(salaryComponent);
    setFormData({
      name: salaryComponent.name,
      code: salaryComponent.code,
      type: salaryComponent.type,
      amount: salaryComponent.amount.toString(),
      status: salaryComponent.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this salary component?')) {
      try {
        await api.delete(`/hrm/salary-components/${id}`);
        fetchSalaryComponents();
      } catch (error) {
        console.error('Failed to delete', error);
        toast.error('Failed to delete. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'Earning',
      amount: '',
      status: true,
    });
    setEditingSalaryComponent(null);
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Salary Components</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add New Component
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : salaryComponents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No salary components found. Click "Add New Component" to create one.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salaryComponents.map((salaryComponent) => (
                  <tr key={salaryComponent.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {salaryComponent.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{salaryComponent.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          salaryComponent.type === 'Earning' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {salaryComponent.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${salaryComponent.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          salaryComponent.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {salaryComponent.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(salaryComponent)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(salaryComponent.id)}
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
                {editingSalaryComponent ? 'Edit Salary Component' : 'Add New Salary Component'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Earning">Earning</option>
                    <option value="Deduction">Deduction</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                    {editingSalaryComponent ? 'Update' : 'Create'}
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




