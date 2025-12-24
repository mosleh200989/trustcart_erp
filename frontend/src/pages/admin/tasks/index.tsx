import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaPlus, FaTasks, FaCheckCircle, FaClock } from 'react-icons/fa';

export default function AdminTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await apiClient.get('/tasks');
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaTasks className="text-teal-600" />
            Task Management
          </h1>
          <button className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg flex items-center gap-2">
            <FaPlus /> New Task
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="text-center text-gray-500">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-gray-500">No tasks found</div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="border-l-4 border-teal-500 bg-gray-50 p-4 rounded hover:shadow transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{task.title || 'Unnamed Task'}</h3>
                      <p className="text-sm text-gray-600 mt-1">{task.description || 'No description'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.status === 'completed' ? (
                        <FaCheckCircle className="text-green-500" />
                      ) : (
                        <FaClock className="text-orange-500" />
                      )}
                      <span className="px-2 py-1 text-xs rounded-full bg-teal-100 text-teal-800">
                        {task.priority || 'Normal'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
