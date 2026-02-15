import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/services/api';
import { FaPrint, FaPlus, FaStar, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';

interface PrinterSetting {
  id: number;
  printerName: string;
  printerType: string;
  isDefault: boolean;
  paperSize: string;
  stickerWidth: number;
  stickerHeight: number;
  invoiceHeader: string | null;
  invoiceFooter: string | null;
  companyName: string | null;
  companyAddress: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyLogoUrl: string | null;
  showLogo: boolean;
  showBarcode: boolean;
  isActive: boolean;
}

const EMPTY_FORM: Omit<PrinterSetting, 'id'> = {
  printerName: '',
  printerType: 'thermal',
  isDefault: false,
  paperSize: '80mm',
  stickerWidth: 100,
  stickerHeight: 150,
  invoiceHeader: '',
  invoiceFooter: '',
  companyName: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  companyLogoUrl: '',
  showLogo: true,
  showBarcode: true,
  isActive: true,
};

export default function PrinterSettingsPage() {
  const toast = useToast();
  const [printers, setPrinters] = useState<PrinterSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<PrinterSetting, 'id'>>(EMPTY_FORM);

  const loadPrinters = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/printer-settings');
      setPrinters(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load printer settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const name = target.name;
    let value: any;
    if (target.type === 'checkbox') {
      value = target.checked;
    } else if (target.type === 'number') {
      value = Number(target.value);
    } else {
      value = target.value;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (printer: PrinterSetting) => {
    setEditingId(printer.id);
    setForm({
      printerName: printer.printerName || '',
      printerType: printer.printerType || 'thermal',
      isDefault: printer.isDefault,
      paperSize: printer.paperSize || '80mm',
      stickerWidth: printer.stickerWidth || 100,
      stickerHeight: printer.stickerHeight || 150,
      invoiceHeader: printer.invoiceHeader || '',
      invoiceFooter: printer.invoiceFooter || '',
      companyName: printer.companyName || '',
      companyAddress: printer.companyAddress || '',
      companyPhone: printer.companyPhone || '',
      companyEmail: printer.companyEmail || '',
      companyLogoUrl: printer.companyLogoUrl || '',
      showLogo: printer.showLogo,
      showBarcode: printer.showBarcode,
      isActive: printer.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.printerName.trim()) {
      toast.warning('Printer name is required');
      return;
    }

    try {
      if (editingId) {
        await apiClient.put(`/printer-settings/${editingId}`, form);
        toast.success('Printer setting updated');
      } else {
        await apiClient.post('/printer-settings', form);
        toast.success('Printer setting created');
      }
      setShowForm(false);
      setEditingId(null);
      loadPrinters();
    } catch {
      toast.error('Failed to save printer setting');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await apiClient.put(`/printer-settings/${id}/set-default`);
      toast.success('Default printer updated');
      loadPrinters();
    } catch {
      toast.error('Failed to set default printer');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this printer setting?')) return;
    try {
      await apiClient.delete(`/printer-settings/${id}`);
      toast.success('Printer setting deleted');
      loadPrinters();
    } catch {
      toast.error('Failed to delete printer setting');
    }
  };

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FaPrint className="text-blue-600" />
              Printer Settings
            </h1>
            <p className="text-gray-600 mt-1">Configure printers for invoice and sticker printing</p>
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
          >
            <FaPlus />
            Add Printer
          </button>
        </div>

        {/* Printers List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : printers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FaPrint className="text-gray-300 text-6xl mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No printers configured yet</p>
            <button
              onClick={openAddForm}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first printer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {printers.map((printer) => (
              <div
                key={printer.id}
                className={`bg-white rounded-lg shadow-md border-2 transition-all hover:shadow-lg ${
                  printer.isDefault ? 'border-blue-500' : 'border-transparent'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        {printer.printerName}
                        {printer.isDefault && (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            Default
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 capitalize">{printer.printerType} printer</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        printer.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {printer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Paper Size:</span>
                      <span className="font-medium">{printer.paperSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sticker Size:</span>
                      <span className="font-medium">{printer.stickerWidth}mm x {printer.stickerHeight}mm</span>
                    </div>
                    {printer.companyName && (
                      <div className="flex justify-between">
                        <span>Company:</span>
                        <span className="font-medium">{printer.companyName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Show Logo:</span>
                      <span className="font-medium">{printer.showLogo ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Show Barcode:</span>
                      <span className="font-medium">{printer.showBarcode ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t flex items-center justify-between gap-2">
                    {!printer.isDefault && (
                      <button
                        onClick={() => handleSetDefault(printer.id)}
                        className="flex items-center gap-1 text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                        title="Set as default"
                      >
                        <FaStar /> Set Default
                      </button>
                    )}
                    {printer.isDefault && <div />}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditForm(printer)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(printer.id)}
                        className="text-red-500 hover:text-red-600"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">
                  {editingId ? 'Edit Printer Setting' : 'Add New Printer'}
                </h2>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                {/* Basic Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Basic Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Printer Name *</label>
                      <input
                        type="text"
                        name="printerName"
                        value={form.printerName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Printer Type</label>
                      <select
                        name="printerType"
                        value={form.printerType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="thermal">Thermal</option>
                        <option value="inkjet">Inkjet</option>
                        <option value="laser">Laser</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Paper Size</label>
                      <select
                        name="paperSize"
                        value={form.paperSize}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="58mm">58mm (Thermal)</option>
                        <option value="80mm">80mm (Thermal)</option>
                        <option value="100x150mm">100x150mm (Sticker)</option>
                        <option value="A5">A5</option>
                        <option value="A4">A4</option>
                      </select>
                    </div>
                    <div className="flex items-end gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="isDefault"
                          checked={form.isDefault}
                          onChange={handleInputChange}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Set as Default</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={form.isActive}
                          onChange={handleInputChange}
                          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sticker Size */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Sticker Dimensions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Width (mm)</label>
                      <input
                        type="number"
                        name="stickerWidth"
                        value={form.stickerWidth}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min={20}
                        max={300}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Height (mm)</label>
                      <input
                        type="number"
                        name="stickerHeight"
                        value={form.stickerHeight}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min={20}
                        max={300}
                      />
                    </div>
                  </div>
                </div>

                {/* Company Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Company Information (for Invoice)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <input
                        type="text"
                        name="companyName"
                        value={form.companyName || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Phone</label>
                      <input
                        type="text"
                        name="companyPhone"
                        value={form.companyPhone || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
                      <input
                        type="email"
                        name="companyEmail"
                        value={form.companyEmail || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                      <input
                        type="text"
                        name="companyLogoUrl"
                        value={form.companyLogoUrl || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                    <textarea
                      name="companyAddress"
                      value={form.companyAddress || ''}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Invoice Header/Footer */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Invoice Header & Footer</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Header</label>
                      <textarea
                        name="invoiceHeader"
                        value={form.invoiceHeader || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Text to show at top of invoice"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Footer</label>
                      <textarea
                        name="invoiceFooter"
                        value={form.invoiceFooter || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Text to show at bottom of invoice (e.g. Thank you!)"
                      />
                    </div>
                  </div>
                </div>

                {/* Display Options */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Display Options</h3>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showLogo"
                        checked={form.showLogo}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Logo on Print</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showBarcode"
                        checked={form.showBarcode}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Barcode/Order ID Barcode</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingId(null); }}
                    className="px-5 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                  >
                    <FaSave />
                    {editingId ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
