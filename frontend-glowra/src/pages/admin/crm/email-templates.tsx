import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useRouter } from 'next/router';
import { useToast } from '@/contexts/ToastContext';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  htmlBody?: string;
  category: 'welcome' | 'follow_up' | 'quote' | 'meeting' | 'newsletter' | 'promotional' | 'other';
  variables: string[];
  isShared: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function EmailTemplatesPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<EmailTemplate[]>('/crm/email-templates');
      const data = Array.isArray(res.data) ? res.data : [];
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load email templates', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData: Partial<EmailTemplate>) => {
    try {
      if (editingTemplate) {
        await apiClient.put(`/crm/email-templates/${editingTemplate.id}`, templateData);
      } else {
        await apiClient.post('/crm/email-templates', templateData);
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
      await apiClient.delete(`/crm/email-templates/${id}`);
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (id: number) => {
    try {
      await apiClient.post(`/crm/email-templates/${id}/duplicate`);
      loadTemplates();
    } catch (error) {
      console.error('Failed to duplicate template', error);
      toast.error('Failed to duplicate template');
    }
  };

  const filteredTemplates = filterCategory
    ? templates.filter(t => t.category === filterCategory)
    : templates;

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      welcome: 'bg-blue-100 text-blue-800',
      follow_up: 'bg-green-100 text-green-800',
      quote: 'bg-purple-100 text-purple-800',
      meeting: 'bg-orange-100 text-orange-800',
      newsletter: 'bg-pink-100 text-pink-800',
      promotional: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Email Templates</h1>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
          <select
            className="border border-gray-300 rounded-lg px-4 py-2"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="welcome">Welcome</option>
            <option value="follow_up">Follow Up</option>
            <option value="quote">Quote</option>
            <option value="meeting">Meeting</option>
            <option value="newsletter">Newsletter</option>
            <option value="promotional">Promotional</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Templates List */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : filteredTemplates.length === 0 ? (
            <p className="text-gray-500">No templates found</p>
          ) : (
            filteredTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-800 text-lg">{template.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(template.category)}`}>
                        {template.category.replace('_', ' ')}
                      </span>
                      {template.isShared && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Shared</span>
                      )}
                      {!template.isActive && (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Inactive</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">Subject:</span> {template.subject}
                    </div>
                    <div className="text-sm text-gray-600 mb-3 line-clamp-2">
                      <span className="font-medium">Body:</span> {template.body}
                    </div>
                    {template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {template.variables.map((variable, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono"
                          >
                            {'{{' + variable + '}}'}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Used {template.usageCount} times
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicateTemplate(template.id)}
                      className="text-green-600 hover:bg-green-50 px-3 py-1 rounded text-sm"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
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
  template: EmailTemplate | null;
  onSave: (data: Partial<EmailTemplate>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body || '',
    htmlBody: template?.htmlBody || '',
    category: template?.category || 'other',
    variables: template?.variables || [],
    isShared: template?.isShared || false,
    isActive: template?.isActive ?? true,
  });

  const [newVariable, setNewVariable] = useState('');

  const handleAddVariable = () => {
    if (newVariable && !formData.variables.includes(newVariable)) {
      setFormData({
        ...formData,
        variables: [...formData.variables, newVariable],
      });
      setNewVariable('');
    }
  };

  const handleRemoveVariable = (variable: string) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter(v => v !== variable),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8">
        <h3 className="text-xl font-semibold mb-4">
          {template ? 'Edit Template' : 'New Template'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                <option value="welcome">Welcome</option>
                <option value="follow_up">Follow Up</option>
                <option value="quote">Quote</option>
                <option value="meeting">Meeting</option>
                <option value="newsletter">Newsletter</option>
                <option value="promotional">Promotional</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
              <span className="text-xs text-gray-500 ml-2">(Use {'{{variable_name}}'} for dynamic values)</span>
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Welcome to {{company_name}}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body (Plain Text)
              <span className="text-xs text-gray-500 ml-2">(Use {'{{variable_name}}'} for dynamic values)</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
              rows={8}
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="e.g., Dear {{customer_name}}, Thank you for choosing us..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HTML Body (Optional)
              <span className="text-xs text-gray-500 ml-2">(Use {'{{variable_name}}'} for dynamic values)</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
              rows={8}
              value={formData.htmlBody}
              onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
              placeholder="e.g., <p>Dear {{customer_name}}, Thank you for choosing us...</p>"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Variables</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddVariable()}
                placeholder="e.g., customer_name"
              />
              <button
                type="button"
                onClick={handleAddVariable}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.variables.map((variable, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono flex items-center gap-1"
                >
                  {'{{' + variable + '}}'}
                  <button
                    type="button"
                    onClick={() => handleRemoveVariable(variable)}
                    className="text-red-600 hover:text-red-800 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isShared"
                checked={formData.isShared}
                onChange={(e) => setFormData({ ...formData, isShared: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isShared" className="text-sm font-medium text-gray-700">
                Share with all users
              </label>
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
                Active
              </label>
            </div>
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
