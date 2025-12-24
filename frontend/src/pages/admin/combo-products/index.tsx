import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaTimes, FaEye } from 'react-icons/fa';
import apiClient from '@/services/api';

interface Combo {
  id: number;
  name: string;
  description?: string;
  discount_percentage?: number;
  status: string;
  image_url?: string;
  display_position?: number;
  products?: Product[];
}

interface Product {
  id: number;
  name_en: string;
  base_price: number;
  image_url?: string;
}

export default function ComboProductsAdmin() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [viewCombo, setViewCombo] = useState<Combo | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_percentage: '',
    status: 'active',
    image_url: '',
    display_position: ''
  });

  // For product search and adding to combo
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [comboProducts, setComboProducts] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    loadCombos();
  }, []);

  const loadCombos = async () => {
    try {
      const response = await apiClient.get('/combos');
      setCombos(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load combos:', error);
      setCombos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setModalMode('add');
    setFormData({
      name: '',
      description: '',
      discount_percentage: '',
      status: 'active',
      image_url: '',
      display_position: ''
    });
    setComboProducts([]);
    setIsModalOpen(true);
  };

  const handleEdit = async (combo: Combo) => {
    setModalMode('edit');
    setSelectedCombo(combo);
    setFormData({
      name: combo.name,
      description: combo.description || '',
      discount_percentage: combo.discount_percentage?.toString() || '',
      status: combo.status || 'active',
      image_url: combo.image_url || '',
      display_position: combo.display_position?.toString() || ''
    });

    // Load combo products - products are already in the combo object from findAll
    if (combo.products && Array.isArray(combo.products)) {
      setComboProducts(combo.products);
    } else {
      setComboProducts([]);
    }

    setIsModalOpen(true);
  };

  const handleView = (combo: Combo) => {
    setViewCombo(combo);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (combo: Combo) => {
    if (!confirm(`Are you sure you want to delete "${combo.name}"?`)) return;

    try {
      await apiClient.delete(`/combos/${combo.id}`);
      setCombos(combos.filter(c => c.id !== combo.id));
      alert('Combo deleted successfully');
    } catch (error) {
      alert('Failed to delete combo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert('Combo name is required');
      return;
    }

    if (comboProducts.length === 0) {
      alert('Please add at least one product to the combo');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || null,
      discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
      status: formData.status,
      image_url: formData.image_url || null,
      display_position: formData.display_position ? parseInt(formData.display_position) : null,
      product_ids: comboProducts.map(p => p.id)
    };

    console.log('Submitting combo with payload:', payload);
    console.log('Combo products:', comboProducts);
    console.log('Product IDs:', payload.product_ids);

    try {
      if (modalMode === 'add') {
        console.log('Creating new combo...');
        const response = await apiClient.post('/combos', payload);
        console.log('Create response:', response.data);
        alert('Combo created successfully');
      } else if (modalMode === 'edit' && selectedCombo) {
        console.log('Updating combo:', selectedCombo.id);
        const response = await apiClient.put(`/combos/${selectedCombo.id}`, payload);
        console.log('Update response:', response.data);
        alert('Combo updated successfully');
      }
      setIsModalOpen(false);
      loadCombos();
    } catch (error: any) {
      console.error('Submit error:', error);
      console.error('Error response:', error.response);
      const errorMsg = error.response?.data?.message || error.message || 'Operation failed';
      alert(`Error: ${errorMsg}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const searchProducts = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await apiClient.get(`/products?search=${query}`);
      setSearchResults(Array.isArray(response.data) ? response.data.slice(0, 10) : []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Failed to search products:', error);
      setSearchResults([]);
    }
  };

  const addProductToCombo = (product: Product) => {
    if (!comboProducts.find(p => p.id === product.id)) {
      setComboProducts([...comboProducts, product]);
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const removeProductFromCombo = (productId: number) => {
    setComboProducts(comboProducts.filter(p => p.id !== productId));
  };

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Combo Products</h1>
            <p className="text-gray-600 mt-1">Manage product combos and bundles</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
          >
            <FaPlus />
            Add New Combo
          </button>
        </div>

        {/* Combos Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading combos...</div>
          ) : combos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No combos found. Create your first combo!</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {combos.map((combo) => (
                  <tr key={combo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{combo.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {combo.image_url ? (
                        <img src={combo.image_url} alt={combo.name} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                          No img
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{combo.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{combo.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{combo.discount_percentage || 0}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{combo.display_position || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        combo.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {combo.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleView(combo)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="View"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleEdit(combo)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(combo)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'add' ? 'Add New Combo' : 'Edit Combo'}
          size="xl"
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
                form="combo-form"
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
              >
                {modalMode === 'add' ? 'Create' : 'Update'}
              </button>
            </>
          }
        >
          <form id="combo-form" onSubmit={handleSubmit} className="space-y-6">
            <FormInput
              label="Combo Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            
            <FormInput
              label="Description"
              name="description"
              type="textarea"
              value={formData.description}
              onChange={handleInputChange}
              rows={2}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Discount Percentage"
                name="discount_percentage"
                type="number"
                value={formData.discount_percentage}
                onChange={handleInputChange}
                placeholder="10"
              />
              
              <FormInput
                label="Display Position"
                name="display_position"
                type="number"
                value={formData.display_position}
                onChange={handleInputChange}
                placeholder="1, 2, 3..."
              />
            </div>

            <FormInput
              label="Image URL"
              name="image_url"
              value={formData.image_url}
              onChange={handleInputChange}
              placeholder="https://example.com/combo-image.jpg"
            />

            <FormInput
              label="Status"
              name="status"
              type="select"
              value={formData.status}
              onChange={handleInputChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />

            {/* Product Search and Add */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Products to Combo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="flex items-center border rounded-lg">
                  <FaSearch className="ml-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchProducts(e.target.value);
                    }}
                    placeholder="Search products by name..."
                    className="flex-1 px-3 py-2 outline-none rounded-lg"
                  />
                </div>
                
                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProductToCombo(product)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-left"
                      >
                        {product.image_url && (
                          <img src={product.image_url} alt={product.name_en} className="w-10 h-10 object-cover rounded" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{product.name_en}</p>
                          <p className="text-xs text-gray-500">৳{product.base_price}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Products Table */}
            {comboProducts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Products in Combo ({comboProducts.length})
                </label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comboProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="px-4 py-2 text-sm text-gray-900 flex items-center gap-2">
                            {product.image_url && (
                              <img src={product.image_url} alt={product.name_en} className="w-8 h-8 object-cover rounded" />
                            )}
                            {product.name_en}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">৳{product.base_price}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeProductFromCombo(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FaTimes />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </form>
        </Modal>

        {/* View Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="View Combo Details"
          size="lg"
          footer={
            <button
              type="button"
              onClick={() => setIsViewModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          }
        >
          {viewCombo && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Combo Name</label>
                <p className="mt-1 text-gray-900 text-lg font-semibold">{viewCombo.name}</p>
              </div>
              
              {viewCombo.image_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Combo Image</label>
                  <img src={viewCombo.image_url} alt={viewCombo.name} className="w-40 h-40 object-cover rounded-lg shadow" />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-gray-900">{viewCombo.description || 'No description'}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount Percentage</label>
                  <p className="mt-1 text-gray-900 text-lg font-semibold">{viewCombo.discount_percentage || 0}%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Display Position</label>
                  <p className="mt-1 text-gray-900 text-lg font-semibold">{viewCombo.display_position || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      viewCombo.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {viewCombo.status}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Products in Combo</label>
                {viewCombo.products && viewCombo.products.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {viewCombo.products.map((product) => (
                          <tr key={product.id}>
                            <td className="px-4 py-3">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name_en} className="w-12 h-12 object-cover rounded" />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                                  No img
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name_en}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">৳{product.base_price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No products in this combo</p>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
