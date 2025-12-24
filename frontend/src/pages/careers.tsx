import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import apiClient from '@/services/api';

const CareersPage = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    category: '',
    location: '',
    job_type: ''
  });

  useEffect(() => {
    fetchJobs();
  }, [filter]);

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      if (filter.location) params.append('location', filter.location);
      if (filter.job_type) params.append('job_type', filter.job_type);

      const response = await apiClient.get(`/recruitment/jobs/published?${params.toString()}`);
      setJobs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4">Join Our Team</h1>
          <p className="text-xl">Build your career with TrustCart ERP</p>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">All Categories</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="HR">Human Resources</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                value={filter.location}
                onChange={(e) => setFilter({ ...filter, location: e.target.value })}
                placeholder="Search location..."
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Job Type</label>
              <select
                value={filter.job_type}
                onChange={(e) => setFilter({ ...filter, job_type: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">All Types</option>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="remote">Remote</option>
              </select>
            </div>
          </div>
        </div>

        {/* Job Listings */}
        {loading ? (
          <div className="text-center py-12">Loading jobs...</div>
        ) : (
          <div className="grid gap-6">
            {jobs.map((job: any) => (
              <div key={job.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h2>
                    <div className="flex space-x-4 text-sm text-gray-600">
                      <span>📍 {job.location}</span>
                      <span>📂 {job.category}</span>
                      <span>💼 {job.job_type.replace('-', ' ')}</span>
                    </div>
                  </div>
                  <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                    {job.vacancies} Position{job.vacancies > 1 ? 's' : ''}
                  </span>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    {job.min_salary && job.max_salary && (
                      <span className="font-medium">
                        💰 {job.currency} {job.min_salary.toLocaleString()} - {job.max_salary.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/careers/${job.slug}`)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    View Details & Apply
                  </button>
                </div>
              </div>
            ))}

            {jobs.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                <p className="text-xl">No jobs found matching your criteria.</p>
                <p className="mt-2">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CareersPage;
