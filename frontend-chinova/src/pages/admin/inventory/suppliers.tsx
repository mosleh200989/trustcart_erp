import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { suppliers } from '@/services/api';
import { FaPlus, FaEdit, FaTrash, FaTruck, FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';

interface Supplier {
  id: number;
  code: string;
  company_name: string;
  company_name_bn: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  country: string;
  payment_terms: string;
  lead_time_days: number;
  rating: number;
  category: string;
  status: string;
  is_active: boolean;
  total_orders: number;
  total_amount: number;
}

const PAYMENT_TERMS = ['cod', 'net_15', 'net_30', 'net_60', 'net_90', 'advance'];
const CATEGORIES = ['organic_produce', 'dairy', 'grains', 'spices', 'oils', 'sweeteners', 'beverages', 'snacks', 'frozen', 'packaging', 'general'];
const STATUSES = ['active', 'inactive', 'blocked', 'pending_approval'];

export default function SuppliersManagement() {
  const toast = useToast();
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    code: '',
    company_name: '',
    company_name_bn: '',
    contact_person: '',
    email: '',
    phone: '',
    alt_phone: '',
    address: '',
    city: '',
    district: '',
    country: 'Bangladesh',
    payment_terms: 'net_30',
    credit_limit: 0,
    lead_time_days: 3,
    category: 'general',
    notes: '',
    status: 'active',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await suppliers.list();
      setItems(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        credit_limit: Number(formData.credit_limit),
        lead_time_days: Number(formData.lead_time_days),
      };
      if (editingItem) {
        await suppliers.update(editingItem.id, submitData);
        toast.success('Supplier updated');
      } else {
        await suppliers.create(submitData);
        toast.success('Supplier created');
      }
      setShowModal(false);
      resetForm();
      loadSuppliers();
    } catch (error: any) {
      console.error('Failed to save supplier:', error);
      toast.error(error?.response?.data?.message || 'Failed to save supplier');
    }
  };

  const handleEdit = (item: Supplier) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      company_name: item.company_name,
      company_name_bn: item.company_name_bn || '',
      contact_person: item.contact_person || '',
      email: item.email || '',
      phone: item.phone || '',
      alt_phone: '',
      address: item.address || '',
      city: item.city || '',
      district: item.district || '',
      country: item.country || 'Bangladesh',
      payment_terms: item.payment_terms || 'net_30',
      credit_limit: 0,
      lead_time_days: item.lead_time_days || 3,
      category: item.category || 'general',
      notes: '',
      status: item.status || 'active',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await suppliers.remove(id);
      toast.success('Supplier deleted');
      loadSuppliers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete supplier');
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      company_name: '',
      company_name_bn: '',
      contact_person: '',
      email: '',
      phone: '',
      alt_phone: '',
      address: '',
      city: '',
      district: '',
      country: 'Bangladesh',
      payment_terms: 'net_30',
      credit_limit: 0,
      lead_time_days: 3,
      category: 'general',
      notes: '',
      status: 'active',
    });
  };

  const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const filteredItems = filterStatus === 'all' ? items : items.filter(s => s.status === filterStatus);

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaTruck className="text-green-600" />
            Supplier Management
          </h1>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <FaPlus /> Add Supplier
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          {['all', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterStatus === s
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'All' : typeLabel(s)}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-500">{filteredItems.length} supplier(s)</span>
        </div>

        {/* Supplier Grid */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FaTruck className="text-6xl mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No suppliers found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((sup) => (
                    <tr key={sup.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">{sup.code}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{sup.company_name}</div>
                        {sup.company_name_bn && (
                          <div className="text-xs text-gray-500">{sup.company_name_bn}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{sup.contact_person}</div>
                        {sup.phone && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <FaPhone className="text-gray-400" size={10} /> {sup.phone}
                          </div>
                        )}
                        {sup.email && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <FaEnvelope className="text-gray-400" size={10} /> {sup.email}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{typeLabel(sup.category || '')}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{typeLabel(sup.payment_terms || '')}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{sup.lead_time_days} days</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <FaStar className="text-yellow-500" size={14} />
                          <span className="text-sm">{sup.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor(sup.status)}`}>
                          {typeLabel(sup.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(sup)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                            <FaEdit />
                          </button>
                          <button onClick={() => handleDelete(sup.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">
                  {editingItem ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Code *</label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="SUP-001"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{typeLabel(s)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name (English) *</label>
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name (Bengali)</label>
                      <input
                        type="text"
                        value={formData.company_name_bn}
                        onChange={(e) => setFormData({ ...formData, company_name_bn: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alt Phone</label>
                      <input
                        type="text"
                        value={formData.alt_phone}
                        onChange={(e) => setFormData({ ...formData, alt_phone: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{typeLabel(c)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                      <select
                        value={formData.payment_terms}
                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        {PAYMENT_TERMS.map(p => (
                          <option key={p} value={p}>{typeLabel(p)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
                      <input
                        type="number"
                        value={formData.lead_time_days}
                        onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        min={0}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                    <input
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      min={0}
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition-colors"
                  >
                    {editingItem ? 'Update Supplier' : 'Create Supplier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
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
