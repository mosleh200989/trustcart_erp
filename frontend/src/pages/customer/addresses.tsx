import { useState, useEffect } from 'react';
import CustomerLayout from '@/layouts/CustomerLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

interface Address {
  id: number;
  addressType: string;
  streetAddress: string;
  city: string;
  district: string;
  phone: string;
  isPrimary: boolean;
}

export default function CustomerAddressesPage() {
  const toast = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    addressType: 'home',
    streetAddress: '',
    city: '',
    district: '',
    phone: '',
    isPrimary: false,
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await apiClient.get('/customer-addresses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // console.log('=== Fetched addresses ===');
      // console.log('Response data:', JSON.stringify(response.data, null, 2));
      setAddresses(response.data);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      // console.log('=== handleSubmit START ===');
      // console.log('Editing ID:', editingId);
      // console.log('Editing ID type:', typeof editingId);
      // console.log('Form data:', JSON.stringify(formData, null, 2));
      
      if (editingId) {
        console.log('Updating address with ID:', editingId);
        await apiClient.put(`/customer-addresses/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        console.log('Creating new address');
        await apiClient.post('/customer-addresses', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchAddresses();
    } catch (error) {
      console.error('Failed to save address:', error);
      toast.error('Failed to save address');
    }
  };

  const handleEdit = (address: Address) => {
    // console.log('=== handleEdit called ===');
    // console.log('Full address object:', JSON.stringify(address, null, 2));
    // console.log('Address ID:', address.id);
    // console.log('Address ID type:', typeof address.id);
    
    setFormData({
      addressType: address.addressType,
      streetAddress: address.streetAddress,
      city: address.city || '',
      district: address.district || '',
      phone: address.phone || '',
      isPrimary: address.isPrimary,
    });
    
    console.log('Setting editingId to:', address.id);
    setEditingId(address.id);
    console.log('Opening form...');
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const token = localStorage.getItem('authToken');
      await apiClient.delete(`/customer-addresses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAddresses();
    } catch (error) {
      console.error('Failed to delete address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const token = localStorage.getItem('authToken');
      await apiClient.put(`/customer-addresses/${id}/set-default`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAddresses();
    } catch (error) {
      console.error('Failed to set default:', error);
      toast.error('Failed to set default address');
    }
  };

  const resetForm = () => {
    setFormData({
      addressType: 'home',
      streetAddress: '',
      district: '',
      city: '',
      phone: '',
      isPrimary: false,
    });
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="text-center py-8">Loading...</div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Addresses</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage your delivery addresses
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowForm(true);
            }}
            className="w-full sm:w-auto bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
          >
            + Add Address
          </button>
        </div>

        {/* Address Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Type
                </label>
                <select
                  value={formData.addressType}
                  onChange={(e) => setFormData({ ...formData, addressType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="home">Home</option>
                  <option value="office">Office</option>
                  <option value="others">Others</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">
                  Set as default address
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600"
                >
                  Save Address
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="w-full sm:w-auto bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Address List */}
        <div className="grid gap-4">
          {addresses.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              No addresses added yet. Click "Add Address" to create one.
            </div>
          ) : (
            addresses.map((address) => (
              <div
                key={address.id}
                className={`bg-white rounded-lg shadow-md p-6 ${
                  address.isPrimary ? 'border-2 border-orange-500' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg capitalize">
                        {address.addressType}
                      </h3>
                      {address.isPrimary && (
                        <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700">{address.streetAddress}</p>
                    {(address.district || address.city) && (
                      <p className="text-gray-600 text-sm mt-1">
                        {address.district && address.district}
                        {address.district && address.city && ', '}
                        {address.city && address.city}
                      </p>
                    )}
                    {address.phone && (
                      <p className="text-gray-600 text-sm mt-1">
                        Phone: {address.phone}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {!address.isPrimary && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        className="text-orange-600 hover:text-orange-700 text-sm"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(address)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
