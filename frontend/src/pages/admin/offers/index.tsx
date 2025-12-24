import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaGift, FaPlus, FaEdit, FaTrash, FaEye, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useRouter } from 'next/router';

interface Offer {
  id: number;
  name: string;
  description: string;
  offerType: string;
  startTime: string;
  endTime: string;
  priority: number;
  status: string;
  autoApply: boolean;
  currentUsage: number;
  maxUsageTotal: number;
  minCartAmount: number;
  maxDiscountAmount: number;
  conditions: any[];
  rewards: any[];
}

export default function OffersManagement() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    loadOffers();
  }, [filter]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/offers?includeInactive=${filter === 'all'}`);
      setOffers(response.data);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    
    try {
      await apiClient.delete(`/offers/${id}`);
      alert('Offer deleted successfully');
      loadOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      alert('Failed to delete offer');
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await apiClient.put(`/offers/${id}`, { status: newStatus });
      loadOffers();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getOfferTypeBadge = (type: string) => {
    const colors: any = {
      PERCENTAGE: 'bg-blue-100 text-blue-800',
      FLAT_DISCOUNT: 'bg-green-100 text-green-800',
      BOGO: 'bg-purple-100 text-purple-800',
      FREE_PRODUCT: 'bg-pink-100 text-pink-800',
      BUNDLE: 'bg-orange-100 text-orange-800',
      CATEGORY_DISCOUNT: 'bg-indigo-100 text-indigo-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const isActive = (offer: Offer) => {
    const now = new Date();
    const start = new Date(offer.startTime);
    const end = new Date(offer.endTime);
    return offer.status === 'active' && now >= start && now <= end;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-lg">
              <FaGift className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Offer Engine</h1>
              <p className="text-sm text-gray-600">Manage promotions and discounts</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin/offers/create')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <FaPlus />
            Create New Offer
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'active'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active Offers
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Offers
            </button>
          </div>
        </div>

        {/* Offers Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading offers...</div>
          ) : offers.length === 0 ? (
            <div className="p-8 text-center">
              <FaGift className="text-gray-400 text-5xl mx-auto mb-4" />
              <p className="text-gray-600">No offers found</p>
              <button
                onClick={() => router.push('/admin/offers/create')}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Your First Offer
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Offer Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {offers.map((offer) => (
                    <tr key={offer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{offer.name}</div>
                        <div className="text-xs text-gray-500">{offer.description}</div>
                        {offer.autoApply && (
                          <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Auto-Apply
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getOfferTypeBadge(offer.offerType)}`}>
                          {offer.offerType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="text-gray-700">
                          {new Date(offer.startTime).toLocaleDateString()}
                        </div>
                        <div className="text-gray-500 text-xs">
                          to {new Date(offer.endTime).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="text-gray-900 font-semibold">
                          {offer.currentUsage} / {offer.maxUsageTotal || '∞'}
                        </div>
                        {offer.maxUsageTotal && (
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(
                                  (offer.currentUsage / offer.maxUsageTotal) * 100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isActive(offer) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <FaCheckCircle />
                            Live Now
                          </span>
                        ) : offer.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                            <FaClock />
                            Scheduled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                            <FaTimesCircle />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/offers/${offer.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/offers/${offer.id}/edit`)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded transition"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => toggleStatus(offer.id, offer.status)}
                            className={`px-3 py-1 text-xs rounded transition ${
                              offer.status === 'active'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {offer.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(offer.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
