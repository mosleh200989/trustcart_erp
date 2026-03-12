import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaSave, FaPlus, FaTrash } from 'react-icons/fa';
import { useToast } from '@/contexts/ToastContext';

interface SlabRow {
  agentTier: string;
  slabType: string;
  minOrderCount: string;
  maxOrderCount: string;
  commissionAmount: string;
}

const TIERS = [
  { value: 'silver', label: 'Silver', icon: '🥈', color: 'gray' },
  { value: 'gold', label: 'Gold', icon: '🥇', color: 'yellow' },
  { value: 'platinum', label: 'Platinum', icon: '💎', color: 'blue' },
  { value: 'website_sale', label: 'Website Sale', icon: '🌐', color: 'green' },
];

const SLAB_TYPES = [
  { value: 'order', label: 'Order Count', icon: '📦' },
  { value: 'upsell', label: 'Upsell Count', icon: '📈' },
  { value: 'cross_sell', label: 'Cross-sell Count', icon: '🔄' },
];

const emptySlabRow = (tier: string, slabType: string): SlabRow => ({
  agentTier: tier,
  slabType,
  minOrderCount: '',
  maxOrderCount: '',
  commissionAmount: '',
});

export default function CommissionSettingsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'agent' | 'team_leader'>('agent');
  const [agentSlabs, setAgentSlabs] = useState<SlabRow[]>([]);
  const [teamLeaderSlabs, setTeamLeaderSlabs] = useState<SlabRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSlabs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/crm/commissions/slabs');
      const data = response.data;

      const mapSlabs = (slabs: any[]): SlabRow[] => {
        if (!slabs || slabs.length === 0) {
          // Start with one empty row per tier per slab type
          const rows: SlabRow[] = [];
          TIERS.forEach(t => SLAB_TYPES.forEach(st => rows.push(emptySlabRow(t.value, st.value))));
          return rows;
        }
        return slabs.map((s: any) => ({
          agentTier: s.agentTier,
          slabType: s.slabType || 'order',
          minOrderCount: String(Number(s.minOrderCount)),
          maxOrderCount: s.maxOrderCount ? String(Number(s.maxOrderCount)) : '',
          commissionAmount: String(Number(s.commissionAmount)),
        }));
      };

      setAgentSlabs(mapSlabs(data.agent));
      setTeamLeaderSlabs(mapSlabs(data.teamLeader));
    } catch (error) {
      console.error('Failed to load slabs:', error);
      toast.error('Failed to load commission settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlabs();
  }, []);

  const getCurrentSlabs = () => activeTab === 'agent' ? agentSlabs : teamLeaderSlabs;
  const setCurrentSlabs = (slabs: SlabRow[]) => {
    if (activeTab === 'agent') setAgentSlabs(slabs);
    else setTeamLeaderSlabs(slabs);
  };

  const addRow = (tier: string, slabType: string) => {
    const slabs = getCurrentSlabs();
    const lastIdx = slabs.map((s, i) => (s.agentTier === tier && s.slabType === slabType) ? i : -1).filter(i => i >= 0);
    const insertAt = lastIdx.length > 0 ? lastIdx[lastIdx.length - 1] + 1 : slabs.length;
    const newSlabs = [...slabs];
    newSlabs.splice(insertAt, 0, emptySlabRow(tier, slabType));
    setCurrentSlabs(newSlabs);
  };

  const removeRow = (index: number) => {
    const slabs = getCurrentSlabs();
    const { agentTier, slabType } = slabs[index];
    const typeRows = slabs.filter(s => s.agentTier === agentTier && s.slabType === slabType);
    if (typeRows.length <= 1) {
      toast.error('Must have at least one slab');
      return;
    }
    setCurrentSlabs(slabs.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof SlabRow, value: string) => {
    const slabs = [...getCurrentSlabs()];
    slabs[index] = { ...slabs[index], [field]: value };
    setCurrentSlabs(slabs);
  };

  const handleSave = async () => {
    const slabs = getCurrentSlabs();
    const validSlabs = slabs.filter(s => s.minOrderCount !== '' && s.commissionAmount !== '');
    if (validSlabs.length === 0) {
      toast.error('Please add at least one valid slab');
      return;
    }

    for (const slab of validSlabs) {
      const min = Number(slab.minOrderCount);
      const max = slab.maxOrderCount ? Number(slab.maxOrderCount) : null;
      const comm = Number(slab.commissionAmount);
      if (isNaN(min) || min < 0) { toast.error('Min count must be a valid non-negative number'); return; }
      if (max !== null && (isNaN(max) || max <= min)) { toast.error('Max count must be greater than min'); return; }
      if (isNaN(comm) || comm < 0) { toast.error('Commission must be a valid non-negative number'); return; }
    }

    try {
      setSaving(true);
      await apiClient.post(`/crm/commissions/slabs/${activeTab}`, {
        slabs: validSlabs.map(s => ({
          agentTier: s.agentTier,
          slabType: s.slabType,
          minOrderCount: Number(s.minOrderCount),
          maxOrderCount: s.maxOrderCount ? Number(s.maxOrderCount) : null,
          commissionAmount: Number(s.commissionAmount),
        })),
      });
      toast.success(`${activeTab === 'agent' ? 'Sales Executive' : 'Team Leader'} commission slabs saved successfully`);
      loadSlabs();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save slabs');
    } finally {
      setSaving(false);
    }
  };

  const renderSlabTable = (tier: string, slabType: typeof SLAB_TYPES[0]) => {
    const slabs = getCurrentSlabs();
    const filtered = slabs.map((s, i) => ({ ...s, globalIndex: i }))
      .filter(s => s.agentTier === tier && s.slabType === slabType.value);

    return (
      <div key={slabType.value} className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{slabType.icon}</span>
            <h4 className="text-sm font-medium text-gray-700">{slabType.label}</h4>
          </div>
          <button
            onClick={() => addRow(tier, slabType.value)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <FaPlus size={9} /> Add
          </button>
        </div>
        <div className="overflow-hidden rounded border border-gray-200">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 w-8">#</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Min Count</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Max Count</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Commission (৳)</th>
                <th className="py-2 px-3 text-xs w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-3 text-center text-xs text-gray-400">No slabs</td></tr>
              ) : (
                filtered.map((slab, rowIdx) => (
                  <tr key={slab.globalIndex} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 px-3 text-xs text-gray-400">{rowIdx + 1}</td>
                    <td className="py-1.5 px-3">
                      <input type="number" min="0" step="1" value={slab.minOrderCount}
                        onChange={(e) => updateRow(slab.globalIndex, 'minOrderCount', e.target.value)}
                        placeholder="e.g. 0"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-1.5 px-3">
                      <input type="number" min="0" step="1" value={slab.maxOrderCount}
                        onChange={(e) => updateRow(slab.globalIndex, 'maxOrderCount', e.target.value)}
                        placeholder="No limit"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-1.5 px-3">
                      <input type="number" min="0" step="1" value={slab.commissionAmount}
                        onChange={(e) => updateRow(slab.globalIndex, 'commissionAmount', e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <button onClick={() => removeRow(slab.globalIndex)}
                        className="text-red-400 hover:text-red-600" title="Remove">
                        <FaTrash size={11} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTierSection = (tier: typeof TIERS[0]) => (
    <div key={tier.value} className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{tier.icon}</span>
        <h3 className="text-base font-semibold text-gray-800">{tier.label} Tier</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pl-2">
        {SLAB_TYPES.map(st => renderSlabTable(tier.value, st))}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">💰</span>
            <h1 className="text-2xl font-bold text-blue-700">Commission Settings</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Configure tier-based commission slabs for Sales Executives and Team Leaders. Separate slabs for Orders, Upsells, and Cross-sells.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <p className="font-medium mb-1">How commission calculation works:</p>
          <ul className="list-disc ml-5 space-y-0.5 text-blue-700">
            <li>Commission is calculated separately for Orders, Upsells, and Cross-sells based on their respective counts.</li>
            <li>Each count is matched against the slab where it falls between Min and Max Count for the agent&apos;s tier.</li>
            <li>The commission amount (৳) from the matching slab is applied as a fixed amount per item.</li>
            <li>Different tiers (Silver, Gold, Platinum) can have different rates for the same count range.</li>
          </ul>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setActiveTab('agent')}
            className={`px-5 py-2.5 rounded-t-lg text-sm font-semibold transition ${
              activeTab === 'agent'
                ? 'bg-white text-blue-700 border border-b-0 border-gray-200 shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            👤 Sales Executive
          </button>
          <button
            onClick={() => setActiveTab('team_leader')}
            className={`px-5 py-2.5 rounded-t-lg text-sm font-semibold transition ${
              activeTab === 'team_leader'
                ? 'bg-white text-blue-700 border border-b-0 border-gray-200 shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Team Leader
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-800">
              {activeTab === 'agent' ? 'Sales Executive' : 'Team Leader'} Commission Slabs
            </h2>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <FaSave size={14} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400">Loading commission settings...</div>
          ) : (
            <>
              {TIERS.map(tier => renderTierSection(tier))}

              <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <p className="font-semibold text-gray-700 mb-2">Example:</p>
                <div className="space-y-1">
                  <p>• Silver agent takes 300+ orders → Matches Order slab min=300, max=400 → ৳10 per order</p>
                  <p>• Same agent has 50 upsells → Matches Upsell slab min=50, max=100 → ৳20 per upsell</p>
                  <p>• Leave &quot;Max Count&quot; empty for the last slab to handle all counts above that minimum.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
