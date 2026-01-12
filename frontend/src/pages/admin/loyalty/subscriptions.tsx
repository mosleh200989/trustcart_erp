import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';

export default function LoyaltySubscriptions() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-800">Loyalty Subscriptions</h1>
          <p className="text-gray-600">Subscription management UI will be added here.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-700">
            This page exists so the admin navigation is not broken.
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/admin/loyalty" className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold">
              Loyalty Dashboard
            </Link>
            <Link href="/admin/loyalty/referrals" className="px-4 py-2 rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-900 font-semibold">
              Referrals
            </Link>
            <Link href="/admin/loyalty/members" className="px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 font-semibold">
              Members
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
