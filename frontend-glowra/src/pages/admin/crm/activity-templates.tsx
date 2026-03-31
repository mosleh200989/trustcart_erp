import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

interface ActivityTemplate {
  id: number;
  name: string;
  activityType: 'call' | 'email' | 'meeting' | 'note' | 'sms' | 'whatsapp';
  subjectTemplate: string;
  descriptionTemplate: string;
  duration?: number;
  isShared: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export default function ActivityTemplatesPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null);
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<ActivityTemplate[]>('/crm/activity-templates');
      const data = Array.isArray(res.data) ? res.data : [];
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load activity templates', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData: Partial<ActivityTemplate>) => {
    try {
      if (editingTemplate) {
        await apiClient.put(`/crm/activity-templates/${editingTemplate.id}`, templateData);
      } else {
        await apiClient.post('/crm/activity-templates', templateData);
      }
      loadTemplates();
      setShowModal(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Failed to save template', error);
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await apiClient.delete(`/crm/activity-templates/${id}`);
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (id: number) => {
    try {
      await apiClient.post(`/crm/activity-templates/${id}/duplicate`);
      loadTemplates();
    } catch (error) {
      console.error('Failed to duplicate template', error);
      toast.error('Failed to duplicate template');
    }
  };

  const filteredTemplates = filterType
    ? templates.filter(t => t.activityType === filterType)
    : templates;

  const getActivityTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      call: '📞',
      email: '📧',
      meeting: '🤝',
      note: '📝',
      sms: '💬',
      whatsapp: '💚',
    };
    return icons[type] || '📄';
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Activity Templates</h1>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            New Template
          </button>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
          <select
            className="border border-gray-300 rounded-lg px-4 py-2"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-gray-500">Loading...</p>
          ) : filteredTemplates.length === 0 ? (
            <p className="col-span-full text-gray-500">No templates found</p>
          ) : (
            filteredTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getActivityTypeIcon(template.activityType)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800">{template.name}</h3>
                      <span className="text-sm text-gray-500 capitalize">{template.activityType}</span>
                    </div>
                  </div>
                  {template.isShared && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Shared</span>
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Subject:</span>
                    <p className="text-gray-600 truncate">{template.subjectTemplate}</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="text-gray-600 line-clamp-2">{template.descriptionTemplate}</p>
                  </div>
                  {template.duration && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Duration:</span>
                      <span className="text-gray-600"> {template.duration} minutes</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowModal(true);
                    }}
                    className="flex-1 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDuplicateTemplate(template.id)}
                    className="flex-1 text-green-600 hover:bg-green-50 px-3 py-1 rounded"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="flex-1 text-red-600 hover:bg-red-50 px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <TemplateModal
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onClose={() => {
              setShowModal(false);
              setEditingTemplate(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function TemplateModal({
  template,
  onSave,
  onClose,
}: {
  template: ActivityTemplate | null;
  onSave: (data: Partial<ActivityTemplate>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    activityType: template?.activityType || 'call',
    subjectTemplate: template?.subjectTemplate || '',
    descriptionTemplate: template?.descriptionTemplate || '',
    duration: template?.duration || 30,
    isShared: template?.isShared || false,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h3 className="text-xl font-semibold mb-4">
          {template ? 'Edit Template' : 'New Template'}
        </h3>
        <div className="space-y-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.activityType}
                onChange={(e) => setFormData({ ...formData, activityType: e.target.value as any })}
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="note">Note</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Template
              <span className="text-xs text-gray-500 ml-2">(Use {'{{variable_name}}'} for dynamic values)</span>
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.subjectTemplate}
              onChange={(e) => setFormData({ ...formData, subjectTemplate: e.target.value })}
              placeholder="e.g., Follow up with {{customer_name}}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description Template
              <span className="text-xs text-gray-500 ml-2">(Use {'{{variable_name}}'} for dynamic values)</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={5}
              value={formData.descriptionTemplate}
              onChange={(e) => setFormData({ ...formData, descriptionTemplate: e.target.value })}
              placeholder="e.g., Discuss {{deal_name}} with {{customer_name}}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isShared"
              checked={formData.isShared}
              onChange={(e) => setFormData({ ...formData, isShared: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="isShared" className="text-sm font-medium text-gray-700">
              Share this template with all users
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
