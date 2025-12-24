import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaChartBar } from 'react-icons/fa';
import apiClient from '@/services/api';

interface RecommendationRule {
  id: number;
  rule_name: string;
  trigger_product_id?: number;
  trigger_category_id?: number;
  recommended_product_id?: number;
  recommended_category_id?: number;
  min_days_passed: number;
  max_days_passed: number;
  min_order_value: number;
  priority: 'high' | 'medium' | 'low';
  is_active: boolean;
  success_rate: number;
}

interface MarketingCampaign {
  id: number;
  campaign_name: string;
  campaign_type: string;
  channel: string;
  target_segment: string;
  message_template: string;
  trigger_condition: any;
  is_active: boolean;
  success_count: number;
  failure_count: number;
  conversion_rate: number;
}

export default function CrmAutomationAdmin() {
  const [activeTab, setActiveTab] = useState<'rules' | 'campaigns' | 'intelligence'>('rules');
  const [rules, setRules] = useState<RecommendationRule[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [hotCustomers, setHotCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<RecommendationRule | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);

  const [ruleForm, setRuleForm] = useState({
    rule_name: '',
    trigger_product_id: '',
    recommended_product_id: '',
    min_days_passed: '7',
    max_days_passed: '30',
    min_order_value: '0',
    priority: 'medium'
  });

  const [campaignForm, setCampaignForm] = useState({
    campaign_name: '',
    campaign_type: 'upsell',
    channel: 'sms',
    target_segment: '',
    message_template: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'rules') {
        const res = await apiClient.get('/crm/automation/recommendation-rules');
        setRules(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'campaigns') {
        const res = await apiClient.get('/crm/automation/campaigns');
        setCampaigns(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'intelligence') {
        const res = await apiClient.get('/crm/automation/customers/hot?limit=20');
        setHotCustomers(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    try {
      await apiClient.post('/crm/automation/recommendation-rules', {
        ...ruleForm,
        trigger_product_id: ruleForm.trigger_product_id ? parseInt(ruleForm.trigger_product_id) : null,
        recommended_product_id: ruleForm.recommended_product_id ? parseInt(ruleForm.recommended_product_id) : null,
        min_days_passed: parseInt(ruleForm.min_days_passed),
        max_days_passed: parseInt(ruleForm.max_days_passed),
        min_order_value: parseFloat(ruleForm.min_order_value)
      });
      setIsRuleModalOpen(false);
      loadData();
      alert('Rule created successfully!');
    } catch (error) {
      console.error('Failed to create rule:', error);
      alert('Failed to create rule');
    }
  };

  const handleUpdateRule = async () => {
    if (!selectedRule) return;
    try {
      await apiClient.put(`/crm/automation/recommendation-rules/${selectedRule.id}`, {
        ...ruleForm,
        trigger_product_id: ruleForm.trigger_product_id ? parseInt(ruleForm.trigger_product_id) : null,
        recommended_product_id: ruleForm.recommended_product_id ? parseInt(ruleForm.recommended_product_id) : null,
        min_days_passed: parseInt(ruleForm.min_days_passed),
        max_days_passed: parseInt(ruleForm.max_days_passed),
        min_order_value: parseFloat(ruleForm.min_order_value)
      });
      setIsRuleModalOpen(false);
      loadData();
      alert('Rule updated successfully!');
    } catch (error) {
      console.error('Failed to update rule:', error);
      alert('Failed to update rule');
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await apiClient.delete(`/crm/automation/recommendation-rules/${id}`);
      loadData();
      alert('Rule deleted successfully!');
    } catch (error) {
      console.error('Failed to delete rule:', error);
      alert('Failed to delete rule');
    }
  };

  const handleCreateCampaign = async () => {
    try {
      await apiClient.post('/crm/automation/campaigns', campaignForm);
      setIsCampaignModalOpen(false);
      loadData();
      alert('Campaign created successfully!');
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert('Failed to create campaign');
    }
  };

  const handleToggleCampaign = async (id: number, isActive: boolean) => {
    try {
      await apiClient.put(`/crm/automation/campaigns/${id}/toggle`, { isActive: !isActive });
      loadData();
    } catch (error) {
      console.error('Failed to toggle campaign:', error);
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await apiClient.delete(`/crm/automation/campaigns/${id}`);
      loadData();
      alert('Campaign deleted successfully!');
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  const openRuleModal = (rule?: RecommendationRule) => {
    if (rule) {
      setSelectedRule(rule);
      setRuleForm({
        rule_name: rule.rule_name,
        trigger_product_id: rule.trigger_product_id?.toString() || '',
        recommended_product_id: rule.recommended_product_id?.toString() || '',
        min_days_passed: rule.min_days_passed.toString(),
        max_days_passed: rule.max_days_passed.toString(),
        min_order_value: rule.min_order_value.toString(),
        priority: rule.priority
      });
    } else {
      setSelectedRule(null);
      setRuleForm({
        rule_name: '',
        trigger_product_id: '',
        recommended_product_id: '',
        min_days_passed: '7',
        max_days_passed: '30',
        min_order_value: '0',
        priority: 'medium'
      });
    }
    setIsRuleModalOpen(true);
  };

  const openCampaignModal = (campaign?: MarketingCampaign) => {
    if (campaign) {
      setSelectedCampaign(campaign);
      setCampaignForm({
        campaign_name: campaign.campaign_name,
        campaign_type: campaign.campaign_type,
        channel: campaign.channel,
        target_segment: campaign.target_segment,
        message_template: campaign.message_template,
        is_active: campaign.is_active
      });
    } else {
      setSelectedCampaign(null);
      setCampaignForm({
        campaign_name: '',
        campaign_type: 'upsell',
        channel: 'sms',
        target_segment: '',
        message_template: '',
        is_active: true
      });
    }
    setIsCampaignModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">CRM Automation</h1>
            <p className="text-gray-600 mt-1">Manage automation rules and campaigns</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('rules')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rules'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Recommendation Rules
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'campaigns'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Marketing Campaigns
            </button>
            <button
              onClick={() => setActiveTab('intelligence')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'intelligence'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Customer Intelligence
            </button>
          </nav>
        </div>

        {/* Recommendation Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Upsell/Cross-sell Rules</h2>
              <button
                onClick={() => openRuleModal()}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <FaPlus /> Add Rule
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : rules.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No rules found. Create your first rule!</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Window</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{rule.rule_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.min_days_passed}-{rule.max_days_passed} days</td>
                        <td className="px-6 py-4 text-sm text-gray-700">৳{rule.min_order_value}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            rule.priority === 'high' ? 'bg-red-100 text-red-800' :
                            rule.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {rule.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.success_rate}%</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openRuleModal(rule)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Marketing Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Marketing Automation Campaigns</h2>
              <button
                onClick={() => openCampaignModal()}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <FaPlus /> Add Campaign
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : campaigns.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No campaigns found. Create your first campaign!</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{campaign.campaign_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{campaign.campaign_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{campaign.channel}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{campaign.target_segment}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{campaign.success_count}/{campaign.success_count + campaign.failure_count}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleCampaign(campaign.id, campaign.is_active)}
                            className="text-2xl"
                          >
                            {campaign.is_active ? (
                              <FaToggleOn className="text-green-600" />
                            ) : (
                              <FaToggleOff className="text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openCampaignModal(campaign)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Customer Intelligence Tab */}
        {activeTab === 'intelligence' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">🔥 Hot Customers</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : hotCustomers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No hot customers found.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lifetime Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Purchase</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temperature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {hotCustomers.map((customer, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {customer.name} {customer.last_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{customer.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{customer.total_orders}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">৳{customer.lifetime_value || 0}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">৳{customer.avg_order_value || 0}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{customer.days_since_last_order || 0} days ago</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            customer.customer_temperature === 'hot' ? 'bg-red-100 text-red-800' :
                            customer.customer_temperature === 'warm' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {customer.customer_temperature}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Rule Modal */}
        {isRuleModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedRule ? 'Edit Rule' : 'Create Rule'}
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rule Name</label>
                  <input
                    type="text"
                    value={ruleForm.rule_name}
                    onChange={(e) => setRuleForm({ ...ruleForm, rule_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Honey → Pain Relief Oil"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Trigger Product ID</label>
                    <input
                      type="number"
                      value={ruleForm.trigger_product_id}
                      onChange={(e) => setRuleForm({ ...ruleForm, trigger_product_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Recommended Product ID</label>
                    <input
                      type="number"
                      value={ruleForm.recommended_product_id}
                      onChange={(e) => setRuleForm({ ...ruleForm, recommended_product_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Min Days</label>
                    <input
                      type="number"
                      value={ruleForm.min_days_passed}
                      onChange={(e) => setRuleForm({ ...ruleForm, min_days_passed: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Max Days</label>
                    <input
                      type="number"
                      value={ruleForm.max_days_passed}
                      onChange={(e) => setRuleForm({ ...ruleForm, max_days_passed: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Min Order Value</label>
                    <input
                      type="number"
                      value={ruleForm.min_order_value}
                      onChange={(e) => setRuleForm({ ...ruleForm, min_order_value: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select
                    value={ruleForm.priority}
                    onChange={(e) => setRuleForm({ ...ruleForm, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              
              <div className="p-6 border-t flex gap-3">
                <button
                  onClick={selectedRule ? handleUpdateRule : handleCreateRule}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  {selectedRule ? 'Update' : 'Create'} Rule
                </button>
                <button
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Modal */}
        {isCampaignModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedCampaign ? 'Edit Campaign' : 'Create Campaign'}
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={campaignForm.campaign_name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, campaign_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Type</label>
                    <select
                      value={campaignForm.campaign_type}
                      onChange={(e) => setCampaignForm({ ...campaignForm, campaign_type: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="upsell">Upsell</option>
                      <option value="reactivation">Reactivation</option>
                      <option value="retention">Retention</option>
                      <option value="promotion">Promotion</option>
                      <option value="feedback">Feedback</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Channel</label>
                    <select
                      value={campaignForm.channel}
                      onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Target Segment</label>
                  <input
                    type="text"
                    value={campaignForm.target_segment}
                    onChange={(e) => setCampaignForm({ ...campaignForm, target_segment: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., inactive_30_days"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message Template</label>
                  <textarea
                    value={campaignForm.message_template}
                    onChange={(e) => setCampaignForm({ ...campaignForm, message_template: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Your message template..."
                  ></textarea>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={campaignForm.is_active}
                    onChange={(e) => setCampaignForm({ ...campaignForm, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">Active</label>
                </div>
              </div>
              
              <div className="p-6 border-t flex gap-3">
                <button
                  onClick={handleCreateCampaign}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  {selectedCampaign ? 'Update' : 'Create'} Campaign
                </button>
                <button
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
