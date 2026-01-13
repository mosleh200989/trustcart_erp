import { useEffect, useState } from 'react';
import CustomerLayout from '@/layouts/CustomerLayout';
import { auth, loyalty, customers } from '@/services/api';
import { FaShareAlt, FaCopy, FaGift, FaUsers, FaCheckCircle, FaClock, FaWhatsapp, FaFacebook, FaEnvelope } from 'react-icons/fa';

export default function CustomerReferralsPage() {
  const [stats, setStats] = useState<any | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<any | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralLink, setReferralLink] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const loadReferrals = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = await auth.getCurrentUser();
        if (!user) {
          setError('Unable to load referrals. Please login again.');
          setLoading(false);
          return;
        }

        // Get customer details
        const customer = await customers.me();
        
        if (!customer) {
          setError('Customer profile not found.');
          setLoading(false);
          return;
        }

        setCustomerData(customer);

        // Server-driven referral code (stable, from backend)
        try {
          const code = await loyalty.getMyReferralCode();
          setReferralCode(code);
          if (typeof window !== 'undefined') {
            setReferralLink(`${window.location.origin}/register?ref=${code}`);
          }
        } catch (e) {
          console.error('Failed to load referral code:', e);
          // Graceful fallback (should rarely be needed)
          const fallback = `REF${String(customer.id).padStart(6, '0')}`;
          setReferralCode(fallback);
          if (typeof window !== 'undefined') {
            setReferralLink(`${window.location.origin}/register?ref=${fallback}`);
          }
        }

        // Try to load referrals - handle gracefully if not available
        try {
          const [list, summary] = await Promise.all([
            loyalty.getMyReferrals(),
            loyalty.getMyReferralStats(),
          ]);

          setReferrals(list);
          setStats(summary);
        } catch (referralError) {
          console.error('Referral API error:', referralError);
          // Set default empty stats if API fails
          setStats({
            total_referrals: 0,
            completed_referrals: 0,
            pending_referrals: 0,
            total_rewards_earned: 0
          });
        }
      } catch (e) {
        console.error('Error loading referrals:', e);
        setError('Failed to load customer information.');
      } finally {
        setLoading(false);
      }
    };

    loadReferrals();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const message = `Hey! Join TrustCart using my referral link and get amazing deals: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = 'Join TrustCart with my referral!';
    const body = `Hi,\n\nI'd like to invite you to join TrustCart, an amazing shopping platform!\n\nUse my referral link to sign up: ${referralLink}\n\nYou'll get special offers on your first purchase!\n\nBest regards`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaClock },
      registered: { bg: 'bg-blue-100', text: 'text-blue-800', icon: FaUsers },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle },
      expired: { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaClock },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        <Icon className="text-xs" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <CustomerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <FaGift className="text-3xl" />
            <h1 className="text-3xl font-bold">Refer & Earn</h1>
          </div>
          <p className="text-purple-100">
            Invite your friends and earn rewards when they make their first purchase!
          </p>
        </div>

        {loading && (
          <div className="text-gray-500 text-center py-8">Loading referrals...</div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Referral Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border rounded-lg p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Total Referrals</div>
                  <FaUsers className="text-blue-500 text-xl" />
                </div>
                <div className="text-3xl font-bold text-gray-800">{stats?.total_referrals || 0}</div>
              </div>
              
              <div className="bg-white border rounded-lg p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Completed</div>
                  <FaCheckCircle className="text-green-500 text-xl" />
                </div>
                <div className="text-3xl font-bold text-green-600">{stats?.completed_referrals || 0}</div>
              </div>
              
              <div className="bg-white border rounded-lg p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Pending</div>
                  <FaClock className="text-yellow-500 text-xl" />
                </div>
                <div className="text-3xl font-bold text-yellow-600">{stats?.pending_referrals || 0}</div>
              </div>
              
              <div className="bg-white border rounded-lg p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Rewards Earned</div>
                  <FaGift className="text-purple-500 text-xl" />
                </div>
                <div className="text-3xl font-bold text-purple-600">
                  ৳{Number(stats?.total_rewards_earned || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Referral Link Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <FaShareAlt className="text-orange-500 text-xl" />
                <h2 className="text-xl font-bold text-gray-800">Your Referral Link</h2>
              </div>
              
              <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600 mb-2">Your unique referral code:</div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 bg-white border rounded-lg px-4 py-3 font-mono text-lg font-bold text-purple-600">
                    {referralCode}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-semibold"
                  >
                    <FaCopy />
                    {copySuccess ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
                
                <div className="text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                  <strong>How it works:</strong>
                  <ol className="list-decimal ml-5 mt-2 space-y-1">
                    <li>Share your referral link with friends</li>
                    <li>They sign up using your link</li>
                    <li>When they make their first purchase, you both earn rewards!</li>
                  </ol>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600 mb-3">Share via:</div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleShareWhatsApp}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    >
                      <FaWhatsapp className="text-lg" />
                      WhatsApp
                    </button>
                    <button
                      onClick={handleShareFacebook}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <FaFacebook className="text-lg" />
                      Facebook
                    </button>
                    <button
                      onClick={handleShareEmail}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                    >
                      <FaEnvelope className="text-lg" />
                      Email
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral History */}
            {referrals.length > 0 && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">Referral History</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Referral Code</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reward</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {referrals.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{r.referredEmail || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{r.referredPhone || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm text-purple-600 font-semibold">{r.referralCode}</span>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(r.status)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900">৳{Number(r.rewardAmount || 0).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">
                              {r.rewardCredited ? (
                                <span className="text-green-600">
                                  ✓ Credited{r.rewardTransactionId ? ` (#${r.rewardTransactionId})` : ''}
                                  {r.rewardCreditedAt ? ` • ${new Date(r.rewardCreditedAt).toLocaleDateString()}` : ''}
                                </span>
                              ) : (
                                <span className="text-yellow-600">Pending</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {referrals.length === 0 && (
              <div className="bg-white border rounded-lg p-8 text-center">
                <FaUsers className="text-gray-400 text-5xl mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No referrals yet</h3>
                <p className="text-gray-500">Start sharing your referral link to earn rewards!</p>
              </div>
            )}
          </>
        )}
      </div>
    </CustomerLayout>
  );
}

