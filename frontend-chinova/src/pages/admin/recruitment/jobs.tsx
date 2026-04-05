import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';

const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/recruitment/jobs');
      setJobs(response.data.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (jobId: number) => {
    try {
      await api.put(`/recruitment/jobs/${jobId}/publish`);
      fetchJobs();
    } catch (error) {
      console.error('Error publishing job:', error);
    }
  };

  const handleUnpublish = async (jobId: number) => {
    try {
      await api.put(`/recruitment/jobs/${jobId}/unpublish`);
      fetchJobs();
    } catch (error) {
      console.error('Error unpublishing job:', error);
    }
  };

  const handleClose = async (jobId: number) => {
    try {
      await api.put(`/recruitment/jobs/${jobId}/close`);
      fetchJobs();
    } catch (error) {
      console.error('Error closing job:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Job Posts Management</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            + Create New Job
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Applications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job: any) => (
                  <tr key={job.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{job.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded">{job.job_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.applications_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          job.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : job.status === 'closed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {job.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(job.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Publish
                          </button>
                        )}
                        {job.status === 'published' && (
                          <>
                            <button
                              onClick={() => handleUnpublish(job.id)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Unpublish
                            </button>
                            <button
                              onClick={() => handleClose(job.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Close
                            </button>
                          </>
                        )}
                        <a
                          href={`/admin/recruitment/jobs/${job.id}/applications`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Applications
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default JobsPage;
