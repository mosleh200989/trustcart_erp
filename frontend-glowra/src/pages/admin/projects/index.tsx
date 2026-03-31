import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaPlus, FaProjectDiagram } from 'react-icons/fa';

export default function AdminProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await apiClient.get('/projects');
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaProjectDiagram className="text-indigo-600" />
            Project Management
          </h1>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center gap-2">
            <FaPlus /> New Project
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="text-center text-gray-500">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center text-gray-500">No projects found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div key={project.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                  <h3 className="font-bold text-lg mb-2">{project.name || 'Unnamed Project'}</h3>
                  <p className="text-sm text-gray-600 mb-3">{project.description || 'No description'}</p>
                  <div className="flex justify-between items-center">
                    <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                      {project.status || 'Active'}
                    </span>
                    <span className="text-sm text-gray-500">{project.progress || 0}% Complete</span>
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
