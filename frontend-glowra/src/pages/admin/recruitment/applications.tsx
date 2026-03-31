import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';
import { useRouter } from 'next/router';

const ApplicationsPage = () => {
  const router = useRouter();
  const { jobId } = router.query;
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (jobId) {
      fetchApplications();
    } else {
      fetchAllApplications();
    }
  }, [jobId, filter]);

  const fetchApplications = async () => {
    try {
      const response = await api.get(`/recruitment/applications?job_post_id=${jobId}&status=${filter !== 'all' ? filter : ''}`);
      setApplications(response.data.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllApplications = async () => {
    try {
      const response = await api.get(`/recruitment/applications?status=${filter !== 'all' ? filter : ''}`);
      setApplications(response.data.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShortlist = async (applicationId: number) => {
    try {
      await api.put(`/recruitment/applications/${applicationId}/shortlist`);
      fetchApplications();
    } catch (error) {
      console.error('Error shortlisting applicant:', error);
    }
  };

  const handleReject = async (applicationId: number) => {
    try {
      await api.put(`/recruitment/applications/${applicationId}/reject`, {
        reason: 'Thank you for applying. We will keep your profile for future opportunities.'
      });
      fetchApplications();
    } catch (error) {
      console.error('Error rejecting applicant:', error);
    }
  };

  const handleTag = async (applicationId: number, tag: string) => {
    try {
      await api.put(`/recruitment/applications/${applicationId}/tag`, { tag });
      fetchApplications();
    } catch (error) {
      console.error('Error tagging applicant:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Job Applications</h1>
          
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('applied')}
              className={`px-4 py-2 rounded ${filter === 'applied' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              New
            </button>
            <button
              onClick={() => setFilter('shortlisted')}
              className={`px-4 py-2 rounded ${filter === 'shortlisted' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Shortlisted
            </button>
            <button
              onClick={() => setFilter('interview_scheduled')}
              className={`px-4 py-2 rounded ${filter === 'interview_scheduled' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Interview Scheduled
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="grid gap-4 p-4">
              {applications.map((application: any) => (
                <div key={application.id} className="border rounded-lg p-6 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{application.full_name}</h3>
                      <p className="text-gray-600">{application.email} • {application.phone}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {application.current_position} at {application.current_company}
                      </p>
                      <p className="text-sm text-gray-500">
                        Experience: {application.years_of_experience} years
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 text-xs rounded ${
                          application.status === 'shortlisted'
                            ? 'bg-green-100 text-green-800'
                            : application.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {application.status.replace('_', ' ')}
                      </span>
                      {application.tag && (
                        <span className={`ml-2 px-3 py-1 text-xs rounded ${
                          application.tag === 'hot' ? 'bg-red-100 text-red-800' :
                          application.tag === 'average' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {application.tag.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-700">
                      <strong>Expected Salary:</strong> BDT {application.expected_salary?.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      <strong>Skills:</strong> {application.skills?.join(', ')}
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    {application.resume_url && (
                      <a
                        href={application.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        📄 View Resume
                      </a>
                    )}
                    {application.linkedin_url && (
                      <a
                        href={application.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        💼 LinkedIn
                      </a>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t flex space-x-3">
                    {application.status === 'applied' && (
                      <>
                        <button
                          onClick={() => handleShortlist(application.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Shortlist
                        </button>
                        <button
                          onClick={() => handleReject(application.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <select
                      onChange={(e) => handleTag(application.id, e.target.value)}
                      className="px-4 py-2 border rounded"
                      defaultValue=""
                    >
                      <option value="" disabled>Tag Candidate</option>
                      <option value="hot">🔥 Hot</option>
                      <option value="average">⭐ Average</option>
                      <option value="future">📅 Future</option>
                    </select>
                    <button
                      onClick={() => router.push(`/admin/recruitment/applications/${application.id}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ApplicationsPage;
