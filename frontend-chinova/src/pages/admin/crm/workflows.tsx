import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

interface AutomationWorkflow {
  id: number;
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: any;
  conditions: any[];
  actions: any[];
  isActive: boolean;
  executionCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
}

interface WorkflowExecution {
  id: number;
  workflowId: number;
  triggerData: any;
  executionStatus: 'success' | 'failed' | 'partial';
  actionsExecuted: any[];
  errorMessage?: string;
  executedAt: string;
}

export default function WorkflowsPage() {
  const toast = useToast();
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    if (selectedWorkflow) {
      loadExecutions(selectedWorkflow.id);
    }
  }, [selectedWorkflow]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<AutomationWorkflow[]>('/crm/workflows');
      const data = Array.isArray(res.data) ? res.data : [];
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async (workflowId: number) => {
    try {
      const res = await apiClient.get<WorkflowExecution[]>(`/crm/workflows/${workflowId}/executions`);
      const data = Array.isArray(res.data) ? res.data : [];
      setExecutions(data);
    } catch (error) {
      console.error('Failed to load executions', error);
      setExecutions([]);
    }
  };

  const handleToggleActive = async (workflow: AutomationWorkflow) => {
    try {
      await apiClient.put(`/crm/workflows/${workflow.id}`, {
        isActive: !workflow.isActive,
      });
      loadWorkflows();
    } catch (error) {
      console.error('Failed to toggle workflow', error);
      toast.error('Failed to toggle workflow');
    }
  };

  const handleSaveWorkflow = async (workflowData: Partial<AutomationWorkflow>) => {
    try {
      if (editingWorkflow) {
        await apiClient.put(`/crm/workflows/${editingWorkflow.id}`, workflowData);
      } else {
        await apiClient.post('/crm/workflows', workflowData);
      }
      loadWorkflows();
      setShowModal(false);
      setEditingWorkflow(null);
    } catch (error) {
      console.error('Failed to save workflow', error);
      toast.error('Failed to save workflow');
    }
  };

  const handleDeleteWorkflow = async (id: number) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      await apiClient.delete(`/crm/workflows/${id}`);
      loadWorkflows();
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(null);
      }
    } catch (error) {
      console.error('Failed to delete workflow', error);
      toast.error('Failed to delete workflow');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Workflow Automation</h1>
          <button
            onClick={() => {
              setEditingWorkflow(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            New Workflow
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflows List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Workflows</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : workflows.length === 0 ? (
              <p className="text-gray-500">No workflows found</p>
            ) : (
              workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  onClick={() => setSelectedWorkflow(workflow)}
                  className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    selectedWorkflow?.id === workflow.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">{workflow.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        workflow.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {workflow.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{workflow.description}</p>
                  <div className="text-xs text-gray-500">
                    <div>Trigger: {workflow.triggerType.replace(/_/g, ' ')}</div>
                    <div>
                      Executions: {workflow.executionCount} ({workflow.successCount} success, {workflow.failureCount} failed)
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(workflow);
                      }}
                      className="flex-1 text-sm px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                      {workflow.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingWorkflow(workflow);
                        setShowModal(true);
                      }}
                      className="flex-1 text-sm px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorkflow(workflow.id);
                      }}
                      className="flex-1 text-sm px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Workflow Details & Executions */}
          <div className="lg:col-span-2">
            {selectedWorkflow ? (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">{selectedWorkflow.name}</h2>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Description</h3>
                      <p className="text-gray-600">{selectedWorkflow.description}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Trigger</h3>
                      <p className="text-gray-600 capitalize">{selectedWorkflow.triggerType.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Conditions</h3>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {selectedWorkflow.conditions.length === 0 ? (
                          <p>No conditions</p>
                        ) : (
                          <pre className="whitespace-pre-wrap font-mono text-xs">
                            {JSON.stringify(selectedWorkflow.conditions, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Actions</h3>
                      <div className="space-y-2">
                        {selectedWorkflow.actions.map((action: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded">
                            <div className="font-medium text-sm capitalize">
                              {action.type?.replace(/_/g, ' ') || 'Unknown Action'}
                            </div>
                            <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap font-mono">
                              {JSON.stringify(action.config || {}, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Execution History */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Execution History</h3>
                  {executions.length === 0 ? (
                    <p className="text-gray-500">No executions yet</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {executions.map((execution) => (
                        <div key={execution.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                execution.executionStatus === 'success'
                                  ? 'bg-green-100 text-green-800'
                                  : execution.executionStatus === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {execution.executionStatus}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(execution.executedAt).toLocaleString()}
                            </span>
                          </div>
                          {execution.errorMessage && (
                            <div className="text-sm text-red-600 mb-2">{execution.errorMessage}</div>
                          )}
                          <div className="text-xs text-gray-600">
                            Actions executed: {execution.actionsExecuted.length}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">Select a workflow to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <WorkflowModal
            workflow={editingWorkflow}
            onSave={handleSaveWorkflow}
            onClose={() => {
              setShowModal(false);
              setEditingWorkflow(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function WorkflowModal({
  workflow,
  onSave,
  onClose,
}: {
  workflow: AutomationWorkflow | null;
  onSave: (data: Partial<AutomationWorkflow>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: workflow?.name || '',
    description: workflow?.description || '',
    triggerType: workflow?.triggerType || 'deal_stage_changed',
    triggerConfig: workflow?.triggerConfig || {},
    conditions: workflow?.conditions || [],
    actions: workflow?.actions || [],
    isActive: workflow?.isActive ?? false,
  });

  const [newAction, setNewAction] = useState({
    type: 'send_email',
    config: {},
  });

  const handleAddAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, { ...newAction }],
    });
    setNewAction({ type: 'send_email', config: {} });
  };

  const handleRemoveAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, idx) => idx !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
        <h3 className="text-xl font-semibold mb-4">
          {workflow ? 'Edit Workflow' : 'New Workflow'}
        </h3>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.triggerType}
                onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
              >
                <option value="deal_stage_changed">Deal Stage Changed</option>
                <option value="task_created">Task Created</option>
                <option value="task_completed">Task Completed</option>
                <option value="lead_assigned">Lead Assigned</option>
                <option value="email_opened">Email Opened</option>
                <option value="email_clicked">Email Clicked</option>
                <option value="meeting_scheduled">Meeting Scheduled</option>
                <option value="meeting_completed">Meeting Completed</option>
                <option value="time_based">Time Based</option>
                <option value="inactivity">Inactivity</option>
                <option value="field_changed">Field Changed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
            <div className="space-y-2 mb-3">
              {formData.actions.map((action: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 bg-gray-50 p-3 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm capitalize mb-1">
                      {action.type?.replace(/_/g, ' ')}
                    </div>
                    <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                      {JSON.stringify(action.config, null, 2)}
                    </pre>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAction(idx)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Action Type</label>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    value={newAction.type}
                    onChange={(e) => setNewAction({ ...newAction, type: e.target.value })}
                  >
                    <option value="send_email">Send Email</option>
                    <option value="create_task">Create Task</option>
                    <option value="update_deal_stage">Update Deal Stage</option>
                    <option value="assign_to_user">Assign to User</option>
                    <option value="add_tag">Add Tag</option>
                    <option value="send_notification">Send Notification</option>
                    <option value="wait">Wait (delay)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Config (JSON)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono"
                    placeholder='{"key": "value"}'
                    onChange={(e) => {
                      try {
                        const config = JSON.parse(e.target.value || '{}');
                        setNewAction({ ...newAction, config });
                      } catch (err) {
                        // Invalid JSON
                      }
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddAction}
                className="w-full bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Add Action
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Activate workflow immediately
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
