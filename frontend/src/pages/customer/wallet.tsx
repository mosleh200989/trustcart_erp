import { useEffect, useState } from 'react';
import CustomerLayout from '@/layouts/CustomerLayout';
import { auth, loyalty } from '@/services/api';

interface WalletSummary {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

export default function CustomerWalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWallet = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = await auth.getCurrentUser();
        if (!user || !user.id) {
          setError('Unable to load wallet. Please login again.');
          setLoading(false);
          return;
        }

        const summary = await loyalty.getWallet(user.id);
        const tx = await loyalty.getWalletTransactions(user.id, 20);

        setWallet({
          balance: Number(summary.balance || 0),
          totalEarned: Number(summary.totalEarned || summary.total_earned || 0),
          totalSpent: Number(summary.totalSpent || summary.total_spent || 0),
        });
        setTransactions(tx);
      } catch (e) {
        console.error('Error loading wallet:', e);
        setError('Failed to load wallet information.');
      } finally {
        setLoading(false);
      }
    };

    loadWallet();
  }, []);

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Wallet & Points</h1>
        <p className="text-gray-600 text-sm">
          View your wallet balance, earnings, and spending history.
        </p>

        {loading && (
          <div className="text-gray-500 text-sm">Loading wallet...</div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {wallet && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Wallet Balance</div>
              <div className="text-2xl font-bold text-green-600">
                ৳ {wallet.balance.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Total Earned</div>
              <div className="text-lg font-semibold text-gray-800">
                ৳ {wallet.totalEarned.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Total Spent</div>
              <div className="text-lg font-semibold text-gray-800">
                ৳ {wallet.totalSpent.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <div className="bg-white border rounded-lg overflow-hidden text-sm">
            <div className="px-4 py-2 border-b font-semibold text-gray-700 text-sm">
              Recent Transactions
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2 text-gray-600">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}
                    </td>
                    <td className="px-4 py-2 text-gray-800 capitalize">{t.transactionType}</td>
                    <td className="px-4 py-2 text-gray-800">
                      ৳ {Number(t.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{t.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

