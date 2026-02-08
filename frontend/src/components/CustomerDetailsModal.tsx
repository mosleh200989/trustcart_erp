import { useState, useEffect } from 'react';
import apiClient from '@/services/api';
import { FaTimes, FaEnvelope, FaPhone, FaMapMarkerAlt, FaTags, FaHistory, FaEye } from 'react-icons/fa';
import AdminOrderDetailsModal from './AdminOrderDetailsModal';

interface CustomerDetailsModalProps {
  customerId: number;
  onClose: () => void;
}

export default function CustomerDetailsModal({ customerId, onClose }: CustomerDetailsModalProps) {
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'orders' | 'activity'>('details');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    loadCustomerDetails();
  }, [customerId]);

  const loadCustomerDetails = async () => {
    try {
      setLoading(true);
      const [customerRes, ordersRes] = await Promise.all([
        apiClient.get(`/customers/${customerId}`),
        apiClient.get(`/sales/orders?customerId=${customerId}&limit=20`).catch(() => ({ data: { items: [] } }))
      ]);
      setCustomer(customerRes.data);
      const ordersData = ordersRes.data?.items || ordersRes.data || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      console.error('Failed to load customer details', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadgeColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 'bg-purple-100 text-purple-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'silver': return 'bg-gray-200 text-gray-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
            <FaTimes size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading customer details...</div>
        ) : !customer ? (
          <div className="p-8 text-center text-gray-500">Customer not found</div>
        ) : (
          <>
            {/* Customer Summary Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                  {(customer.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {customer.name} {customer.lastName || ''}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                    {customer.email && (
                      <span className="flex items-center gap-1">
                        <FaEnvelope className="text-gray-400" /> {customer.email}
                      </span>
                    )}
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <FaPhone className="text-gray-400" /> {customer.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getTierBadgeColor(customer.tier)}`}>
                      {customer.tier || 'Bronze'} Tier
                    </span>
                    <span className="text-sm text-gray-500">
                      ID: #{customer.id}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ${(customer.totalSpent || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Total Spent</div>
                  <div className="text-sm font-medium text-gray-700">
                    {customer.totalOrders || 0} Orders
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex gap-4 px-4">
                {(['details', 'orders', 'activity'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 px-1 border-b-2 text-sm font-medium capitalize ${
                      activeTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-gray-400" /> Address Information
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                      {customer.address ? (
                        <>
                          <p>{customer.address}</p>
                          {customer.city && <p>{customer.city}, {customer.state || ''} {customer.zipCode || ''}</p>}
                          {customer.country && <p>{customer.country}</p>}
                        </>
                      ) : (
                        <p className="text-gray-500">No address on file</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FaTags className="text-gray-400" /> Customer Info
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Member Since</span>
                        <span>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Order</span>
                        <span>{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Loyalty Points</span>
                        <span>{customer.loyaltyPoints || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {customer.status || 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {customer.notes && (
                    <div className="md:col-span-2 space-y-2">
                      <h4 className="font-semibold text-gray-900">Notes</h4>
                      <div className="bg-yellow-50 rounded-lg p-4 text-sm">
                        {customer.notes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <FaHistory className="text-gray-400" /> Order History
                  </h4>
                  {orders.length === 0 ? (
                    <p className="text-gray-500 text-sm">No orders found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-500">Order ID</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-500">Total</th>
                            <th className="px-4 py-2 text-center font-medium text-gray-500">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedOrderId(order.id); setShowOrderModal(true); }}>
                              <td className="px-4 py-2 font-medium">#{order.id}</td>
                              <td className="px-4 py-2">
                                {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeColor(order.status)}`}>
                                  {order.status || 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right font-medium">
                                ${(order.totalAmount || order.total || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order.id); setShowOrderModal(true); }}
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto text-xs"
                                >
                                  <FaEye /> View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="text-center text-gray-500 py-8">
                  <p>Activity tracking coming soon.</p>
                  <p className="text-sm mt-1">View detailed customer interactions and communications.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrderId && (
        <AdminOrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrderId(null);
          }}
          onUpdate={loadCustomerDetails}
        />
      )}
    </div>
  );
}
