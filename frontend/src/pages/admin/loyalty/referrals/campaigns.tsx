import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

type RewardType = 'wallet' | 'points' | 'coupon' | 'free_product' | 'membership';

type Campaign = {
  id: string;
  name: string;
  is_active: boolean;
  reward_type: RewardType;
  reward_referrer_amount?: number;
  reward_referred_amount?: number;
  reward_referrer_points?: number;
  reward_referred_points?: number;
  referrer_offer_id?: number | null;
  referred_offer_id?: number | null;
  vip_referrals_threshold?: number | null;
  vip_membership_tier?: 'none' | 'silver' | 'gold' | 'permanent' | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export default function AdminReferralCampaigns() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<any>({
    name: '',
    is_active: true,
    reward_type: 'wallet',
    reward_referrer_amount: 0,
    reward_referred_amount: 0,
    reward_referrer_points: 0,
    reward_referred_points: 0,
    referrer_offer_id: '',
    referred_offer_id: '',
    vip_referrals_threshold: '',
    vip_membership_tier: 'none',
    starts_at: '',
    ends_at: '',
  });

  const rewardTypes = useMemo(
    () => [
      { value: 'wallet', label: 'Wallet' },
      { value: 'points', label: 'Points' },
      { value: 'coupon', label: 'Coupon (Offer Code)' },
      { value: 'free_product', label: 'Free Product (via Offer)' },
      { value: 'membership', label: 'VIP/Membership' },
    ],
    [],
  );

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/loyalty/referral-campaigns?includeInactive=true');
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load campaigns', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: '',
      is_active: true,
      reward_type: 'wallet',
      reward_referrer_amount: 0,
      reward_referred_amount: 0,
      reward_referrer_points: 0,
      reward_referred_points: 0,
      referrer_offer_id: '',
      referred_offer_id: '',
      vip_referrals_threshold: '',
      vip_membership_tier: 'none',
      starts_at: '',
      ends_at: '',
    });
  };

  const startEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name ?? '',
      is_active: Boolean(c.is_active),
      reward_type: (c.reward_type ?? 'wallet') as RewardType,
      reward_referrer_amount: Number((c as any).reward_referrer_amount ?? 0),
      reward_referred_amount: Number((c as any).reward_referred_amount ?? 0),
      reward_referrer_points: Number((c as any).reward_referrer_points ?? 0),
      reward_referred_points: Number((c as any).reward_referred_points ?? 0),
      referrer_offer_id: c.referrer_offer_id ?? '',
      referred_offer_id: c.referred_offer_id ?? '',
      vip_referrals_threshold: c.vip_referrals_threshold ?? '',
      vip_membership_tier: (c.vip_membership_tier ?? 'none') as any,
      starts_at: c.starts_at ? String(c.starts_at).slice(0, 10) : '',
      ends_at: c.ends_at ? String(c.ends_at).slice(0, 10) : '',
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        is_active: Boolean(form.is_active),
        reward_type: form.reward_type,
        reward_referrer_amount: Number(form.reward_referrer_amount || 0),
        reward_referred_amount: Number(form.reward_referred_amount || 0),
        reward_referrer_points: Number(form.reward_referrer_points || 0),
        reward_referred_points: Number(form.reward_referred_points || 0),
        referrer_offer_id: form.referrer_offer_id ? Number(form.referrer_offer_id) : null,
        referred_offer_id: form.referred_offer_id ? Number(form.referred_offer_id) : null,
        vip_referrals_threshold: form.vip_referrals_threshold ? Number(form.vip_referrals_threshold) : null,
        vip_membership_tier: form.vip_membership_tier || 'none',
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      };

      if (editing?.id) {
        await apiClient.put(`/loyalty/referral-campaigns/${editing.id}`, payload);
      } else {
        await apiClient.post('/loyalty/referral-campaigns', payload);
      }

      await load();
      resetForm();
      alert('Saved');
    } catch (e) {
      console.error('Failed to save campaign', e);
      alert('Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referral Campaigns</h1>
            <p className="text-sm text-gray-600">Configure referral reward types and rules</p>
          </div>
          <Link href="/admin/loyalty/referrals" className="text-sm text-blue-600 hover:underline">
            ← Back
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border rounded-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Campaigns</div>
              <button
                onClick={load}
                className="text-sm px-3 py-2 rounded border hover:bg-gray-50"
                disabled={loading}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-4 text-sm text-gray-600">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">No campaigns found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2">Type</th>
                      <th className="text-left px-4 py-2">Active</th>
                      <th className="text-right px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                        <td className="px-4 py-2 text-gray-700">{c.reward_type}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {c.is_active ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => startEdit(c)}
                            className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border rounded-lg">
            <div className="p-4 border-b">
              <div className="font-semibold">{editing ? 'Edit campaign' : 'New campaign'}</div>
            </div>

            <div className="p-4 space-y-3">
              <label className="block">
                <div className="text-xs text-gray-600 mb-1">Name</div>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. Default Referral"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => setForm((p: any) => ({ ...p, is_active: e.target.checked }))}
                />
                Active
              </label>

              <label className="block">
                <div className="text-xs text-gray-600 mb-1">Reward type</div>
                <select
                  value={form.reward_type}
                  onChange={(e) => setForm((p: any) => ({ ...p, reward_type: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  {rewardTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">Referrer amount</div>
                  <input
                    type="number"
                    value={form.reward_referrer_amount}
                    onChange={(e) => setForm((p: any) => ({ ...p, reward_referrer_amount: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">Referred amount</div>
                  <input
                    type="number"
                    value={form.reward_referred_amount}
                    onChange={(e) => setForm((p: any) => ({ ...p, reward_referred_amount: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">Referrer points</div>
                  <input
                    type="number"
                    value={form.reward_referrer_points}
                    onChange={(e) => setForm((p: any) => ({ ...p, reward_referrer_points: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">Referred points</div>
                  <input
                    type="number"
                    value={form.reward_referred_points}
                    onChange={(e) => setForm((p: any) => ({ ...p, reward_referred_points: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">Referrer offer ID</div>
                  <input
                    value={form.referrer_offer_id}
                    onChange={(e) => setForm((p: any) => ({ ...p, referrer_offer_id: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="(optional)"
                  />
                </label>
                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">Referred offer ID</div>
                  <input
                    value={form.referred_offer_id}
                    onChange={(e) => setForm((p: any) => ({ ...p, referred_offer_id: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="(optional)"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">VIP threshold</div>
                  <input
                    value={form.vip_referrals_threshold}
                    onChange={(e) => setForm((p: any) => ({ ...p, vip_referrals_threshold: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="(optional)"
                  />
                </label>
                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">VIP tier</div>
                  <select
                    value={form.vip_membership_tier}
                    onChange={(e) => setForm((p: any) => ({ ...p, vip_membership_tier: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="none">None</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">Starts at</div>
                  <input
                    type="date"
                    value={form.starts_at}
                    onChange={(e) => setForm((p: any) => ({ ...p, starts_at: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">Ends at</div>
                  <input
                    type="date"
                    value={form.ends_at}
                    onChange={(e) => setForm((p: any) => ({ ...p, ends_at: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={save}
                  disabled={saving || !String(form.name || '').trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2 disabled:bg-gray-400"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={resetForm} className="px-3 py-2 rounded border hover:bg-gray-50">
                  Clear
                </button>
              </div>

              <div className="text-xs text-gray-500">
                Tip: For coupon/free-product rewards, create an Offer in Offers module and set offer IDs here.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
