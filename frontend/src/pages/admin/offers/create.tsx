import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useRouter } from 'next/router';
import { FaGift, FaSave, FaTimes } from 'react-icons/fa';

export default function CreateOffer() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    offerType: 'PERCENTAGE',
    startTime: '',
    endTime: '',
    priority: 0,
    status: 'active',
    autoApply: false,
    maxUsageTotal: '',
    maxUsagePerUser: 1,
    minCartAmount: '',
    maxDiscountAmount: '',
  });

  const [conditions, setConditions] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([{
    rewardType: 'DISCOUNT_PERCENT',
    value: { percent: 10 },
    maxFreeQty: 1,
  }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const offerData = {
        ...formData,
        maxUsageTotal: formData.maxUsageTotal ? parseInt(formData.maxUsageTotal) : null,
        minCartAmount: formData.minCartAmount ? parseFloat(formData.minCartAmount) : null,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        conditions: conditions.filter(c => c.conditionType),
        rewards: rewards.map(r => ({
          ...r,
          value: typeof r.value === 'string' ? JSON.parse(r.value) : r.value,
        })),
      };

      await apiClient.post('/offers', offerData);
      alert('Offer created successfully!');
      router.push('/admin/offers');
    } catch (error: any) {
      console.error('Error creating offer:', error);
      alert('Failed to create offer: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, {
      conditionType: 'CART_TOTAL',
      operator: '>=',
      value: {},
    }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const updated = [...conditions];
    updated[index][field] = value;
    setConditions(updated);
  };

  const updateReward = (index: number, field: string, value: any) => {
    const updated = [...rewards];
    updated[index][field] = value;
    setRewards(updated);
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-lg">
            <FaGift className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Create New Offer</h1>
            <p className="text-sm text-gray-600">Design your promotion campaign</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">Offer Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="e.g., Flash Sale - 90% OFF"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Brief description of the offer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Offer Type *</label>
                <select
                  value={formData.offerType}
                  onChange={(e) => setFormData({ ...formData, offerType: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value="PERCENTAGE">Percentage Discount</option>
                  <option value="FLAT_DISCOUNT">Flat Discount</option>
                  <option value="BOGO">Buy One Get One</option>
                  <option value="FREE_PRODUCT">Free Product</option>
                  <option value="BUNDLE">Bundle Deal</option>
                  <option value="CATEGORY_DISCOUNT">Category Discount</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Priority</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Higher priority wins"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Start Time *</label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">End Time *</label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Max Usage (Total)</label>
                <input
                  type="number"
                  value={formData.maxUsageTotal}
                  onChange={(e) => setFormData({ ...formData, maxUsageTotal: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Max Usage Per User</label>
                <input
                  type="number"
                  value={formData.maxUsagePerUser}
                  onChange={(e) => setFormData({ ...formData, maxUsagePerUser: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Min Cart Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.minCartAmount}
                  onChange={(e) => setFormData({ ...formData, minCartAmount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Minimum cart total required"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Max Discount Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Maximum discount cap"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.autoApply}
                  onChange={(e) => setFormData({ ...formData, autoApply: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-semibold">Auto-Apply at Checkout</label>
              </div>
            </div>
          </div>

          {/* Rewards Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Rewards (What Customer Gets)</h2>
            
            {rewards.map((reward, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-green-50 rounded-lg">
                <div>
                  <label className="block text-sm font-semibold mb-2">Reward Type</label>
                  <select
                    value={reward.rewardType}
                    onChange={(e) => updateReward(index, 'rewardType', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                  >
                    <option value="DISCOUNT_PERCENT">Percentage Discount</option>
                    <option value="DISCOUNT_FLAT">Flat Discount</option>
                    <option value="FREE_PRODUCT">Free Product</option>
                    <option value="FREE_SHIPPING">Free Shipping</option>
                  </select>
                </div>

                {reward.rewardType === 'DISCOUNT_PERCENT' && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Discount %</label>
                    <input
                      type="number"
                      value={reward.value.percent || ''}
                      onChange={(e) => updateReward(index, 'value', { percent: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                      placeholder="e.g., 90"
                      max="100"
                    />
                  </div>
                )}

                {reward.rewardType === 'DISCOUNT_FLAT' && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Discount Amount</label>
                    <input
                      type="number"
                      value={reward.value.amount || ''}
                      onChange={(e) => updateReward(index, 'value', { amount: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                      placeholder="e.g., 500"
                    />
                  </div>
                )}

                {reward.rewardType === 'FREE_PRODUCT' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Product ID</label>
                      <input
                        type="number"
                        value={reward.value.product_id || ''}
                        onChange={(e) => updateReward(index, 'value', { product_id: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Free Quantity</label>
                      <input
                        type="number"
                        value={reward.maxFreeQty}
                        onChange={(e) => updateReward(index, 'maxFreeQty', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Conditions Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Conditions (Optional)</h2>
              <button
                type="button"
                onClick={addCondition}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
              >
                + Add Condition
              </button>
            </div>

            {conditions.map((condition, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-blue-50 rounded-lg relative">
                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                >
                  <FaTimes />
                </button>

                <div>
                  <label className="block text-sm font-semibold mb-2">Condition Type</label>
                  <select
                    value={condition.conditionType}
                    onChange={(e) => updateCondition(index, 'conditionType', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="CART_TOTAL">Cart Total</option>
                    <option value="PRODUCT_QTY">Product Quantity</option>
                    <option value="MIN_ITEMS">Minimum Items</option>
                    <option value="CATEGORY">Category</option>
                    <option value="FIRST_ORDER">First Order</option>
                    <option value="USER_LEVEL">User Level</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Operator</label>
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value=">=">&gt;=</option>
                    <option value=">">&gt;</option>
                    <option value="<=">&lt;=</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Value (JSON)</label>
                  <input
                    type="text"
                    value={JSON.stringify(condition.value)}
                    onChange={(e) => {
                      try {
                        updateCondition(index, 'value', JSON.parse(e.target.value));
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder='{"amount": 1000} or {"product_id": 12, "min": 2}'
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              <FaSave />
              {loading ? 'Creating...' : 'Create Offer'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
