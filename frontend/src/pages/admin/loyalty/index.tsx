import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import Link from 'next/link';

interface KPIData {
  total_customers: number;
  silver_members: number;
  gold_members: number;
  first_to_repeat_percentage: number;
  member_conversion_rate: number;
  avg_orders_per_customer: number;
  avg_referrals_per_customer: number;
  avg_customer_lifetime_value: number;
  active_subscriptions: number;
  completed_referrals: number;
  total_referral_rewards_paid: number;
}

export default function LoyaltyKPIDashboard() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      const res = await fetch('http://localhost:3001/loyalty/dashboard');
      const data = await res.json();
      setKpis(data);
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!kpis) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-gray-500">
          Failed to load KPI data
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Loyalty Program KPIs</h1>
          <p className="text-gray-600">Key Performance Indicators & Metrics</p>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-1">Total Customers</div>
            <div className="text-4xl font-bold">{kpis.total_customers}</div>
            <div className="text-xs mt-2 opacity-80">
              All registered customers
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg shadow-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-1 flex items-center gap-2">
              <span>🥈</span>
              <span>Silver Members</span>
            </div>
            <div className="text-4xl font-bold">{kpis.silver_members}</div>
            <div className="text-xs mt-2 opacity-80">
              {((kpis.silver_members / kpis.total_customers) * 100).toFixed(1)}% of total
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-1 flex items-center gap-2">
              <span>🥇</span>
              <span>Gold Members</span>
            </div>
            <div className="text-4xl font-bold">{kpis.gold_members}</div>
            <div className="text-xs mt-2 opacity-80">
              {((kpis.gold_members / kpis.total_customers) * 100).toFixed(1)}% of total
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-1">Member Conversion</div>
            <div className="text-4xl font-bold">{kpis.member_conversion_rate}%</div>
            <div className="text-xs mt-2 opacity-80">
              Customers who became members
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-6">
          {/* First to Repeat Order */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                🔁
              </div>
              <div>
                <h3 className="font-bold text-gray-800">First → Repeat Order</h3>
                <p className="text-sm text-gray-600">Conversion Rate</p>
              </div>
            </div>
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {kpis.first_to_repeat_percentage}%
            </div>
            <div className="text-sm text-gray-600">
              Customers who made 2+ orders
            </div>
          </div>

          {/* Avg Orders per Customer */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                📦
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Avg Orders</h3>
                <p className="text-sm text-gray-600">Per Customer</p>
              </div>
            </div>
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {kpis.avg_orders_per_customer.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">
              Average purchase frequency
            </div>
          </div>

          {/* Customer Lifetime Value */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                💰
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Avg CLV</h3>
                <p className="text-sm text-gray-600">Customer Lifetime Value</p>
              </div>
            </div>
            <div className="text-4xl font-bold text-green-600 mb-2">
              ৳{Math.round(kpis.avg_customer_lifetime_value).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              Average value per customer
            </div>
          </div>
        </div>

        {/* Referral & Subscription Metrics */}
        <div className="grid grid-cols-2 gap-6">
          {/* Referral Program */}
          <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg shadow p-6 border-l-4 border-pink-500">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🎁</span>
              <h3 className="text-xl font-bold">Referral Program</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-600 text-sm mb-1">Completed Referrals</div>
                <div className="text-3xl font-bold text-purple-600">{kpis.completed_referrals}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm mb-1">Avg per Customer</div>
                <div className="text-3xl font-bold text-purple-600">{kpis.avg_referrals_per_customer.toFixed(2)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-gray-600 text-sm mb-1">Total Rewards Paid</div>
                <div className="text-2xl font-bold text-green-600">
                  ৳{Math.round(kpis.total_referral_rewards_paid).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Subscription System */}
          <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🔁</span>
              <h3 className="text-xl font-bold">Monthly Subscriptions</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-600 text-sm mb-1">Active Subscriptions</div>
                <div className="text-3xl font-bold text-blue-600">{kpis.active_subscriptions}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm mb-1">Subscription Rate</div>
                <div className="text-3xl font-bold text-blue-600">
                  {((kpis.active_subscriptions / kpis.total_customers) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-600 mt-2">
                  Customers with recurring monthly orders
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Membership Tier Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-6">Membership Distribution</h3>
          
          <div className="space-y-4">
            {/* None */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">👤 No Membership</span>
                <span className="text-sm font-bold">
                  {kpis.total_customers - kpis.silver_members - kpis.gold_members} 
                  ({(((kpis.total_customers - kpis.silver_members - kpis.gold_members) / kpis.total_customers) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gray-400 rounded-full h-3"
                  style={{ 
                    width: `${((kpis.total_customers - kpis.silver_members - kpis.gold_members) / kpis.total_customers) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Silver */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">🥈 Silver Members</span>
                <span className="text-sm font-bold">
                  {kpis.silver_members} ({((kpis.silver_members / kpis.total_customers) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-gray-300 to-gray-500 rounded-full h-3"
                  style={{ width: `${(kpis.silver_members / kpis.total_customers) * 100}%` }}
                />
              </div>
            </div>

            {/* Gold */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">🥇 Gold Members</span>
                <span className="text-sm font-bold">
                  {kpis.gold_members} ({((kpis.gold_members / kpis.total_customers) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full h-3"
                  style={{ width: `${(kpis.gold_members / kpis.total_customers) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          <Link
            href="/admin/loyalty/members"
            className="bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg p-6 hover:shadow-lg transition-shadow text-center"
          >
            <div className="text-4xl mb-2">👥</div>
            <h3 className="font-bold text-lg mb-1">View All Members</h3>
            <p className="text-sm text-gray-600">Manage memberships</p>
          </Link>

          <Link
            href="/admin/loyalty/referrals"
            className="bg-gradient-to-r from-pink-100 to-pink-200 rounded-lg p-6 hover:shadow-lg transition-shadow text-center"
          >
            <div className="text-4xl mb-2">🎁</div>
            <h3 className="font-bold text-lg mb-1">Referral Program</h3>
            <p className="text-sm text-gray-600">Track referrals & rewards</p>
          </Link>

          <Link
            href="/admin/loyalty/subscriptions"
            className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg p-6 hover:shadow-lg transition-shadow text-center"
          >
            <div className="text-4xl mb-2">🔁</div>
            <h3 className="font-bold text-lg mb-1">Subscriptions</h3>
            <p className="text-sm text-gray-600">Manage recurring orders</p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
