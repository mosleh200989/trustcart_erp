import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';

interface Customer360 {
  customer_id: number;
  name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile: string;
  streetAddress: string;
  district: string;
  city: string;
  gender: string;
  date_of_birth: string;
  marital_status: string;
  anniversary_date: string;
  profession: string;
  available_time: string;
  customer_type: 'new' | 'repeat' | 'vip' | 'inactive';
  lifecycle_stage: 'lead' | 'prospect' | 'first_buyer' | 'repeat_buyer' | 'loyal' | 'inactive';
  
  // Transaction summary
  total_orders: number;
  lifetime_value: number;
  avg_order_value: number;
  last_order_date: string;
  first_order_date: string;
  days_since_last_order: number;
  
  // Interaction summary
  total_interactions: number;
  total_calls: number;
  total_whatsapp: number;
  total_emails: number;
  last_interaction_date: string;
  
  // Behavior summary
  total_behaviors: number;
  products_viewed: number;
  product_views_count: number;
  
  // Family
  family_members_count: number;
  
  // Temperature
  customer_temperature: 'hot' | 'warm' | 'cold';
  customer_since: string;
}

interface FamilyMember {
  id: number;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  date_of_birth: string;
  anniversary_date: string;
  gender: string;
  profession: string;
}

interface Interaction {
  id: number;
  interaction_type: string;
  interaction_direction: string;
  subject: string;
  description: string;
  outcome: string;
  created_at: string;
  duration_seconds: number;
}

interface BehaviorData {
  behavior_type: string;
  count: number;
  unique_products: number;
  last_behavior: string;
}

interface AIRecommendation {
  call_priority_score: number;
  offer_type: string;
  best_call_time: string;
  recommended_products: string;
  next_action: string;
}

