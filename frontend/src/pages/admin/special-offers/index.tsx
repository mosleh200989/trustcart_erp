import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
import ImageUpload from '@/components/admin/ImageUpload';
import { FaPlus, FaSearch } from 'react-icons/fa';
import apiClient from '@/services/api';

interface SpecialOffer {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  features?: string[];
  primary_button_text?: string;
  primary_button_link?: string;
  secondary_button_text?: string;
  secondary_button_link?: string;
  image_url?: string;
  background_gradient?: string;
  is_active: boolean;
  display_order: number;
}

export default function AdminSpecialOffers() {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedOffer, setSelectedOffer] = useState<SpecialOffer | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    features: [''],
    primary_button_text: '',
    primary_button_link: '',
    secondary_button_text: '',
    secondary_button_link: '',
    image_url: '',
    background_gradient: 'from-orange-50 via-white to-orange-50',
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const response = await apiClient.get('/special-offers');
      setOffers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load special offers:', error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setModalMode('add');
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      features: [''],
      primary_button_text: '',
      primary_button_link: '',
      secondary_button_text: '',
      secondary_button_link: '',
      image_url: '',
      background_gradient: 'from-orange-50 via-white to-orange-50',
      is_active: true,
      display_order: 0
    });
    setIsModalOpen(true);
  };

  const handleEdit = async (offer: SpecialOffer) => {
    setModalMode('edit');
    setSelectedOffer(offer);
    setFormData({
      title: offer.title,
      subtitle: offer.subtitle || '',
      description: offer.description || '',
      features: offer.features || [''],
      primary_button_text: offer.primary_button_text || '',
      primary_button_link: offer.primary_button_link || '',
      secondary_button_text: offer.secondary_button_text || '',
      secondary_button_link: offer.secondary_button_link || '',
      image_url: offer.image_url || '',
      background_gradient: offer.background_gradient || 'from-orange-50 via-white to-orange-50',
      is_active: offer.is_active,
      display_order: offer.display_order || 0
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (offer: SpecialOffer) => {
    if (!confirm(`Are you sure you want to delete "${offer.title}"?`)) return;

    try {
      await apiClient.delete(`/special-offers/${offer.id}`);
      setOffers(offers.filter(o => o.id !== offer.id));
      alert('Special offer deleted successfully');
    } catch (error) {
      alert('Failed to delete special offer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      features: formData.features.filter(f => f.trim() !== '')
    };

    try {
      if (modalMode === 'add') {
        await apiClient.post('/special-offers', payload);
        alert('Special offer added successfully');
      } else if (modalMode === 'edit' && selectedOffer) {
        await apiClient.put(`/special-offers/${selectedOffer.id}`, payload);
        alert('Special offer updated successfully');
      }
      setIsModalOpen(false);
      loadOffers();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const filteredOffers = offers.filter(o =>
    o.title?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'subtitle', label: 'Subtitle' },
    { 
      key: 'is_active', 
      label: 'Status',
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { key: 'display_order', label: 'Order' }
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Special Offers</h1>
            <p className="text-gray-600 mt-1">Manage homepage special offer sections</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
          >
            <FaPlus />
            Add Special Offer
          </button>
        </div>

        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search special offers..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredOffers}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'add' ? 'Add Special Offer' : 'Edit Special Offer'}
          size="lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="offer-form"
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
              >
                {modalMode === 'add' ? 'Create' : 'Update'}
              </button>
            </>
          }
        >
          <form id="offer-form" onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="e.g., Need Bulk Orders?"
            />

            <FormInput
              label="Subtitle"
              name="subtitle"
              value={formData.subtitle}
              onChange={handleInputChange}
              placeholder="e.g., ✨ SPECIAL OFFER"
            />

            <FormInput
              label="Description"
              name="description"
              type="textarea"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features
              </label>
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder="Feature text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addFeature}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Add Feature
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Primary Button Text"
                name="primary_button_text"
                value={formData.primary_button_text}
                onChange={handleInputChange}
                placeholder="e.g., Request Quote"
              />
              <FormInput
                label="Primary Button Link"
                name="primary_button_link"
                value={formData.primary_button_link}
                onChange={handleInputChange}
                placeholder="/contact"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Secondary Button Text"
                name="secondary_button_text"
                value={formData.secondary_button_text}
                onChange={handleInputChange}
                placeholder="e.g., Call Us"
              />
              <FormInput
                label="Secondary Button Link"
                name="secondary_button_link"
                value={formData.secondary_button_link}
                onChange={handleInputChange}
                placeholder="tel:+8801234567890"
              />
            </div>

            <ImageUpload
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              label="Image (Optional)"
              folder="trustcart/special-offers"
            />

            <FormInput
              label="Background Gradient"
              name="background_gradient"
              value={formData.background_gradient}
              onChange={handleInputChange}
              placeholder="from-orange-50 via-white to-orange-50"
            />

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Display Order"
                name="display_order"
                type="number"
                value={formData.display_order.toString()}
                onChange={handleInputChange}
              />
              <div className="flex items-center gap-2 mt-7">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
