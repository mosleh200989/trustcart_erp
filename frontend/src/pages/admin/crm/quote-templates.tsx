import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

interface QuoteTemplate {
  id: number;
  name: string;
  description: string;
  headerContent: string;
  footerContent: string;
  termsAndConditions: string;
  paymentTerms: string;
  templateLayout: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function QuoteTemplatesPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<QuoteTemplate[]>('/crm/quote-templates');
      const data = Array.isArray(res.data) ? res.data : [];
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load quote templates', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData: Partial<QuoteTemplate>) => {
    try {
      if (editingTemplate) {
        await apiClient.put(`/crm/quote-templates/${editingTemplate.id}`, templateData);
      } else {
        await apiClient.post('/crm/quote-templates', templateData);
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
      await apiClient.delete(`/crm/quote-templates/${id}`);
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template', error);
      toast.error('Failed to delete template. Default template cannot be deleted.');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await apiClient.put(`/crm/quote-templates/${id}`, { isDefault: true });
      loadTemplates();
    } catch (error) {
      console.error('Failed to set default template', error);
      toast.error('Failed to set default template');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Quote Templates</h1>
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

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <p className="col-span-full text-gray-500">Loading...</p>
          ) : templates.length === 0 ? (
            <p className="col-span-full text-gray-500">No templates found</p>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{template.name}</h3>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {template.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Default</span>
                    )}
                    {template.isActive && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div>
                    <span className="font-medium text-gray-700">Header:</span>
                    <p className="text-gray-600 line-clamp-2">{template.headerContent}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Footer:</span>
                    <p className="text-gray-600 line-clamp-2">{template.footerContent}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Payment Terms:</span>
                    <p className="text-gray-600 line-clamp-2">{template.paymentTerms}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {!template.isDefault && (
                    <button
                      onClick={() => handleSetDefault(template.id)}
                      className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-sm"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowModal(true);
                    }}
                    className="text-green-600 hover:bg-green-50 px-2 py-1 rounded text-sm"
                  >
                    Edit
                  </button>
                  {!template.isDefault && (
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  )}
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
  template: QuoteTemplate | null;
  onSave: (data: Partial<QuoteTemplate>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    headerContent: template?.headerContent || '',
    footerContent: template?.footerContent || '',
    termsAndConditions: template?.termsAndConditions || '',
    paymentTerms: template?.paymentTerms || '',
    templateLayout: template?.templateLayout || 'standard',
    isDefault: template?.isDefault || false,
    isActive: template?.isActive ?? true,
  });
  
  const [showPreview, setShowPreview] = useState(false);

  const sampleQuoteData = {
    quoteNumber: 'Q-2025-001',
    date: new Date().toLocaleDateString(),
    customer: {
      name: 'Sample Customer Inc.',
      address: '123 Business St, City, State 12345',
      email: 'contact@samplecustomer.com'
    },
    items: [
      { name: 'Product A', quantity: 2, unitPrice: 100, total: 200 },
      { name: 'Service B', quantity: 1, unitPrice: 500, total: 500 },
    ],
    subtotal: 700,
    tax: 70,
    total: 770
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            {template ? 'Edit Template' : 'New Template'}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
              ×
            </button>
          </div>
        </div>

        <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
          {/* Form Section */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={formData.templateLayout}
                onChange={(e) => setFormData({ ...formData, templateLayout: e.target.value })}
              >
                <option value="standard">Standard</option>
                <option value="modern">Modern</option>
                <option value="classic">Classic</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Header Content</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
              value={formData.headerContent}
              onChange={(e) => setFormData({ ...formData, headerContent: e.target.value })}
              placeholder="Thank you for your interest..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Content</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
              value={formData.footerContent}
              onChange={(e) => setFormData({ ...formData, footerContent: e.target.value })}
              placeholder="We look forward to doing business with you..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terms and Conditions</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={4}
              value={formData.termsAndConditions}
              onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
              placeholder="1. This quote is valid for 30 days..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              placeholder="Payment due within 30 days..."
            />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">
                Set as default template
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

        {/* Preview Section */}
        {showPreview && (
          <div className="border-l border-gray-200 pl-6 max-h-[70vh] overflow-y-auto">
            <h4 className="font-semibold text-gray-800 mb-4">Preview</h4>
            <div className="bg-white border border-gray-300 rounded p-6 text-sm">
              {/* Header */}
              <div className="mb-6">
                <div className="text-gray-700 whitespace-pre-wrap">
                  {formData.headerContent || 'No header content'}
                </div>
              </div>

              {/* Quote Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                <div>
                  <p><strong>Quote #:</strong> {sampleQuoteData.quoteNumber}</p>
                  <p><strong>Date:</strong> {sampleQuoteData.date}</p>
                </div>
                <div>
                  <p><strong>{sampleQuoteData.customer.name}</strong></p>
                  <p>{sampleQuoteData.customer.address}</p>
                  <p>{sampleQuoteData.customer.email}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-6 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Item</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleQuoteData.items.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{item.name}</td>
                      <td className="text-right p-2">{item.quantity}</td>
                      <td className="text-right p-2">${item.unitPrice}</td>
                      <td className="text-right p-2">${item.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2">
                  <tr>
                    <td colSpan={3} className="text-right p-2 font-medium">Subtotal:</td>
                    <td className="text-right p-2">${sampleQuoteData.subtotal}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="text-right p-2">Tax:</td>
                    <td className="text-right p-2">${sampleQuoteData.tax}</td>
                  </tr>
                  <tr className="font-bold">
                    <td colSpan={3} className="text-right p-2">Total:</td>
                    <td className="text-right p-2">${sampleQuoteData.total}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Payment Terms */}
              {formData.paymentTerms && (
                <div className="mb-4">
                  <h5 className="font-semibold mb-1">Payment Terms:</h5>
                  <div className="text-gray-700 text-xs whitespace-pre-wrap">
                    {formData.paymentTerms}
                  </div>
                </div>
              )}

              {/* Terms and Conditions */}
              {formData.termsAndConditions && (
                <div className="mb-4">
                  <h5 className="font-semibold mb-1">Terms & Conditions:</h5>
                  <div className="text-gray-700 text-xs whitespace-pre-wrap">
                    {formData.termsAndConditions}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 pt-4 border-t">
                <div className="text-gray-700 text-xs whitespace-pre-wrap">
                  {formData.footerContent || 'No footer content'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
