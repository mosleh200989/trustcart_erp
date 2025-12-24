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
      const [products, customers] = await Promise.all([
        apiClient.get('/products').catch(() => ({ data: [] })),
        apiClient.get('/customers').catch(() => ({ data: [] }))
      ]);

      setStats({
        totalProducts: products.data?.length || 0,
        totalOrders: 0,
        totalCustomers: customers.data?.length || 0,
        totalRevenue: 0,
        pendingOrders: 0,
        lowStockItems: 0
      });
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
      </div>
    </AdminLayout>
  );
}
