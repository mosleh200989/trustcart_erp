import { useState, useEffect } from 'react';
import AdminLayout from '../../../../layouts/AdminLayout';
import api from '../../../../services/api';

interface Regularization {
  id: number;
  employeeId: number;
  employeeName?: string;
  date: string;
  requestType: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
  status: string;
  approvedBy?: number;
}

export default function RegularizationsPage() {
  const [regularizations, setRegularizations] = useState<Regularization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRegularization, setEditingRegularization] = useState<Regularization | null>(null);
  const [formData, setFormData] = useState({
    employeeId: 0,
    date: '',
    requestType: 'Check In/Out',
    requestedCheckIn: '',
    requestedCheckOut: '',
    reason: '',
    status: 'Pending',
  });

  useEffect(() => {
    fetchRegularizations();
  }, []);

  const fetchRegularizations = async () => {
    try {
      const response = await api.get('/hrm/regularizations');
      setRegularizations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch regularizations:', error);
      setRegularizations([]);
    } finally {
      setLoading(false);
    }
  };

    const prepareData = (data: any) => { const prepared = { ...data }; const idFields = ['branchId', 'departmentId', 'employeeId', 'managerId', 'designationId', 'awardTypeId', 'fromBranchId', 'toBranchId', 'fromDepartmentId', 'toDepartmentId', 'fromDesignationId', 'toDesignationId', 'typeId', 'categoryId', 'roomId', 'cycleId', 'goalTypeId', 'indicatorId', 'candidateId', 'jobPostingId', 'roundId', 'componentId', 'policyId', 'leaveTypeId', 'sessionId', 'programId', 'templateId']; idFields.forEach(field => { if (prepared[field] !== undefined && prepared[field] !== '' && prepared[field] !== null) { prepared[field] = Number(prepared[field]); } else if (prepared[field] === '') { delete prepared[field]; } }); return prepared; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRegularization) {
        await api.patch(`/hrm/regularizations/${editingRegularization.id}`, prepareData(formData));
      } else {
        await api.post('/hrm/regularizations', prepareData(formData));
      }
      fetchRegularizations();
      resetForm();
    } catch (error) {
      console.error('Failed to save', error);
      alert('Failed to save. Please try again.');
    }
  };

  const handleEdit = (regularization: Regularization) => {
    setEditingRegularization(regularization);
    setFormData({
      employeeId: regularization.employeeId,
      date: regularization.date,
      requestType: regularization.requestType,
      requestedCheckIn: regularization.requestedCheckIn || '',
      requestedCheckOut: regularization.requestedCheckOut || '',
      reason: regularization.reason,
      status: regularization.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this regularization?')) {
      try {
        await api.delete(`/hrm/regularizations/${id}`);
        fetchRegularizations();
      } catch (error) {
        console.error('Failed to delete', error);
        alert('Failed to delete. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: 0,
      date: '',
      requestType: 'Check In/Out',
      requestedCheckIn: '',
      requestedCheckOut: '',
      reason: '',
      status: 'Pending',
    });
    setEditingRegularization(null);
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Attendance Regularizations</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Regularization
          </button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {regularizations.map((reg) => (
                  <tr key={reg.id}>
                    <td className="px-6 py-4">{reg.employeeName || `Employee #${reg.employeeId}`}</td>
                    <td className="px-6 py-4">{reg.date}</td>
                    <td className="px-6 py-4">{reg.requestType}</td>
                    <td className="px-6 py-4">
                      {reg.requestedCheckIn && `In: ${reg.requestedCheckIn}`}
                      {reg.requestedCheckIn && reg.requestedCheckOut && ' | '}
                      {reg.requestedCheckOut && `Out: ${reg.requestedCheckOut}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        reg.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                        reg.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleEdit(reg)} className="text-blue-600 hover:text-blue-800 mr-3">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(reg.id)} className="text-red-600 hover:text-red-800">
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
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{editingRegularization ? 'Edit' : 'Add'} Regularization</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Employee ID</label>
                  <input
                    type="number"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: parseInt(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Request Type</label>
                  <select
                    value={formData.requestType}
                    onChange={(e) => setFormData({ ...formData, requestType: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="Check In/Out">Check In/Out</option>
                    <option value="Missed Punch">Missed Punch</option>
                    <option value="Leave Adjustment">Leave Adjustment</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Requested Check In</label>
                  <input
                    type="time"
                    value={formData.requestedCheckIn}
                    onChange={(e) => setFormData({ ...formData, requestedCheckIn: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Requested Check Out</label>
                  <input
                    type="time"
                    value={formData.requestedCheckOut}
                    onChange={(e) => setFormData({ ...formData, requestedCheckOut: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Reason</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={resetForm} className="px-4 py-2 border rounded hover:bg-gray-100">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    {editingRegularization ? 'Update' : 'Create'}
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