export default function CustomerProfile() {
  const router = useRouter();
  const { id } = router.query;
  
  const [customer, setCustomer] = useState<Customer360 | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [behaviors, setBehaviors] = useState<BehaviorData[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'family' | 'interactions' | 'behavior' | 'ai'>('overview');
  
  // Modals
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    if (id) {
      loadCustomerData();
    }
  }, [id]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      
      // Load customer 360 view
      const customer360Res = await fetch(`http://localhost:3001/cdm/customer360/${id}`);
      const customer360Data = await customer360Res.json();
      setCustomer(customer360Data);

      // Load family members
      const familyRes = await fetch(`http://localhost:3001/cdm/family/${id}`);
      const familyData = await familyRes.json();
      setFamilyMembers(familyData);

      // Load interactions
      const interactionsRes = await fetch(`http://localhost:3001/cdm/interactions/${id}?limit=20`);
      const interactionsData = await interactionsRes.json();
      setInteractions(interactionsData);

      // Load behavior stats
      const behaviorRes = await fetch(`http://localhost:3001/cdm/behavior/${id}/stats`);
      const behaviorData = await behaviorRes.json();
      setBehaviors(behaviorData);

      // Load AI recommendation
      const aiRes = await fetch(`http://localhost:3001/cdm/ai/recommendation/${id}`);
      const aiData = await aiRes.json();
      setAiRecommendation(aiData);

    } catch (error) {
      console.error('Failed to load customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFamily = async (formData: any) => {
    try {
      const res = await fetch('http://localhost:3001/cdm/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, customerId: id }),
      });

      if (res.ok) {
        loadCustomerData();
        setShowAddFamily(false);
      }
    } catch (error) {
      console.error('Failed to add family member:', error);
    }
  };

  const handleTrackInteraction = async (formData: any) => {
    try {
      const res = await fetch('http://localhost:3001/cdm/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, customerId: id }),
      });

      if (res.ok) {
        loadCustomerData();
        setShowAddInteraction(false);
      }
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  };

  if (loading || !customer) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  const temperatureColor = {
    hot: 'text-red-600 bg-red-100',
    warm: 'text-orange-600 bg-orange-100',
    cold: 'text-blue-600 bg-blue-100',
  }[customer.customer_temperature];

  const lifecycleColor = {
    lead: 'bg-gray-100 text-gray-800',
    prospect: 'bg-blue-100 text-blue-800',
    first_buyer: 'bg-green-100 text-green-800',
    repeat_buyer: 'bg-purple-100 text-purple-800',
    loyal: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-red-100 text-red-800',
  }[customer.lifecycle_stage];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {customer.name} {customer.last_name}
              </h1>
              <div className="flex items-center gap-4 text-sm">
                <span>📧 {customer.email}</span>
                <span>📞 {customer.phone || customer.mobile}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${temperatureColor}`}>
                  🔥 {customer.customer_temperature.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${lifecycleColor}`}>
                  {customer.lifecycle_stage.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50"
            >
              ✏️ Edit Profile
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="text-sm opacity-90">Lifetime Value</div>
              <div className="text-2xl font-bold">৳{customer.lifetime_value.toLocaleString()}</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="text-sm opacity-90">Total Orders</div>
              <div className="text-2xl font-bold">{customer.total_orders}</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="text-sm opacity-90">Avg Order Value</div>
              <div className="text-2xl font-bold">৳{Math.round(customer.avg_order_value).toLocaleString()}</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="text-sm opacity-90">Days Since Last Order</div>
              <div className="text-2xl font-bold">{customer.days_since_last_order}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex gap-2 p-2">
              {[
                { key: 'overview', label: '📊 Overview', icon: '📊' },
                { key: 'profile', label: '👤 Profile', icon: '👤' },
                { key: 'family', label: '👨‍👩‍👧‍👦 Family', icon: '👨‍👩‍👧‍👦', badge: customer.family_members_count },
                { key: 'interactions', label: '💬 Interactions', icon: '💬', badge: customer.total_interactions },
                { key: 'behavior', label: '🔍 Behavior', icon: '🔍', badge: customer.total_behaviors },
                { key: 'ai', label: '🤖 AI Insights', icon: '🤖' },
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
                  {tab.badge !== undefined && (
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
                <div className="grid grid-cols-3 gap-6">
                  {/* Transaction Summary */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-green-800 mb-4">💰 Transactions</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">First Order:</span>
                        <span className="font-semibold">{customer.first_order_date ? new Date(customer.first_order_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Last Order:</span>
                        <span className="font-semibold">{customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Spent:</span>
                        <span className="font-semibold">৳{customer.lifetime_value.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Orders:</span>
                        <span className="font-semibold">{customer.total_orders}</span>
                      </div>
                    </div>
                  </div>

                  {/* Interaction Summary */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-800 mb-4">💬 Communication</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">📞 Calls:</span>
                        <span className="font-semibold">{customer.total_calls}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">📱 WhatsApp:</span>
                        <span className="font-semibold">{customer.total_whatsapp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">📧 Emails:</span>
                        <span className="font-semibold">{customer.total_emails}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total:</span>
                        <span className="font-semibold">{customer.total_interactions}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddInteraction(true)}
                      className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      ➕ Log Interaction
                    </button>
                  </div>

                  {/* Behavior Summary */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-purple-800 mb-4">🔍 Behavior</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Products Viewed:</span>
                        <span className="font-semibold">{customer.products_viewed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Views:</span>
                        <span className="font-semibold">{customer.product_views_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Activities:</span>
                        <span className="font-semibold">{customer.total_behaviors}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Recommendation Card */}
                {aiRecommendation && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">🤖</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">AI Recommendation</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Priority Score:</span>
                            <span className="ml-2 font-bold text-lg">{aiRecommendation.call_priority_score}/10</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Best Time:</span>
                            <span className="ml-2 font-semibold">{aiRecommendation.best_call_time}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">Offer Type:</span>
                            <span className="ml-2 font-semibold">{aiRecommendation.offer_type}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">Next Action:</span>
                            <span className="ml-2 font-semibold">{aiRecommendation.next_action}</span>
                          </div>
                          {aiRecommendation.recommended_products && (
                            <div className="col-span-2">
                              <span className="text-gray-600">Recommended Products:</span>
                              <span className="ml-2 font-semibold">{aiRecommendation.recommended_products}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold mb-4">Personal Information</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-gray-600">Full Name</dt>
                      <dd className="font-semibold">{customer.name} {customer.last_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Gender</dt>
                      <dd className="font-semibold">{customer.gender || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Date of Birth</dt>
                      <dd className="font-semibold">{customer.date_of_birth ? new Date(customer.date_of_birth).toLocaleDateString() : 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Marital Status</dt>
                      <dd className="font-semibold">{customer.marital_status || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Anniversary Date</dt>
                      <dd className="font-semibold">{customer.anniversary_date ? new Date(customer.anniversary_date).toLocaleDateString() : 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Profession</dt>
                      <dd className="font-semibold">{customer.profession || 'Not specified'}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4">Contact & Location</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-gray-600">Email</dt>
                      <dd className="font-semibold">{customer.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Phone</dt>
                      <dd className="font-semibold">{customer.phone || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Mobile</dt>
                      <dd className="font-semibold">{customer.mobile || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Address</dt>
                      <dd className="font-semibold">{customer.streetAddress || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">City</dt>
                      <dd className="font-semibold">{customer.city || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">District</dt>
                    <dd className="font-semibold">{customer.stateProvince || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Best Time to Contact</dt>
                      <dd className="font-semibold">{customer.available_time || 'Anytime'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {/* Family Tab */}
            {activeTab === 'family' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Family Members ({familyMembers.length})</h3>
                  <button
                    onClick={() => setShowAddFamily(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    ➕ Add Family Member
                  </button>
                </div>

                {familyMembers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">👨‍👩‍👧‍👦</div>
                    <p>No family members added yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {familyMembers.map(member => (
                      <div key={member.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-lg">{member.name}</h4>
                            <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              {member.relationship}
                            </span>
                          </div>
                          <div className="text-2xl">
                            {member.relationship === 'spouse' && '💑'}
                            {member.relationship === 'child' && '👶'}
                            {member.relationship === 'parent' && '👴'}
                            {member.relationship === 'sibling' && '👫'}
                          </div>
                        </div>
                        <dl className="space-y-2 text-sm">
                          {member.phone && (
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Phone:</dt>
                              <dd className="font-semibold">{member.phone}</dd>
                            </div>
                          )}
                          {member.date_of_birth && (
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Birthday:</dt>
                              <dd className="font-semibold">{new Date(member.date_of_birth).toLocaleDateString()}</dd>
                            </div>
                          )}
                          {member.anniversary_date && (
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Anniversary:</dt>
                              <dd className="font-semibold">{new Date(member.anniversary_date).toLocaleDateString()}</dd>
                            </div>
                          )}
                          {member.profession && (
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Profession:</dt>
                              <dd className="font-semibold">{member.profession}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Interactions Tab */}
            {activeTab === 'interactions' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Recent Interactions</h3>
                  <button
                    onClick={() => setShowAddInteraction(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    ➕ Log Interaction
                  </button>
                </div>

                <div className="space-y-3">
                  {interactions.map(interaction => (
                    <div key={interaction.id} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-2xl">
                            {interaction.interaction_type === 'call' && '📞'}
                            {interaction.interaction_type === 'whatsapp' && '📱'}
                            {interaction.interaction_type === 'email' && '📧'}
                            {interaction.interaction_type === 'sms' && '💬'}
                            {interaction.interaction_type === 'meeting' && '🤝'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold capitalize">{interaction.interaction_type}</span>
                              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                                {interaction.interaction_direction}
                              </span>
                              {interaction.duration_seconds && (
                                <span className="text-xs text-gray-600">
                                  {Math.round(interaction.duration_seconds / 60)} min
                                </span>
                              )}
                            </div>
                            {interaction.subject && (
                              <div className="font-medium text-gray-800 mb-1">{interaction.subject}</div>
                            )}
                            {interaction.description && (
                              <div className="text-sm text-gray-600 mb-2">{interaction.description}</div>
                            )}
                            {interaction.outcome && (
                              <div className="text-sm">
                                <span className="text-gray-600">Outcome:</span>
                                <span className="ml-2 font-semibold">{interaction.outcome}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {new Date(interaction.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Behavior Tab */}
            {activeTab === 'behavior' && (
              <div>
                <h3 className="text-lg font-bold mb-4">Customer Behavior Analytics</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  {behaviors.map(behavior => (
                    <div key={behavior.behavior_type} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
                      <div className="text-2xl mb-2">
                        {behavior.behavior_type === 'product_view' && '👀'}
                        {behavior.behavior_type === 'add_to_cart' && '🛒'}
                        {behavior.behavior_type === 'wishlist' && '❤️'}
                        {behavior.behavior_type === 'search' && '🔍'}
                      </div>
                      <h4 className="font-bold capitalize mb-2">{behavior.behavior_type.replace('_', ' ')}</h4>
                      <div className="text-3xl font-bold text-purple-600 mb-1">{behavior.count}</div>
                      <div className="text-sm text-gray-600">
                        {behavior.unique_products > 0 && `${behavior.unique_products} unique products`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Tab */}
            {activeTab === 'ai' && aiRecommendation && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">🤖 AI-Powered Insights</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Call Strategy</h4>
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="text-gray-600">Priority Score</dt>
                          <dd className="text-2xl font-bold text-purple-600">{aiRecommendation.call_priority_score}/10</dd>
                        </div>
                        <div>
                          <dt className="text-gray-600">Best Call Time</dt>
                          <dd className="font-semibold">{aiRecommendation.best_call_time}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-600">Next Action</dt>
                          <dd className="font-semibold text-orange-600">{aiRecommendation.next_action}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Offer Recommendation</h4>
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="text-gray-600">Recommended Offer</dt>
                          <dd className="font-semibold text-green-600">{aiRecommendation.offer_type}</dd>
                        </div>
                        {aiRecommendation.recommended_products && (
                          <div>
                            <dt className="text-gray-600">Products to Push</dt>
                            <dd className="font-semibold">{aiRecommendation.recommended_products}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Family Member Modal */}
      {showAddFamily && (
        <FamilyMemberModal
          onClose={() => setShowAddFamily(false)}
          onSubmit={handleAddFamily}
        />
      )}

      {/* Add Interaction Modal */}
      {showAddInteraction && (
        <InteractionModal
          onClose={() => setShowAddInteraction(false)}
          onSubmit={handleTrackInteraction}
        />
      )}
    </AdminLayout>
  );
}

// Family Member Modal Component
function FamilyMemberModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: 'spouse',
    date_of_birth: '',
    anniversary_date: '',
    gender: '',
    profession: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Add Family Member</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Relationship *</label>
              <select
                required
                value={formData.relationship}
                onChange={e => setFormData({...formData, relationship: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="grandparent">Grandparent</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={e => setFormData({...formData, date_of_birth: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Anniversary Date</label>
              <input
                type="date"
                value={formData.anniversary_date}
                onChange={e => setFormData({...formData, anniversary_date: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Profession</label>
              <input
                type="text"
                value={formData.profession}
                onChange={e => setFormData({...formData, profession: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Add Family Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Interaction Modal Component
function InteractionModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    interaction_type: 'call',
    interaction_direction: 'outbound',
    subject: '',
    description: '',
    outcome: '',
    duration_seconds: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      duration_seconds: formData.duration_seconds ? parseInt(formData.duration_seconds) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-xl font-bold mb-4">Log Interaction</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select
                required
                value={formData.interaction_type}
                onChange={e => setFormData({...formData, interaction_type: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Direction</label>
              <select
                value={formData.interaction_direction}
                onChange={e => setFormData({...formData, interaction_direction: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Brief subject line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Detailed notes about the interaction"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
              <input
                type="number"
                value={formData.duration_seconds}
                onChange={e => setFormData({...formData, duration_seconds: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., 180 for 3 minutes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Outcome</label>
              <input
                type="text"
                value={formData.outcome}
                onChange={e => setFormData({...formData, outcome: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., Interested, Not interested, Follow-up"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Log Interaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
