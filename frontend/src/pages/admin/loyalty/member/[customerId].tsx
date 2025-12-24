import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import Link from 'next/link';

interface MembershipData {
  id: number;
  customerId: number;
  membershipTier: 'none' | 'silver' | 'gold';
  discountPercentage: number;
  currentMonthSpend: number;
  totalMonthlySpend: number;
  freeDeliveryCount: number;
  freeDeliveryUsed: number;
  priceLockEnabled: boolean;
}

interface WalletData {
  id: number;
  customerId: number;
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

interface ReferralStats {
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  total_rewards_earned: number;
}

interface Referral {
  id: number;
  referredEmail: string;
  referredPhone: string;
  referralCode: string;
  status: string;
  rewardAmount: number;
  createdAt: string;
}

interface GroceryList {
  id: number;
  listName: string;
  isSubscription: boolean;
  subscriptionDay: number;
  nextOrderDate: string;
  totalOrdersPlaced: number;
}

export default function MembershipDashboard() {
  const router = useRouter();
  const { customerId } = router.query;
  
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'referral' | 'grocery'>('overview');

  useEffect(() => {
    if (customerId) {
      loadData();
    }
  }, [customerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membershipRes, walletRes, referralStatsRes, referralsRes, groceryRes] = await Promise.all([
        fetch(`http://localhost:3001/loyalty/membership/${customerId}`),
        fetch(`http://localhost:3001/loyalty/wallet/${customerId}`),
        fetch(`http://localhost:3001/loyalty/referrals/${customerId}/stats`),
        fetch(`http://localhost:3001/loyalty/referrals/${customerId}`),
        fetch(`http://localhost:3001/loyalty/grocery-lists/${customerId}`),
      ]);

      const [membershipData, walletData, referralStatsData, referralsData, groceryData] = await Promise.all([
        membershipRes.json(),
        walletRes.json(),
        referralStatsRes.json(),
        referralsRes.json(),
        groceryRes.json(),
      ]);

      setMembership(membershipData);
      setWallet(walletData);
      setReferralStats(referralStatsData);
      setReferrals(referralsData);
      setGroceryLists(groceryData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !membership) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  const tierColor = {
    none: 'bg-gray-100 text-gray-800 border-gray-300',
    silver: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900 border-gray-500',
    gold: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 border-yellow-700',
  }[membership.membershipTier];

  const tierIcon = {
    none: '👤',
    silver: '🥈',
    gold: '🥇',
  }[membership.membershipTier];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className={`rounded-lg shadow-lg p-6 border-4 ${tierColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{tierIcon}</span>
                <h1 className="text-3xl font-bold uppercase">{membership.membershipTier} Member</h1>
              </div>
              <div className="text-sm opacity-90">
                Current Month Spend: ৳{membership.currentMonthSpend?.toLocaleString() || 0}
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{membership.discountPercentage}%</div>
              <div className="text-sm opacity-90">Discount</div>
            </div>
          </div>

          {/* Progress to next tier */}
          {membership.membershipTier === 'none' && (
            <div className="mt-4 bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="text-sm mb-2">Progress to Silver (৳5,000/month)</div>
              <div className="bg-white/30 rounded-full h-3">
                <div 
                  className="bg-white rounded-full h-3 transition-all"
                  style={{ width: `${Math.min((membership.currentMonthSpend / 5000) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs mt-1">
                ৳{Math.max(5000 - membership.currentMonthSpend, 0).toLocaleString()} more to Silver
              </div>
            </div>
          )}

          {membership.membershipTier === 'silver' && (
            <div className="mt-4 bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="text-sm mb-2">Progress to Gold (৳5,001+/month)</div>
              <div className="text-xs">
                Just ৳{Math.max(5001 - membership.currentMonthSpend, 0).toLocaleString()} more this month!
              </div>
            </div>
          )}
        </div>

        {/* Membership Benefits */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm opacity-90">Wallet Balance</div>
            <div className="text-3xl font-bold">৳{wallet?.balance || 0}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="text-2xl mb-2">🎁</div>
            <div className="text-sm opacity-90">Total Earned</div>
            <div className="text-3xl font-bold">৳{wallet?.totalEarned || 0}</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm opacity-90">Referrals</div>
            <div className="text-3xl font-bold">{referralStats?.completed_referrals || 0}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
            <div className="text-2xl mb-2">🔁</div>
            <div className="text-sm opacity-90">Subscriptions</div>
            <div className="text-3xl font-bold">
              {groceryLists?.filter(l => l.isSubscription).length || 0}
            </div>
          </div>
        </div>

        {/* Benefits Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Silver Benefits */}
          {membership.membershipTier === 'silver' && (
            <>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-400">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🥈</span>
                  <h3 className="font-bold text-lg">Silver Benefits</h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span>{membership.discountPercentage}% Lifetime Discount</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span>Priority Customer Support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span>Early Access to Sales</span>
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* Gold Benefits */}
          {membership.membershipTier === 'gold' && (
            <>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🥇</span>
                  <h3 className="font-bold text-lg">Gold Benefits</h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span>{membership.discountPercentage}% Lifetime Discount</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span>Free Delivery ({membership.freeDeliveryCount - membership.freeDeliveryUsed}/{membership.freeDeliveryCount} left)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span>Birthday & Eid Gifts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span>Price Lock Protection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span>VIP Support Priority</span>
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* Referral Program */}
          <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg shadow p-6 border-l-4 border-pink-500">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎁</span>
              <h3 className="font-bold text-lg">Refer & Earn</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-purple-600 font-bold">1 Referral</span>
                <span>= ৳100 Wallet</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-600 font-bold">5 Referrals</span>
                <span>= Free Product</span>
              </li>
            </ul>
            <div className="mt-4">
              <div className="text-xs text-gray-600 mb-1">Your Progress</div>
              <div className="bg-white rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-full h-2"
                  style={{ width: `${Math.min((referralStats?.completed_referrals || 0) / 5 * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {referralStats?.completed_referrals || 0}/5 completed
              </div>
            </div>
          </div>

          {/* Grocery Subscription */}
          <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🛒</span>
              <h3 className="font-bold text-lg">Monthly Grocery</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✅</span>
                <span>One-click Reorder</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✅</span>
                <span>Auto Monthly Subscription</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✅</span>
                <span>Reminder Automation</span>
              </li>
            </ul>
            <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Create List
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex gap-2 p-2">
              {[
                { key: 'overview', label: '📊 Overview' },
                { key: 'referral', label: '👥 Referrals', badge: referralStats?.total_referrals },
                { key: 'grocery', label: '🛒 Grocery Lists', badge: groceryLists?.length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-2 bg-white text-purple-600 px-2 py-0.5 rounded-full text-xs font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-lg mb-4">Wallet Activity</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Current Balance</dt>
                        <dd className="font-bold text-green-600">৳{wallet?.balance || 0}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Total Earned</dt>
                        <dd className="font-bold">৳{wallet?.totalEarned || 0}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Total Spent</dt>
                        <dd className="font-bold">৳{wallet?.totalSpent || 0}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-4">Membership Stats</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Current Tier</dt>
                        <dd className="font-bold uppercase">{membership.membershipTier}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Discount Rate</dt>
                        <dd className="font-bold">{membership.discountPercentage}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">This Month Spend</dt>
                        <dd className="font-bold">৳{membership.currentMonthSpend?.toLocaleString() || 0}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}

            {/* Referral Tab */}
            {activeTab === 'referral' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Your Referrals</h3>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                    ➕ Invite Friend
                  </button>
                </div>

                <div className="space-y-3">
                  {referrals.map(ref => (
                    <div key={ref.id} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{ref.referredEmail || ref.referredPhone}</div>
                          <div className="text-sm text-gray-600">Code: {ref.referralCode}</div>
                        </div>
                        <div className="text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            ref.status === 'completed' ? 'bg-green-100 text-green-800' :
                            ref.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ref.status}
                          </span>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-green-600">৳{ref.rewardAmount}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(ref.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grocery Tab */}
            {activeTab === 'grocery' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Monthly Grocery Lists</h3>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                    ➕ Create List
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {groceryLists.map(list => (
                    <div key={list.id} className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-lg">{list.listName}</h4>
                          {list.isSubscription && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                              Subscription Active
                            </span>
                          )}
                        </div>
                        <div className="text-2xl">🛒</div>
                      </div>
                      <dl className="space-y-2 text-sm">
                        {list.isSubscription && (
                          <>
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Delivery Day:</dt>
                              <dd className="font-semibold">{list.subscriptionDay}th of month</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Next Order:</dt>
                              <dd className="font-semibold">
                                {list.nextOrderDate ? new Date(list.nextOrderDate).toLocaleDateString() : 'Not set'}
                              </dd>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Total Orders:</dt>
                          <dd className="font-semibold">{list.totalOrdersPlaced}</dd>
                        </div>
                      </dl>
                      <div className="flex gap-2 mt-4">
                        <button className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm">
                          Reorder Now
                        </button>
                        <button className="flex-1 border border-blue-600 text-blue-600 py-2 rounded hover:bg-blue-50 text-sm">
                          Edit List
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
