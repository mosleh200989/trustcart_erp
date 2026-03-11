import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaSave, FaPlus, FaTrash } from 'react-icons/fa';
import { useToast } from '@/contexts/ToastContext';

interface SlabRow {
  agentTier: string;
  minOrderAmount: string;
  maxOrderAmount: string;
  commissionAmount: string;
}

const TIERS = [
  { value: 'silver', label: 'Silver', icon: '🥈' },
  { value: 'gold', label: 'Gold', icon: '🥇' },
  { value: 'platinum', label: 'Platinum', icon: '💎' },
];

const emptySlabRow = (tier: string): SlabRow => ({
  agentTier: tier,
  minOrderAmount: '',
  maxOrderAmount: '',
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
          // Start with one empty row per tier
          return TIERS.map(t => emptySlabRow(t.value));
        }
        return slabs.map((s: any) => ({
          agentTier: s.agentTier,
          minOrderAmount: String(Number(s.minOrderAmount)),
          maxOrderAmount: s.maxOrderAmount ? String(Number(s.maxOrderAmount)) : '',
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

  const addRow = (tier: string) => {
    const slabs = getCurrentSlabs();
    // Find the insert index: after the last row of this tier
    const lastIdx = slabs.map((s, i) => s.agentTier === tier ? i : -1).filter(i => i >= 0);
    const insertAt = lastIdx.length > 0 ? lastIdx[lastIdx.length - 1] + 1 : slabs.length;
    const newSlabs = [...slabs];
    newSlabs.splice(insertAt, 0, emptySlabRow(tier));
    setCurrentSlabs(newSlabs);
  };

  const removeRow = (index: number) => {
    const slabs = getCurrentSlabs();
    const tier = slabs[index].agentTier;
    const tierRows = slabs.filter(s => s.agentTier === tier);
    if (tierRows.length <= 1) {
      toast.error('Must have at least one slab per tier');
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

    // Validate
    const validSlabs = slabs.filter(s => s.minOrderAmount !== '' && s.commissionAmount !== '');
    if (validSlabs.length === 0) {
      toast.error('Please add at least one valid slab');
      return;
    }

    for (const slab of validSlabs) {
      const min = Number(slab.minOrderAmount);
      const max = slab.maxOrderAmount ? Number(slab.maxOrderAmount) : null;
      const comm = Number(slab.commissionAmount);

      if (isNaN(min) || min < 0) {
        toast.error('Min order amount must be a valid non-negative number');
        return;
      }
      if (max !== null && (isNaN(max) || max <= min)) {
        toast.error('Max order amount must be greater than min');
        return;
      }
      if (isNaN(comm) || comm < 0) {
        toast.error('Commission amount must be a valid non-negative number');
        return;
      }
    }

    try {
      setSaving(true);
      await apiClient.post(`/crm/commissions/slabs/${activeTab}`, {
        slabs: validSlabs.map(s => ({
          agentTier: s.agentTier,
          minOrderAmount: Number(s.minOrderAmount),
          maxOrderAmount: s.maxOrderAmount ? Number(s.maxOrderAmount) : null,
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

  const renderTierSection = (tier: typeof TIERS[0]) => {
    const slabs = getCurrentSlabs();
    const tierSlabs = slabs.map((s, i) => ({ ...s, globalIndex: i })).filter(s => s.agentTier === tier.value);

    return (
      <div key={tier.value} className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{tier.icon}</span>
            <h3 className="text-base font-semibold text-gray-800">{tier.label} Tier</h3>
            <span className="text-xs text-gray-400">({tierSlabs.length} slab{tierSlabs.length !== 1 ? 's' : ''})</span>
          </div>
          <button
            onClick={() => addRow(tier.value)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <FaPlus size={10} /> Add Slab
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 uppercase w-10">#</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 uppercase">Min Order Amount (৳)</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 uppercase">Max Order Amount (৳)</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 uppercase">Commission (৳)</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-gray-600 uppercase w-16"></th>
              </tr>
            </thead>
            <tbody>
              {tierSlabs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-sm text-gray-400">No slabs configured</td>
                </tr>
              ) : (
                tierSlabs.map((slab, rowIdx) => (
                  <tr key={slab.globalIndex} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4 text-sm text-gray-400">{rowIdx + 1}</td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={slab.minOrderAmount}
                        onChange={(e) => updateRow(slab.globalIndex, 'minOrderAmount', e.target.value)}
                        placeholder="e.g. 0"
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={slab.maxOrderAmount}
                        onChange={(e) => updateRow(slab.globalIndex, 'maxOrderAmount', e.target.value)}
                        placeholder="No limit"
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={slab.commissionAmount}
                        onChange={(e) => updateRow(slab.globalIndex, 'commissionAmount', e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={() => removeRow(slab.globalIndex)}
                        className="text-red-400 hover:text-red-600 transition"
                        title="Remove slab"
                      >
                        <FaTrash size={12} />
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
            Configure tier-based commission slabs for Sales Executives and Team Leaders. Commission is calculated per order based on order amount and agent tier.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <p className="font-medium mb-1">How commission calculation works:</p>
          <ul className="list-disc ml-5 space-y-0.5 text-blue-700">
            <li>Each order is matched against the slab where Order Amount falls between Min and Max.</li>
            <li>The commission amount (৳) from the matching slab is applied as a fixed amount per order.</li>
            <li>Different tiers (Silver, Gold, Platinum) can have different commission rates for the same order range.</li>
            <li>If an agent&apos;s tier changes mid-month, orders placed before the change use the old tier, and orders after use the new tier.</li>
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

              {/* Example */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <p className="font-semibold text-gray-700 mb-2">Example:</p>
                <div className="space-y-1">
                  <p>• Silver agent gets an order of ৳350 → Matches slab where min=300, max=400 → Commission = ৳10</p>
                  <p>• Gold agent gets the same ৳350 order → Matches Gold slab → Commission = ৳15</p>
                  <p>• Leave &quot;Max Order Amount&quot; empty for the last slab to handle all orders above that minimum.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
