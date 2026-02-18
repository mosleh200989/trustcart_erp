import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import {
  FaSearch, FaEye, FaTrash, FaCheck, FaTruck, FaTimes, FaUndo,
  FaPhone, FaMapMarkerAlt, FaBox, FaChevronDown,
} from 'react-icons/fa';

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface LandingPageOrder {
  id: number;
  uuid: string;
  landing_page_id: number;
  landing_page_title: string;
  landing_page_slug: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  district: string;
  note: string;
  items: OrderItem[];
  total_amount: number;
  payment_method: string;
  status: string;
  admin_note: string;
  created_at: string;
  updated_at: string;
}

interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: FaBox },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: FaCheck },
  { value: 'processing', label: 'Processing', color: 'bg-indigo-100 text-indigo-800', icon: FaBox },
  { value: 'shipped', label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: FaTruck },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800', icon: FaCheck },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: FaTimes },
  { value: 'returned', label: 'Returned', color: 'bg-gray-100 text-gray-800', icon: FaUndo },
];

const getStatusStyle = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

export default function LandingPageOrders() {
  const [orders, setOrders] = useState<LandingPageOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<LandingPageOrder | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;

      const [ordersRes, statsRes] = await Promise.all([
        apiClient.get('/landing-pages/orders/all', { params }),
        apiClient.get('/landing-pages/orders/stats'),
      ]);
      setOrders(ordersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await apiClient.put(`/landing-pages/orders/${orderId}/status`, { status: newStatus });
      fetchData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (orderId: number) => {
    try {
      await apiClient.delete(`/landing-pages/orders/${orderId}`);
      setDeleteConfirm(null);
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Landing Page Orders</h1>
          <p className="text-gray-500 mt-1">Orders placed through product landing pages</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <div className="bg-white rounded-lg shadow p-3 border-l-4 border-blue-500">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 border-l-4 border-yellow-500">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-xl font-bold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 border-l-4 border-blue-400">
              <div className="text-xs text-gray-500">Confirmed</div>
              <div className="text-xl font-bold text-blue-600">{stats.confirmed}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 border-l-4 border-green-500">
              <div className="text-xs text-gray-500">Delivered</div>
              <div className="text-xl font-bold text-green-600">{stats.delivered}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 border-l-4 border-red-400">
              <div className="text-xs text-gray-500">Cancelled</div>
              <div className="text-xl font-bold text-red-600">{stats.cancelled}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 border-l-4 border-purple-500">
              <div className="text-xs text-gray-500">Revenue</div>
              <div className="text-xl font-bold text-purple-600">৳{stats.totalRevenue.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-6">
          {/* Orders Table */}
          <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <FaBox className="mx-auto text-4xl mb-3" />
                <p>No orders found.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const statusInfo = getStatusStyle(order.status);
                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-gray-50 cursor-pointer ${selectedOrder?.id === order.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-3 py-3 text-sm font-medium text-gray-700">#{order.id}</td>
                        <td className="px-3 py-3">
                          <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                          <div className="text-xs text-gray-500">{order.customer_phone}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                            {order.landing_page_slug || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-semibold">
                          ৳{Number(order.total_amount).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{formatDate(order.created_at)}</td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                              className="text-blue-600 hover:text-blue-800 p-1" title="View"
                            >
                              <FaEye />
                            </button>
                            {deleteConfirm === order.id ? (
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleDelete(order.id)} className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">Yes</button>
                                <button onClick={() => setDeleteConfirm(null)} className="text-xs bg-gray-300 px-2 py-0.5 rounded">No</button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(order.id); }}
                                className="text-red-400 hover:text-red-600 p-1" title="Delete"
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Order Detail Panel */}
          {selectedOrder && (
            <div className="w-96 bg-white rounded-lg shadow p-5 sticky top-6 self-start max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">Order #{selectedOrder.id}</h2>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                  <FaTimes />
                </button>
              </div>

              {/* Status Changer */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <div className="relative">
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm appearance-none pr-8 font-medium"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-3 text-gray-400 text-xs pointer-events-none" />
                </div>
              </div>

              {/* Customer Info */}
              <div className="border rounded-lg p-3 mb-4 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer</h3>
                <div className="space-y-2 text-sm">
                  <div className="font-semibold text-gray-800">{selectedOrder.customer_name}</div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaPhone className="text-xs" />
                    <a href={`tel:${selectedOrder.customer_phone}`} className="hover:text-blue-600">
                      {selectedOrder.customer_phone}
                    </a>
                  </div>
                  <div className="flex items-start gap-2 text-gray-600">
                    <FaMapMarkerAlt className="text-xs mt-1 flex-shrink-0" />
                    <div>
                      <div>{selectedOrder.customer_address}</div>
                      <div className="text-gray-500">{selectedOrder.district}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="border rounded-lg p-3 mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</h3>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.name} <span className="text-gray-400">× {item.quantity}</span>
                      </span>
                      <span className="font-medium">৳{item.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>৳{Number(selectedOrder.total_amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment & Source */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="border rounded-lg p-2">
                  <div className="text-xs text-gray-500">Payment</div>
                  <div className="font-medium">{selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : selectedOrder.payment_method}</div>
                </div>
                <div className="border rounded-lg p-2">
                  <div className="text-xs text-gray-500">Source Page</div>
                  <div className="font-medium">{selectedOrder.landing_page_slug || '-'}</div>
                </div>
              </div>

              {/* Customer Note */}
              {selectedOrder.note && (
                <div className="border rounded-lg p-3 mb-4 bg-yellow-50">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Customer Note</h3>
                  <p className="text-sm text-gray-700">{selectedOrder.note}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-400 space-y-1">
                <div>Created: {formatDate(selectedOrder.created_at)}</div>
                <div>Updated: {formatDate(selectedOrder.updated_at)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
