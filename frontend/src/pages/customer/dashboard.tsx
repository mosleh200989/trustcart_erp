import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import CustomerLayout from '@/layouts/CustomerLayout';
import apiClient, { auth, customers, sales } from '@/services/api';
import { FaShoppingCart, FaBox, FaClock, FaCheckCircle, FaTimesCircle, FaArrowRight, FaStore } from 'react-icons/fa';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalSpent: number;
}

interface RecentOrder {
  id: number;
  salesOrderNumber: string;
  totalAmount: number;
  status: string;
  orderDate: string;
}

export default function CustomerAccountDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalSpent: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const user = await auth.getCurrentUser();
      if (!user || !user.email) {
        setLoading(false);
        return;
      }

      // Get customer info
      const list = await customers.list();
      const customer = (list as any[]).find((c) => c.email === user.email);
      if (customer) {
        setCustomerName(`${customer.firstName || ''} ${customer.lastName || ''}`.trim());
      }

      // Get all orders
      const allOrders = await sales.list();
      const myOrders = (allOrders as any[]).filter(
        (o) => o.customerId === customer?.id,
      );

      // Calculate stats
      const totalOrders = myOrders.length;
      const pendingOrders = myOrders.filter(o => o.status === 'pending').length;
      const completedOrders = myOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
      const cancelledOrders = myOrders.filter(o => o.status === 'cancelled').length;
      const totalSpent = myOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

      setStats({
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalSpent,
      });

      // Get recent orders (last 5)
      const sortedOrders = myOrders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setRecentOrders(sortedOrders);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <CustomerLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{customerName ? `, ${customerName}` : ''}!
          </h1>
          <p className="text-orange-100 mb-4">
            Manage your orders, profile, and explore our products from your dashboard.
          </p>
          <button
            onClick={() => router.push('/products')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition"
          >
            <FaStore /> Start Shopping
            <FaArrowRight />
          </button>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading dashboard...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <FaShoppingCart className="text-blue-600 text-2xl" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending Orders</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.pendingOrders}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <FaClock className="text-yellow-600 text-2xl" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.completedOrders}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <FaCheckCircle className="text-green-600 text-2xl" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                    <p className="text-2xl font-bold text-gray-900">৳{stats.totalSpent.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <FaBox className="text-purple-600 text-2xl" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
                <button
                  onClick={() => router.push('/customer/orders')}
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                >
                  View All <FaArrowRight />
                </button>
              </div>

              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <FaShoppingCart className="mx-auto text-gray-300 text-5xl mb-3" />
                  <p className="text-gray-500 mb-4">No orders yet</p>
                  <button
                    onClick={() => router.push('/products')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                  >
                    <FaStore /> Shop Now
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Order Number</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-800 font-medium">{order.salesOrderNumber}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800 font-semibold">
                            ৳{Number(order.totalAmount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => router.push('/customer/orders')}
                              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/customer/profile')}
                className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition"
              >
                <h3 className="font-semibold text-gray-900 mb-2">My Profile</h3>
                <p className="text-sm text-gray-600">Update your personal information</p>
              </button>

              <button
                onClick={() => router.push('/customer/addresses')}
                className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition"
              >
                <h3 className="font-semibold text-gray-900 mb-2">Addresses</h3>
                <p className="text-sm text-gray-600">Manage your delivery addresses</p>
              </button>

              <button
                onClick={() => router.push('/customer/support')}
                className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition"
              >
                <h3 className="font-semibold text-gray-900 mb-2">Support</h3>
                <p className="text-sm text-gray-600">Get help with your orders</p>
              </button>
            </div>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
