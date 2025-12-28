import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaArrowUp, FaArrowDown, FaImage } from 'react-icons/fa';
import apiClient from '@/services/api';

interface Banner {
  id: number;
  uuid: string;
  title: string;
  subtitle: string;
  description: string;
  button_text: string;
  button_link: string;
  image_url: string;
  background_color: string;
  text_color: string;
  display_order: number;
  is_active: boolean;
  banner_type: 'carousel' | 'side' | 'promotional';
  start_date: string | null;
  end_date: string | null;
}

export default function BannersManagement() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    button_text: '',
    button_link: '',
    image_url: '',
    background_color: '#FF6B35',
    text_color: '#FFFFFF',
    display_order: 0,
    is_active: true,
    banner_type: 'carousel' as 'carousel' | 'side' | 'promotional',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const response = await apiClient.get('/banners');
      setBanners(response.data);
    } catch (error) {
      console.error('Failed to load banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert empty date strings to null for PostgreSQL
      const submitData = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      if (editingBanner) {
        await apiClient.put(`/banners/${editingBanner.id}`, submitData);
      } else {
        await apiClient.post('/banners', submitData);
      }
      setShowModal(false);
      resetForm();
      loadBanners();
    } catch (error) {
      console.error('Failed to save banner:', error);
      alert('Failed to save banner');
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      button_text: banner.button_text || '',
      button_link: banner.button_link || '',
      image_url: banner.image_url,
      background_color: banner.background_color || '#FF6B35',
      text_color: banner.text_color || '#FFFFFF',
      display_order: banner.display_order,
      is_active: banner.is_active,
      banner_type: banner.banner_type,
      start_date: banner.start_date ? banner.start_date.split('T')[0] : '',
      end_date: banner.end_date ? banner.end_date.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    
    try {
      await apiClient.delete(`/banners/${id}`);
      loadBanners();
    } catch (error) {
      console.error('Failed to delete banner:', error);
      alert('Failed to delete banner');
    }
  };

  const toggleActive = async (id: number) => {
    try {
      await apiClient.put(`/banners/${id}/toggle`);
      loadBanners();
    } catch (error) {
      console.error('Failed to toggle banner:', error);
    }
  };

  const moveUp = async (banner: Banner) => {
    const currentIndex = filteredBanners.findIndex(b => b.id === banner.id);
    if (currentIndex > 0) {
      const prevBanner = filteredBanners[currentIndex - 1];
      await apiClient.put('/banners/reorder/bulk', [
        { id: banner.id, display_order: prevBanner.display_order },
        { id: prevBanner.id, display_order: banner.display_order }
      ]);
      loadBanners();
    }
  };

  const moveDown = async (banner: Banner) => {
    const currentIndex = filteredBanners.findIndex(b => b.id === banner.id);
    if (currentIndex < filteredBanners.length - 1) {
      const nextBanner = filteredBanners[currentIndex + 1];
      await apiClient.put('/banners/reorder/bulk', [
        { id: banner.id, display_order: nextBanner.display_order },
        { id: nextBanner.id, display_order: banner.display_order }
      ]);
      loadBanners();
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      button_text: '',
      button_link: '',
      image_url: '',
      background_color: '#FF6B35',
      text_color: '#FFFFFF',
      display_order: 0,
      is_active: true,
      banner_type: 'carousel',
      start_date: '',
      end_date: '',
    });
  };

  const filteredBanners = filterType === 'all' 
    ? banners 
    : banners.filter(b => b.banner_type === filterType);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Banner Management</h1>
            <p className="text-gray-600 mt-2">Manage homepage carousels and side banners</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <FaPlus /> Add New Banner
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          {['all', 'carousel', 'side', 'promotional'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg ${
                filterType === type
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} 
              {type !== 'all' && ` (${banners.filter(b => b.banner_type === type).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredBanners.map((banner, index) => (
              <div key={banner.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex">
                  {/* Banner Preview */}
                  <div className="w-1/3 relative">
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <FaImage className="text-gray-400 text-4xl" />
                      </div>
                    )}
                    <span className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold ${
                      banner.banner_type === 'carousel' ? 'bg-blue-500' :
                      banner.banner_type === 'side' ? 'bg-green-500' :
                      'bg-purple-500'
                    } text-white`}>
                      {banner.banner_type.toUpperCase()}
                    </span>
                  </div>

                  {/* Banner Details */}
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{banner.title}</h3>
                        {banner.subtitle && (
                          <p className="text-gray-600 mt-1">{banner.subtitle}</p>
                        )}
                        {banner.description && (
                          <p className="text-sm text-gray-500 mt-2">{banner.description}</p>
                        )}
                        <div className="flex gap-4 mt-4 text-sm">
                          {banner.button_text && (
                            <span className="text-gray-600">
                              <strong>Button:</strong> {banner.button_text}
                            </span>
                          )}
                          {banner.button_link && (
                            <span className="text-gray-600">
                              <strong>Link:</strong> {banner.button_link}
                            </span>
                          )}
                        </div>
                        {(banner.start_date || banner.end_date) && (
                          <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            {banner.start_date && (
                              <span>Start: {new Date(banner.start_date).toLocaleDateString()}</span>
                            )}
                            {banner.end_date && (
                              <span>End: {new Date(banner.end_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => moveUp(banner)}
                          disabled={index === 0}
                          className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                          title="Move Up"
                        >
                          <FaArrowUp />
                        </button>
                        <button
                          onClick={() => moveDown(banner)}
                          disabled={index === filteredBanners.length - 1}
                          className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                          title="Move Down"
                        >
                          <FaArrowDown />
                        </button>
                        <button
                          onClick={() => toggleActive(banner.id)}
                          className={`p-2 ${banner.is_active ? 'text-green-600' : 'text-gray-400'}`}
                          title={banner.is_active ? 'Active' : 'Inactive'}
                        >
                          {banner.is_active ? <FaToggleOn size={20} /> : <FaToggleOff size={20} />}
                        </button>
                        <button
                          onClick={() => handleEdit(banner)}
                          className="p-2 text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="p-2 text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredBanners.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg">
                <FaImage className="text-gray-300 text-6xl mx-auto mb-4" />
                <p className="text-gray-500">No banners found</p>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">
                  {editingBanner ? 'Edit Banner' : 'Add New Banner'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={formData.button_text}
                      onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Button Link
                    </label>
                    <input
                      type="text"
                      value={formData.button_link}
                      onChange={(e) => setFormData({ ...formData, button_link: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="/products"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image URL *
                    </label>
                    <input
                      type="text"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                      placeholder="https://example.com/image.jpg"
                    />
                    {formData.image_url && (
                      <img src={formData.image_url} alt="Preview" className="mt-2 max-h-32 rounded" />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Banner Type *
                    </label>
                    <select
                      value={formData.banner_type}
                      onChange={(e) => setFormData({ ...formData, banner_type: e.target.value as any })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="carousel">Carousel (Main)</option>
                      <option value="side">Side Banner</option>
                      <option value="promotional">Promotional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Background Color
                    </label>
                    <input
                      type="text"
                      value={formData.background_color}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="#FF6B35 or linear-gradient(...)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text Color
                    </label>
                    <input
                      type="text"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="#FFFFFF"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    {editingBanner ? 'Update' : 'Create'} Banner
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
