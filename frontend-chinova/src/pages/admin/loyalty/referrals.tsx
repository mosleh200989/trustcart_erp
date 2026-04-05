import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

export default function AdminReferrals() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Not all installs have a dedicated referral admin summary endpoint.
        // Keep this page useful even if it returns 404.
        const res = await apiClient.get('/loyalty/dashboard');
        setSummary(res.data);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
            <p className="text-sm text-gray-600">Campaigns, partners, and referral analytics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/admin/loyalty/referrals/campaigns"
            className="bg-white rounded-lg border p-5 hover:shadow transition"
          >
            <div className="text-lg font-semibold text-gray-900">Referral Campaigns</div>
            <div className="text-sm text-gray-600 mt-1">Reward type, offers, VIP thresholds</div>
          </Link>

          <Link
            href="/admin/loyalty/referrals/partners"
            className="bg-white rounded-lg border p-5 hover:shadow transition"
          >
            <div className="text-lg font-semibold text-gray-900">Referral Partners</div>
            <div className="text-sm text-gray-600 mt-1">Influencer/community codes + reporting</div>
          </Link>

          <Link
            href="/admin/loyalty"
            className="bg-white rounded-lg border p-5 hover:shadow transition"
          >
            <div className="text-lg font-semibold text-gray-900">Loyalty Dashboard</div>
            <div className="text-sm text-gray-600 mt-1">KPIs, reminders, withdrawals</div>
          </Link>
        </div>

        <div className="bg-white rounded-lg border p-5">
          <div className="text-lg font-semibold text-gray-900 mb-3">Quick stats</div>
          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-purple-50 rounded p-3">
                <div className="text-xs text-gray-600">Completed referrals</div>
                <div className="text-xl font-bold text-purple-700">{summary.completed_referrals ?? '-'}</div>
              </div>
              <div className="bg-purple-50 rounded p-3">
                <div className="text-xs text-gray-600">Avg referrals/customer</div>
                <div className="text-xl font-bold text-purple-700">{summary.avg_referrals_per_customer ?? '-'}</div>
              </div>
              <div className="bg-green-50 rounded p-3">
                <div className="text-xs text-gray-600">Total rewards paid</div>
                <div className="text-xl font-bold text-green-700">৳{summary.total_referral_rewards_paid ?? '-'}</div>
              </div>
              <div className="bg-blue-50 rounded p-3">
                <div className="text-xs text-gray-600">Total customers</div>
                <div className="text-xl font-bold text-blue-700">{summary.total_customers ?? '-'}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">No summary available.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
