import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { warehouses } from '@/services/api';
import { FaPlus, FaEdit, FaTrash, FaWarehouse, FaMapMarkerAlt } from 'react-icons/fa';

interface Warehouse {
  id: number;
  code: string;
  name: string;
  type: string;
  address: string;
  city: string;
  district: string;
  country: string;
  phone: string;
  email: string;
  is_active: boolean;
  is_default: boolean;
  notes: string;
  zones?: any[];
  locations?: any[];
}

const WAREHOUSE_TYPES = ['main', 'branch', 'cold_storage', 'dark_store', 'distribution_center', 'returns'];

export default function WarehousesManagement() {
  const toast = useToast();
  const [items, setItems] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Warehouse | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'zones'>('list');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'main',
    address: '',
    city: '',
    district: '',
    country: 'Bangladesh',
    phone: '',
    email: '',
    is_active: true,
    is_default: false,
    notes: '',
  });

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await warehouses.list();
      setItems(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await warehouses.update(editingItem.id, formData);
        toast.success('Warehouse updated');
      } else {
        await warehouses.create(formData);
        toast.success('Warehouse created');
      }
      setShowModal(false);
      resetForm();
      loadWarehouses();
    } catch (error: any) {
      console.error('Failed to save warehouse:', error);
      toast.error(error?.response?.data?.message || 'Failed to save warehouse');
    }
  };

  const handleEdit = (item: Warehouse) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      type: item.type || 'main',
      address: item.address || '',
      city: item.city || '',
      district: item.district || '',
      country: item.country || 'Bangladesh',
      phone: item.phone || '',
      email: item.email || '',
      is_active: item.is_active,
      is_default: item.is_default,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;
    try {
      await warehouses.remove(id);
      toast.success('Warehouse deleted');
      loadWarehouses();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete warehouse');
    }
  };

  const handleViewZones = async (wh: Warehouse) => {
    setSelectedWarehouse(wh);
    setActiveTab('zones');
    try {
      const [z, l] = await Promise.all([
        warehouses.listZones(wh.id),
        warehouses.listLocations(wh.id),
      ]);
      setZones(z);
      setLocations(l);
    } catch (error) {
      console.error('Failed to load zones/locations:', error);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      type: 'main',
      address: '',
      city: '',
      district: '',
      country: 'Bangladesh',
      phone: '',
      email: '',
      is_active: true,
      is_default: false,
      notes: '',
    });
  };

  const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaWarehouse className="text-blue-600" />
            Warehouse Management
          </h1>
          {activeTab === 'list' && (
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FaPlus /> Add Warehouse
            </button>
          )}
          {activeTab === 'zones' && (
            <button
              onClick={() => { setActiveTab('list'); setSelectedWarehouse(null); }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              ← Back to Warehouses
            </button>
          )}
        </div>

        {/* Warehouse List */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FaWarehouse className="text-6xl mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No warehouses found. Add your first warehouse to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((wh) => (
                      <tr key={wh.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">{wh.code}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {wh.name}
                          {wh.is_default && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">Default</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{typeLabel(wh.type)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{wh.city}, {wh.district}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            wh.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {wh.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => handleViewZones(wh)} className="p-2 text-purple-600 hover:bg-purple-50 rounded" title="View Zones & Locations">
                              <FaMapMarkerAlt />
                            </button>
                            <button onClick={() => handleEdit(wh)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                              <FaEdit />
                            </button>
                            <button onClick={() => handleDelete(wh.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
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
        )}

        {/* Zones & Locations View */}
        {activeTab === 'zones' && selectedWarehouse && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">{selectedWarehouse.name}</h2>
              <p className="text-sm text-gray-500">{selectedWarehouse.code} — {typeLabel(selectedWarehouse.type)}</p>
            </div>

            {/* Zones */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Zones ({zones.length})</h3>
              </div>
              {zones.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No zones defined</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temperature</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Humidity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {zones.map((z: any) => (
                        <tr key={z.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{z.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{typeLabel(z.type)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {z.temperature_min != null ? `${z.temperature_min}°C – ${z.temperature_max}°C` : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {z.humidity_min != null ? `${z.humidity_min}% – ${z.humidity_max}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Locations */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Locations ({locations.length})</h3>
              </div>
              {locations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No locations defined</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aisle</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rack</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shelf</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {locations.map((loc: any) => (
                        <tr key={loc.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-mono text-gray-900">{loc.code}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{loc.aisle || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{loc.rack || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{loc.shelf || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{loc.bin || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{typeLabel(loc.location_type)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">
                  {editingItem ? 'Edit Warehouse' : 'Add New Warehouse'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="WH-001"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {WAREHOUSE_TYPES.map(t => (
                        <option key={t} value={t}>{typeLabel(t)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">Default Warehouse</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors"
                  >
                    {editingItem ? 'Update Warehouse' : 'Create Warehouse'}
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
