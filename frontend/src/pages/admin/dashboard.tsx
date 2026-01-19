import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import StatCard from '@/components/admin/StatCard';
import { FaBoxes, FaShoppingCart, FaUsers, FaDollarSign, FaTruck, FaChartLine } from 'react-icons/fa';
import apiClient from '@/services/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    lowStockItems: 0
  });
  const [supportStats, setSupportStats] = useState<any>(null);
  const [telephonyStats, setTelephonyStats] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    loadStats();
  }, [router]);

  const loadStats = async () => {
    try {
      // Load stats from API
      const [products, customers, support, telephony] = await Promise.all([
        apiClient.get('/products').catch(() => ({ data: [] })),
        apiClient.get('/customers').catch(() => ({ data: [] })),
        apiClient.get('/support/stats?rangeDays=30').catch(() => ({ data: null })),
        apiClient.get('/telephony/stats?rangeDays=30').catch(() => ({ data: null })),
      ]);

      setStats({
        totalProducts: products.data?.length || 0,
        totalOrders: 0,
        totalCustomers: customers.data?.length || 0,
        totalRevenue: 0,
        pendingOrders: 0,
        lowStockItems: 0
      });

      setSupportStats(support.data || null);
      setTelephonyStats(telephony.data || null);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={FaBoxes}
            color="blue"
            trend={{ value: '12% from last month', isPositive: true }}
          />
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={FaShoppingCart}
            color="green"
            trend={{ value: '8% from last month', isPositive: true }}
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={FaUsers}
            color="purple"
            trend={{ value: '5% from last month', isPositive: true }}
          />
          <StatCard
            title="Revenue"
            value={`৳${stats.totalRevenue.toLocaleString()}`}
            icon={FaDollarSign}
            color="yellow"
            trend={{ value: '15% from last month', isPositive: true }}
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={FaTruck}
            color="red"
          />
          <StatCard
            title="Low Stock Items"
            value={stats.lowStockItems}
            icon={FaChartLine}
            color="indigo"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Orders</h2>
            <div className="space-y-3">
              <p className="text-gray-500 text-center py-4">No recent orders</p>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Top Products</h2>
            <div className="space-y-3">
              <p className="text-gray-500 text-center py-4">No data available</p>
            </div>
          </div>
        </div>

        {/* Support & Call Center */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Support & Call Center (Last 30 days)</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Support Tickets</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">{supportStats?.totalOpen ?? '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">{supportStats?.total ?? '—'}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">By Status</p>
                <div className="space-y-1">
                  {(supportStats?.byStatus || []).map((r: any) => (
                    <div key={r.status} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{r.status}</span>
                      <span className="font-semibold text-gray-900">{r.count}</span>
                    </div>
                  ))}
                  {(!supportStats?.byStatus || supportStats.byStatus.length === 0) && (
                    <p className="text-sm text-gray-500">No ticket data.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Telephony</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Calls</p>
                  <p className="text-2xl font-bold text-gray-900">{telephonyStats?.total ?? '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {telephonyStats?.avgDurationSeconds != null ? `${Math.round(telephonyStats.avgDurationSeconds)}s` : '—'}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">By Status</p>
                <div className="space-y-1">
                  {(telephonyStats?.byStatus || []).map((r: any) => (
                    <div key={r.status} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{r.status}</span>
                      <span className="font-semibold text-gray-900">{r.count}</span>
                    </div>
                  ))}
                  {(!telephonyStats?.byStatus || telephonyStats.byStatus.length === 0) && (
                    <p className="text-sm text-gray-500">No call data.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
