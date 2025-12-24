import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaPhone, FaWhatsapp, FaSms, FaEnvelope, FaFire, FaChartLine, FaCheckCircle, FaClock } from 'react-icons/fa';
import apiClient from '@/services/api';

interface CallTask {
  id: number;
  customer_id: string;
  priority: 'hot' | 'warm' | 'cold';
  call_reason: string;
  recommended_product_id?: number;
  status: string;
  scheduled_time?: string;
  notes?: string;
}

interface NextAction {
  action: string;
  priority: string;
  message: string;
  task?: CallTask;
  customer_intel?: any;
  recommendations?: any[];
  products_to_push?: string[];
}

interface DashboardStats {
  today_tasks: number;
  hot_leads: number;
  warm_leads: number;
  pending: number;
  completed: number;
  performance: any;
  tasks: CallTask[];
}

export default function AgentDashboard() {
  const [loading, setLoading] = useState(true);
  const [agentId] = useState(1); // TODO: Get from auth context
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [nextAction, setNextAction] = useState<NextAction | null>(null);
  const [selectedTask, setSelectedTask] = useState<CallTask | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, actionRes] = await Promise.all([
        apiClient.get(`/crm/automation/agent/${agentId}/dashboard`),
        apiClient.get(`/crm/automation/agent/${agentId}/next-action`)
      ]);
      
      setStats(dashboardRes.data);
      setNextAction(actionRes.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCall = async (task: CallTask) => {
    try {
      // Update task status to in_progress
      await apiClient.put(`/crm/automation/tasks/${task.id}/status`, {
        status: 'in_progress'
      });
      
      // Get customer intelligence
      const intelRes = await apiClient.get(`/crm/automation/intelligence/${task.customer_id}`);
      const recommendationsRes = await apiClient.get(`/crm/automation/recommendations/${task.customer_id}`);
      
      setSelectedTask({
        ...task,
        customer_intel: intelRes.data,
        recommendations: recommendationsRes.data
      } as any);
      setShowCustomerModal(true);
      
      // Track engagement
      await apiClient.post('/crm/automation/engagement', {
        customer_id: task.customer_id,
        engagement_type: 'call',
        status: 'completed',
        agent_id: agentId
      });
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const handleCompleteTask = async (outcome: string, notes: string) => {
    if (!selectedTask) return;
    
    try {
      await apiClient.put(`/crm/automation/tasks/${selectedTask.id}/status`, {
        status: 'completed',
        outcome,
        notes
      });
      
      setShowCustomerModal(false);
      loadDashboard();
      alert('Task completed successfully!');
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert('Failed to complete task');
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      hot: 'bg-red-100 text-red-800 border-red-300',
      warm: 'bg-orange-100 text-orange-800 border-orange-300',
      cold: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[priority as keyof typeof colors] || colors.cold;
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'hot') return <FaFire className="text-red-500" />;
    if (priority === 'warm') return <FaClock className="text-orange-500" />;
    return <FaClock className="text-blue-500" />;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Agent Dashboard</h1>
            <p className="text-gray-600 mt-1">Your daily call tasks and performance</p>
          </div>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Tasks</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.today_tasks || 0}</p>
              </div>
              <FaChartLine className="text-4xl text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">🔥 Hot Leads</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.hot_leads || 0}</p>
              </div>
              <FaFire className="text-4xl text-red-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Warm Leads</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.warm_leads || 0}</p>
              </div>
              <FaClock className="text-4xl text-orange-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.pending || 0}</p>
              </div>
              <FaClock className="text-4xl text-yellow-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.completed || 0}</p>
              </div>
              <FaCheckCircle className="text-4xl text-green-500" />
            </div>
          </div>
        </div>

        {/* Next Best Action Card */}
        {nextAction && nextAction.action !== 'no_tasks' && (
          <div className={`p-6 rounded-lg shadow-lg border-2 ${
            nextAction.priority === 'HIGH' ? 'bg-red-50 border-red-400' :
            nextAction.priority === 'MEDIUM' ? 'bg-orange-50 border-orange-400' :
            'bg-blue-50 border-blue-400'
          }`}>
            <div className="flex items-start gap-4">
              <div className="text-4xl">
                {nextAction.priority === 'HIGH' ? '🔥' : 
                 nextAction.priority === 'MEDIUM' ? '📞' : '📧'}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  What To Do Next?
                </h2>
                <p className="text-lg text-gray-700 mb-4">{nextAction.message}</p>
                
                {nextAction.customer_intel && (
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">Customer Info:</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>📱 Phone: {nextAction.customer_intel.phone || 'N/A'}</div>
                      <div>💰 Lifetime Value: ৳{nextAction.customer_intel.lifetime_value || 0}</div>
                      <div>📦 Total Orders: {nextAction.customer_intel.total_orders || 0}</div>
                      <div>📅 Last Purchase: {nextAction.customer_intel.days_since_last_order || 0} days ago</div>
                    </div>
                  </div>
                )}
                
                {nextAction.products_to_push && nextAction.products_to_push.length > 0 && (
                  <div className="bg-white p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">🎯 Products to Push:</h3>
                    <ul className="list-disc list-inside text-sm">
                      {nextAction.products_to_push.map((product, idx) => (
                        <li key={idx} className="text-gray-700">{product}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {nextAction.task && (
                  <button
                    onClick={() => handleStartCall(nextAction.task!)}
                    className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
                  >
                    <FaPhone /> Start Call Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Call Task List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">Today's Call List</h2>
            <p className="text-sm text-gray-600">Sorted by priority</p>
          </div>
          
          <div className="overflow-x-auto">
            {!stats?.tasks || stats.tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FaCheckCircle className="text-5xl mx-auto mb-4 text-green-500" />
                <p className="text-lg">🎉 No pending tasks! Great job!</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityBadge(task.priority)}`}>
                          {getPriorityIcon(task.priority)}
                          {task.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{task.customer_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{task.call_reason || 'Follow-up'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{task.scheduled_time || 'ASAP'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleStartCall(task)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2"
                          >
                            <FaPhone /> Call
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Customer Detail Modal */}
        {showCustomerModal && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">Customer Call</h2>
                <p className="text-sm text-gray-600">Customer ID: {selectedTask.customer_id}</p>
              </div>
              
              <div className="p-6 space-y-4">
                {(selectedTask as any).customer_intel && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-3">Customer Intelligence</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-semibold">
                          {(selectedTask as any).customer_intel.name} {(selectedTask as any).customer_intel.last_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <span className="ml-2 font-semibold">{(selectedTask as any).customer_intel.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Orders:</span>
                        <span className="ml-2 font-semibold">{(selectedTask as any).customer_intel.total_orders}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Lifetime Value:</span>
                        <span className="ml-2 font-semibold">৳{(selectedTask as any).customer_intel.lifetime_value}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg Order:</span>
                        <span className="ml-2 font-semibold">৳{(selectedTask as any).customer_intel.avg_order_value}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Purchase:</span>
                        <span className="ml-2 font-semibold">{(selectedTask as any).customer_intel.days_since_last_order} days ago</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {(selectedTask as any).recommendations && (selectedTask as any).recommendations.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-3">🎯 Recommended Products</h3>
                    <ul className="space-y-2">
                      {(selectedTask as any).recommendations.map((rec: any, idx: number) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {rec.priority}
                          </span>
                          <span className="font-semibold">{rec.recommended_product_name}</span>
                          <span className="text-gray-600 text-xs">({rec.rule_name})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Call Outcome</label>
                  <select
                    id="outcome"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="interested">Interested</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="callback">Request Callback</option>
                    <option value="order_placed">Order Placed</option>
                    <option value="no_answer">No Answer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    id="notes"
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any notes about the call..."
                  ></textarea>
                </div>
              </div>
              
              <div className="p-6 border-t flex gap-3">
                <button
                  onClick={() => {
                    const outcome = (document.getElementById('outcome') as HTMLSelectElement).value;
                    const notes = (document.getElementById('notes') as HTMLTextAreaElement).value;
                    handleCompleteTask(outcome, notes);
                  }}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Complete Task
                </button>
                <button
                  onClick={() => setShowCustomerModal(false)}
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
