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
const ZONE_TYPES = ['ambient', 'cold', 'frozen', 'dry', 'hazardous'];
const LOCATION_TYPES = ['storage', 'receiving', 'shipping', 'returns', 'quarantine'];

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

  // Zone CRUD state
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [zoneForm, setZoneForm] = useState({
    name: '', type: 'ambient', temperature_min: '', temperature_max: '', humidity_min: '', humidity_max: '', is_active: true,
  });

  // Location CRUD state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any | null>(null);
  const [locationForm, setLocationForm] = useState({
    zone_id: '', code: '', aisle: '', rack: '', shelf: '', bin: '', location_type: 'storage', barcode: '', is_active: true,
  });

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

  const reloadZonesLocations = async () => {
    if (!selectedWarehouse) return;
    try {
      const [z, l] = await Promise.all([
        warehouses.listZones(selectedWarehouse.id),
        warehouses.listLocations(selectedWarehouse.id),
      ]);
      setZones(z);
      setLocations(l);
    } catch (error) {
      console.error('Failed to reload zones/locations:', error);
    }
  };

  // --- Zone CRUD ---
  const resetZoneForm = () => {
    setEditingZone(null);
    setZoneForm({ name: '', type: 'ambient', temperature_min: '', temperature_max: '', humidity_min: '', humidity_max: '', is_active: true });
  };

  const handleEditZone = (z: any) => {
    setEditingZone(z);
    setZoneForm({
      name: z.name || '',
      type: z.type || 'ambient',
      temperature_min: z.temperature_min ?? '',
      temperature_max: z.temperature_max ?? '',
      humidity_min: z.humidity_min ?? '',
      humidity_max: z.humidity_max ?? '',
      is_active: z.is_active ?? true,
    });
    setShowZoneModal(true);
  };

  const handleZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse) return;
    const payload: any = {
      warehouse_id: selectedWarehouse.id,
      name: zoneForm.name,
      type: zoneForm.type,
      is_active: zoneForm.is_active,
    };
    if (zoneForm.temperature_min !== '') payload.temperature_min = Number(zoneForm.temperature_min);
    if (zoneForm.temperature_max !== '') payload.temperature_max = Number(zoneForm.temperature_max);
    if (zoneForm.humidity_min !== '') payload.humidity_min = Number(zoneForm.humidity_min);
    if (zoneForm.humidity_max !== '') payload.humidity_max = Number(zoneForm.humidity_max);
    try {
      if (editingZone) {
        await warehouses.updateZone(selectedWarehouse.id, editingZone.id, payload);
        toast.success('Zone updated');
      } else {
        await warehouses.createZone(selectedWarehouse.id, payload);
        toast.success('Zone created');
      }
      setShowZoneModal(false);
      resetZoneForm();
      reloadZonesLocations();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save zone');
    }
  };

  const handleDeleteZone = async (zoneId: number) => {
    if (!selectedWarehouse || !confirm('Delete this zone? Locations in this zone will become unassigned.')) return;
    try {
      await warehouses.removeZone(selectedWarehouse.id, zoneId);
      toast.success('Zone deleted');
      reloadZonesLocations();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete zone');
    }
  };

  // --- Location CRUD ---
  const resetLocationForm = () => {
    setEditingLocation(null);
    setLocationForm({ zone_id: '', code: '', aisle: '', rack: '', shelf: '', bin: '', location_type: 'storage', barcode: '', is_active: true });
  };

  const handleEditLocation = (loc: any) => {
    setEditingLocation(loc);
    setLocationForm({
      zone_id: loc.zone_id ?? '',
      code: loc.code || '',
      aisle: loc.aisle || '',
      rack: loc.rack || '',
      shelf: loc.shelf || '',
      bin: loc.bin || '',
      location_type: loc.location_type || 'storage',
      barcode: loc.barcode || '',
      is_active: loc.is_active ?? true,
    });
    setShowLocationModal(true);
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse) return;
    const payload: any = {
      warehouse_id: selectedWarehouse.id,
      code: locationForm.code,
      location_type: locationForm.location_type,
      is_active: locationForm.is_active,
    };
    if (locationForm.zone_id !== '') payload.zone_id = Number(locationForm.zone_id);
    if (locationForm.aisle) payload.aisle = locationForm.aisle;
    if (locationForm.rack) payload.rack = locationForm.rack;
    if (locationForm.shelf) payload.shelf = locationForm.shelf;
    if (locationForm.bin) payload.bin = locationForm.bin;
    if (locationForm.barcode) payload.barcode = locationForm.barcode;
    try {
      if (editingLocation) {
        await warehouses.updateLocation(selectedWarehouse.id, editingLocation.id, payload);
        toast.success('Location updated');
      } else {
        await warehouses.createLocation(selectedWarehouse.id, payload);
        toast.success('Location created');
      }
      setShowLocationModal(false);
      resetLocationForm();
      reloadZonesLocations();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save location');
    }
  };

  const handleDeleteLocation = async (locId: number) => {
    if (!selectedWarehouse || !confirm('Delete this location?')) return;
    try {
      await warehouses.removeLocation(selectedWarehouse.id, locId);
      toast.success('Location deleted');
      reloadZonesLocations();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete location');
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
                <button
                  onClick={() => { resetZoneForm(); setShowZoneModal(true); }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                >
                  <FaPlus /> Add Zone
                </button>
              </div>
              {zones.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No zones defined. Click &quot;Add Zone&quot; to create one.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temperature</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Humidity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${z.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {z.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => handleEditZone(z)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><FaEdit /></button>
                              <button onClick={() => handleDeleteZone(z.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete"><FaTrash /></button>
                            </div>
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
                <button
                  onClick={() => { resetLocationForm(); setShowLocationModal(true); }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                >
                  <FaPlus /> Add Location
                </button>
              </div>
              {locations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No locations defined. Click &quot;Add Location&quot; to create one.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aisle</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rack</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shelf</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {locations.map((loc: any) => (
                        <tr key={loc.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-mono text-gray-900">{loc.code}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{zones.find((z: any) => z.id === loc.zone_id)?.name || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{loc.aisle || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{loc.rack || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{loc.shelf || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{loc.bin || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{typeLabel(loc.location_type)}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => handleEditLocation(loc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><FaEdit /></button>
                              <button onClick={() => handleDeleteLocation(loc.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete"><FaTrash /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zone Modal */}
        {showZoneModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">{editingZone ? 'Edit Zone' : 'Add New Zone'}</h2>
              </div>
              <form onSubmit={handleZoneSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. Cold Zone" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={zoneForm.type} onChange={(e) => setZoneForm({ ...zoneForm, type: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    {ZONE_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temp Min (°C)</label>
                    <input type="number" step="0.01" value={zoneForm.temperature_min} onChange={(e) => setZoneForm({ ...zoneForm, temperature_min: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temp Max (°C)</label>
                    <input type="number" step="0.01" value={zoneForm.temperature_max} onChange={(e) => setZoneForm({ ...zoneForm, temperature_max: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Humidity Min (%)</label>
                    <input type="number" step="0.01" value={zoneForm.humidity_min} onChange={(e) => setZoneForm({ ...zoneForm, humidity_min: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Humidity Max (%)</label>
                    <input type="number" step="0.01" value={zoneForm.humidity_max} onChange={(e) => setZoneForm({ ...zoneForm, humidity_max: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={zoneForm.is_active} onChange={(e) => setZoneForm({ ...zoneForm, is_active: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                <div className="flex gap-4 mt-4">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors">{editingZone ? 'Update Zone' : 'Create Zone'}</button>
                  <button type="button" onClick={() => { setShowZoneModal(false); resetZoneForm(); }} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-semibold transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Location Modal */}
        {showLocationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">{editingLocation ? 'Edit Location' : 'Add New Location'}</h2>
              </div>
              <form onSubmit={handleLocationSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input type="text" value={locationForm.code} onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. A-01-01" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone (optional)</label>
                  <select value={locationForm.zone_id} onChange={(e) => setLocationForm({ ...locationForm, zone_id: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">— No zone —</option>
                    {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aisle</label>
                    <input type="text" value={locationForm.aisle} onChange={(e) => setLocationForm({ ...locationForm, aisle: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="A" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rack</label>
                    <input type="text" value={locationForm.rack} onChange={(e) => setLocationForm({ ...locationForm, rack: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="01" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shelf</label>
                    <input type="text" value={locationForm.shelf} onChange={(e) => setLocationForm({ ...locationForm, shelf: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="01" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bin</label>
                    <input type="text" value={locationForm.bin} onChange={(e) => setLocationForm({ ...locationForm, bin: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="01" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Type</label>
                  <select value={locationForm.location_type} onChange={(e) => setLocationForm({ ...locationForm, location_type: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    {LOCATION_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode (optional)</label>
                  <input type="text" value={locationForm.barcode} onChange={(e) => setLocationForm({ ...locationForm, barcode: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. LOC-A-01-01" />
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={locationForm.is_active} onChange={(e) => setLocationForm({ ...locationForm, is_active: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                <div className="flex gap-4 mt-4">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors">{editingLocation ? 'Update Location' : 'Create Location'}</button>
                  <button type="button" onClick={() => { setShowLocationModal(false); resetLocationForm(); }} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-semibold transition-colors">Cancel</button>
                </div>
              </form>
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
