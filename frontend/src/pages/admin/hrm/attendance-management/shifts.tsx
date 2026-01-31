import { useState, useEffect } from 'react';
import AdminLayout from '../../../../layouts/AdminLayout';
import api from '../../../../services/api';
import { useToast } from '@/contexts/ToastContext';

interface Shift {
  id: number;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  status: boolean;
}

export default function ShiftsPage() {
  const toast = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    startTime: '',
    endTime: '',
    breakDuration: 0,
    status: true,
  });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const response = await api.get('/hrm/shifts');
      setShifts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

    const prepareData = (data: any) => { const prepared = { ...data }; const idFields = ['branchId', 'departmentId', 'employeeId', 'managerId', 'designationId', 'awardTypeId', 'fromBranchId', 'toBranchId', 'fromDepartmentId', 'toDepartmentId', 'fromDesignationId', 'toDesignationId', 'typeId', 'categoryId', 'roomId', 'cycleId', 'goalTypeId', 'indicatorId', 'candidateId', 'jobPostingId', 'roundId', 'componentId', 'policyId', 'leaveTypeId', 'sessionId', 'programId', 'templateId']; idFields.forEach(field => { if (prepared[field] !== undefined && prepared[field] !== '' && prepared[field] !== null) { prepared[field] = Number(prepared[field]); } else if (prepared[field] === '') { delete prepared[field]; } }); return prepared; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShift) {
        await api.patch(`/hrm/shifts/${editingShift.id}`, prepareData(formData));
      } else {
        await api.post('/hrm/shifts', prepareData(formData));
      }
      fetchShifts();
      resetForm();
    } catch (error) {
      console.error('Failed to save', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: shift.breakDuration || 0,
      status: shift.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this shift?')) {
      try {
        await api.delete(`/hrm/shifts/${id}`);
        fetchShifts();
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
      startTime: '',
      endTime: '',
      breakDuration: 0,
      status: true,
    });
    setEditingShift(null);
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Shifts</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Shift
          </button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Break (mins)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td className="px-6 py-4">{shift.name}</td>
                    <td className="px-6 py-4">{shift.code}</td>
                    <td className="px-6 py-4">{shift.startTime}</td>
                    <td className="px-6 py-4">{shift.endTime}</td>
                    <td className="px-6 py-4">{shift.breakDuration || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${shift.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {shift.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleEdit(shift)} className="text-blue-600 hover:text-blue-800 mr-3">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(shift.id)} className="text-red-600 hover:text-red-800">
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
              <h2 className="text-xl font-bold mb-4">{editingShift ? 'Edit' : 'Add'} Shift</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Break Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.breakDuration}
                    onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
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
                    Active
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={resetForm} className="px-4 py-2 border rounded hover:bg-gray-100">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    {editingShift ? 'Update' : 'Create'}
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



