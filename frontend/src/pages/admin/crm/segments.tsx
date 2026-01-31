import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useRouter } from 'next/router';
import { useToast } from '@/contexts/ToastContext';

interface CustomerSegment {
  id: number;
  name: string;
  description: string;
  segmentType: 'manual' | 'dynamic';
  criteria: any;
  color: string;
  isActive: boolean;
  customerCount: number;
  createdAt: string;
  updatedAt: string;
  lastCalculatedAt?: string;
}

export default function CustomerSegmentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<CustomerSegment[]>('/crm/segments');
      const data = Array.isArray(res.data) ? res.data : [];
      setSegments(data);
    } catch (error) {
      console.error('Failed to load segments', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSegment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this segment?')) return;

    try {
      await apiClient.delete(`/crm/segments/${id}`);
      loadSegments();
    } catch (error) {
      console.error('Failed to delete segment', error);
      toast.error('Failed to delete segment');
    }
  };

  const handleRecalculateSegment = async (id: number) => {
    try {
      await apiClient.post(`/crm/segments/${id}/calculate`);
      loadSegments();
      toast.success('Segment recalculated successfully');
    } catch (error) {
      console.error('Failed to recalculate segment', error);
      toast.error('Failed to recalculate segment');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Customer Segments</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            New Segment
          </button>
        </div>

        {/* Segments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-gray-500">Loading...</p>
          ) : segments.length === 0 ? (
            <p className="col-span-full text-gray-500">No segments found</p>
          ) : (
            segments.map((segment) => (
              <div
                key={segment.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-800">{segment.name}</h3>
                      <span className="text-sm text-gray-500 capitalize">{segment.segmentType}</span>
                    </div>
                  </div>
                  {segment.isActive && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{segment.description}</p>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="text-2xl font-bold text-blue-600">{segment.customerCount}</div>
                  <div className="text-xs text-gray-500">Customers</div>
                </div>

                {segment.lastCalculatedAt && (
                  <div className="text-xs text-gray-500 mb-4">
                    Last calculated: {new Date(segment.lastCalculatedAt).toLocaleDateString()}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => router.push(`/admin/crm/segments/${segment.id}`)}
                    className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm"
                  >
                    View Details
                  </button>
                  {segment.segmentType === 'dynamic' && (
                    <button
                      onClick={() => handleRecalculateSegment(segment.id)}
                      className="text-green-600 hover:bg-green-50 px-3 py-1 rounded text-sm"
                    >
                      Recalculate
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSegment(segment.id)}
                    className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm col-span-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <SegmentModal
            onClose={() => setShowModal(false)}
            onSaved={() => {
              setShowModal(false);
              loadSegments();
            }}
            toast={toast}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function SegmentModal({
  onClose,
  onSaved,
  toast,
}: {
  onClose: () => void;
  onSaved: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    segmentType: 'manual' as 'manual' | 'dynamic',
    color: '#3B82F6',
    criteria: {
      location: '',
      minOrderValue: '',
      minOrderCount: '',
      lastOrderDays: '',
      tier: '',
      tags: '',
    },
  });

  const handleSave = async () => {
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description,
        segmentType: formData.segmentType,
        color: formData.color,
      };

      if (formData.segmentType === 'dynamic') {
        // Only include non-empty criteria
        const criteria: any = {};
        if (formData.criteria.location) criteria.location = formData.criteria.location;
        if (formData.criteria.minOrderValue) criteria.minOrderValue = Number(formData.criteria.minOrderValue);
        if (formData.criteria.minOrderCount) criteria.minOrderCount = Number(formData.criteria.minOrderCount);
        if (formData.criteria.lastOrderDays) criteria.lastOrderDays = Number(formData.criteria.lastOrderDays);
        if (formData.criteria.tier) criteria.tier = formData.criteria.tier;
        if (formData.criteria.tags) criteria.tags = formData.criteria.tags.split(',').map(t => t.trim());
        payload.criteria = criteria;
      }

      await apiClient.post('/crm/segments', payload);
      onSaved();
    } catch (error) {
      console.error('Failed to create segment', error);
      toast.error('Failed to create segment');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h3 className="text-xl font-semibold mb-4">New Segment</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Segment Type</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.segmentType}
                onChange={(e) => setFormData({ ...formData, segmentType: e.target.value as any })}
              >
                <option value="manual">Manual</option>
                <option value="dynamic">Dynamic (Auto-calculated)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
          </div>

          {formData.segmentType === 'dynamic' && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-800 mb-3">Dynamic Criteria</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.criteria.location}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        criteria: { ...formData.criteria, location: e.target.value },
                      })
                    }
                    placeholder="e.g., New York"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Min Order Value</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={formData.criteria.minOrderValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          criteria: { ...formData.criteria, minOrderValue: e.target.value },
                        })
                      }
                      placeholder="e.g., 1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Min Order Count</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={formData.criteria.minOrderCount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          criteria: { ...formData.criteria, minOrderCount: e.target.value },
                        })
                      }
                      placeholder="e.g., 5"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Last Order Within (days)</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={formData.criteria.lastOrderDays}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          criteria: { ...formData.criteria, lastOrderDays: e.target.value },
                        })
                      }
                      placeholder="e.g., 30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Customer Tier</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={formData.criteria.tier}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          criteria: { ...formData.criteria, tier: e.target.value },
                        })
                      }
                    >
                      <option value="">Any Tier</option>
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.criteria.tags}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        criteria: { ...formData.criteria, tags: e.target.value },
                      })
                    }
                    placeholder="e.g., vip, wholesale"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Leave criteria empty to not filter by that field. All non-empty criteria will be combined with AND logic.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Segment
          </button>
        </div>
      </div>
    </div>
  );
}
