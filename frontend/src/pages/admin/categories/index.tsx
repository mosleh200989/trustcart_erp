import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import ImageUpload from '@/components/admin/ImageUpload';
import DataTable from '@/components/admin/DataTable';
import { FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaEye, FaEyeSlash } from 'react-icons/fa';
import apiClient from '@/services/api';

interface Category {
  id: number;
  name_en: string;
  name_bn: string;
  slug: string;
  description: string;
  image_url: string;
  parent_id: number | null;
  display_order: number;
  is_active: boolean;
  product_count?: number;
}

export default function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Array<number | string>>([]);
  const [bulkWorking, setBulkWorking] = useState(false);

  const [formData, setFormData] = useState({
    name_en: '',
    name_bn: '',
    slug: '',
    description: '',
    image_url: '',
    parent_id: '',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
      };

      if (editingCategory) {
        await apiClient.put(`/categories/${editingCategory.id}`, submitData);
      } else {
        await apiClient.post('/categories', submitData);
      }
      setShowModal(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('Failed to save category');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name_en: category.name_en,
      name_bn: category.name_bn || '',
      slug: category.slug,
      description: category.description || '',
      image_url: category.image_url || '',
      parent_id: category.parent_id ? category.parent_id.toString() : '',
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await apiClient.delete(`/categories/${id}`);
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  };

  const handleToggleVisibility = async (category: Category) => {
    const newStatus = !category.is_active;
    try {
      await apiClient.put(`/categories/${category.id}`, { is_active: newStatus });
      setCategories(categories.map(c => 
        c.id === category.id ? { ...c, is_active: newStatus } : c
      ));
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      alert('Failed to update category visibility');
    }
  };
  const clearSelection = () => setSelectedCategoryIds([]);

  const handleBulkApply = async (bulkAction: 'delete' | 'activate' | 'deactivate') => {
    if (selectedCategoryIds.length === 0) {
      alert('Please select at least one category');
      return;
    }

    const actionLabel = bulkAction === 'delete' ? 'delete' : bulkAction === 'activate' ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionLabel} ${selectedCategoryIds.length} selected category(s)?`)) return;

    setBulkWorking(true);
    try {
      const results = await Promise.allSettled(
        selectedCategoryIds.map((id) => {
          const categoryId = Number(id);
          if (bulkAction === 'delete') return apiClient.delete(`/categories/${categoryId}`);
          if (bulkAction === 'activate') return apiClient.put(`/categories/${categoryId}`, { is_active: true });
          return apiClient.put(`/categories/${categoryId}`, { is_active: false });
        }),
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      await loadCategories();
      clearSelection();

      if (failed > 0) {
        alert(`Bulk action completed: ${succeeded} succeeded, ${failed} failed.`);
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('Bulk action failed');
    } finally {
      setBulkWorking(false);
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name_en: '',
      name_bn: '',
      slug: '',
      description: '',
      image_url: '',
      parent_id: '',
      display_order: 0,
      is_active: true,
    });
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Categories Management</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <FaPlus /> Add Category
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            {categories.length > 0 && (
              <div className="mb-4 bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => handleBulkApply('activate')}
                    disabled={selectedCategoryIds.length === 0 || bulkWorking}
                    className={`px-4 py-2 rounded-lg text-sm text-white ${
                      selectedCategoryIds.length === 0 || bulkWorking
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {bulkWorking ? 'Working…' : 'Set Active'}
                  </button>

                  <button
                    onClick={() => handleBulkApply('deactivate')}
                    disabled={selectedCategoryIds.length === 0 || bulkWorking}
                    className={`px-4 py-2 rounded-lg text-sm text-white ${
                      selectedCategoryIds.length === 0 || bulkWorking
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {bulkWorking ? 'Working…' : 'Set Inactive'}
                  </button>

                  <button
                    onClick={() => handleBulkApply('delete')}
                    disabled={selectedCategoryIds.length === 0 || bulkWorking}
                    className={`px-4 py-2 rounded-lg text-sm text-white ${
                      selectedCategoryIds.length === 0 || bulkWorking
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {bulkWorking ? 'Working…' : 'Delete'}
                  </button>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span>
                    Selected <span className="font-semibold">{selectedCategoryIds.length}</span>
                  </span>
                  <button
                    onClick={clearSelection}
                    disabled={selectedCategoryIds.length === 0 || bulkWorking}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      selectedCategoryIds.length === 0 || bulkWorking
                        ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <DataTable
              columns={[
                {
                  key: 'image_url',
                  label: 'Image',
                  render: (value: any, row: Category) =>
                    value ? (
                      <img src={String(value)} alt={row.name_en} className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    ),
                },
                { key: 'name_en', label: 'Name (EN)' },
                {
                  key: 'name_bn',
                  label: 'Name (BN)',
                  render: (value: any) => <span className="text-gray-700">{value || '-'}</span>,
                },
                { key: 'slug', label: 'Slug' },
                {
                  key: 'product_count',
                  label: 'Products',
                  render: (value: any) => (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {value || 0}
                    </span>
                  ),
                },
                { key: 'display_order', label: 'Order' },
                {
                  key: 'is_active',
                  label: 'Status',
                  render: (value: any) =>
                    value ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Inactive</span>
                    ),
                },
                {
                  key: 'visibility',
                  label: 'Visible',
                  render: (_value: any, row: Category) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVisibility(row);
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        row.is_active
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title={row.is_active ? 'Click to hide from customers' : 'Click to show to customers'}
                    >
                      {row.is_active ? <FaEye size={18} /> : <FaEyeSlash size={18} />}
                    </button>
                  )
                },
              ]}
              data={categories}
              loading={loading}
              selection={{
                selectedRowIds: selectedCategoryIds,
                onChange: (next) => setSelectedCategoryIds(next),
                getRowId: (row) => row.id,
              }}
              onEdit={handleEdit}
              onDelete={(row) => handleDelete(row.id)}
            />
          </>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name (English) *
                    </label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => {
                        setFormData({ ...formData, name_en: e.target.value });
                        if (!editingCategory) {
                          setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                        }
                      }}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name (Bengali)
                    </label>
                    <input
                      type="text"
                      value={formData.name_bn}
                      onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div>
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
                    <ImageUpload
                      value={formData.image_url}
                      onChange={(url) => setFormData({ ...formData, image_url: url })}
                      label="Category Image"
                      folder="trustcart/categories"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                        Parent Category
                      </label>
                      <select
                        value={formData.parent_id}
                        onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">None (Top Level)</option>
                        {categories
                          .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name_en}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
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

                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-semibold transition-colors"
                  >
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
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
