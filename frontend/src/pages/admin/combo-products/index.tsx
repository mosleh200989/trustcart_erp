import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import Modal from '@/components/admin/Modal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import FormInput from '@/components/admin/FormInput';
import ImageUpload from '@/components/admin/ImageUpload';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaTimes, FaEye } from 'react-icons/fa';
import apiClient from '@/services/api';

interface Combo {
  id: number;
  name: string;
  description?: string;
  discount_percentage?: number;
  combo_price?: number;
  status: string;
  image_url?: string;
  display_position?: number;
  expires_at?: string;
  images?: ComboImage[];
  products?: Product[];
}

interface ComboImage {
  id?: number;
  image_url: string;
  display_order?: number;
  is_primary?: boolean;
}

interface SizeVariant {
  name: string;
  price: number;
  stock?: number;
  sku_suffix?: string;
}

interface Product {
  id: number;
  name_en: string;
  name_bn?: string;
  base_price: number;
  sale_price?: number;
  image_url?: string;
  size_variants?: SizeVariant[] | string | null;
  variant_name?: string | null;
  variant_price?: number | string | null;
  quantity?: number;
  display_order?: number;
}

export default function ComboProductsAdmin() {
  const toast = useToast();
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
    combo_price: '',
    status: 'active',
    image_url: '',
    display_position: '',
    expires_at: ''
  });

  // For product search and adding to combo
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [comboProducts, setComboProducts] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [comboImages, setComboImages] = useState<string[]>([]);
  
  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [comboToDelete, setComboToDelete] = useState<Combo | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCombos();
  }, []);

  const loadCombos = async () => {
    try {
      // Use includeInactive=true to show all combos in admin (including inactive)
      const response = await apiClient.get('/combos?includeInactive=true');
      setCombos(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load combos:', error);
      setCombos([]);
    } finally {
      setLoading(false);
    }
  };

  const getProductVariants = (product: Product): SizeVariant[] => {
    let raw = product.size_variants;
    if (!raw) return [];
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(raw)) return [];
    return raw.filter((variant: any) =>
      variant &&
      typeof variant.name === 'string' &&
      variant.name.trim().length > 0 &&
      variant.price !== undefined &&
      Number(variant.price) > 0
    );
  };

  const getComboProductKey = (product: Product) => `${product.id}-${product.variant_name || ''}`;

  const getComboProductPrice = (product: Product) => {
    return Number(product.variant_price || product.sale_price || product.base_price || 0);
  };

  const handleAdd = () => {
    setModalMode('add');
    setFormData({
      name: '',
      description: '',
      discount_percentage: '',
      combo_price: '',
      status: 'active',
      image_url: '',
      display_position: '',
      expires_at: ''
    });
    setComboProducts([]);
    setComboImages([]);
    setExpandedProductId(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (combo: Combo) => {
    setModalMode('edit');
    setSelectedCombo(combo);
    setFormData({
      name: combo.name,
      description: combo.description || '',
      discount_percentage: combo.discount_percentage?.toString() || '',
      combo_price: combo.combo_price?.toString() || '',
      status: combo.status || 'active',
      image_url: combo.image_url || '',
      display_position: combo.display_position?.toString() || '',
      expires_at: combo.expires_at ? combo.expires_at.slice(0, 10) : ''
    });
    setComboImages(
      Array.isArray(combo.images) && combo.images.length > 0
        ? combo.images.map((image) => image.image_url).filter(Boolean)
        : (combo.image_url ? [combo.image_url] : [])
    );

    // Load combo products - products are already in the combo object from findAll
    if (combo.products && Array.isArray(combo.products)) {
      setComboProducts(combo.products);
    } else {
      setComboProducts([]);
    }
    setExpandedProductId(null);

    setIsModalOpen(true);
  };

  const handleView = (combo: Combo) => {
    setViewCombo(combo);
    setIsViewModalOpen(true);
  };

  const handleDelete = (combo: Combo) => {
    setComboToDelete(combo);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!comboToDelete) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/combos/${comboToDelete.id}`);
      setCombos(combos.filter(c => c.id !== comboToDelete.id));
      toast.success('Combo deleted successfully');
      setShowDeleteModal(false);
      setComboToDelete(null);
    } catch (error) {
      toast.error('Failed to delete combo');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.warning('Combo name is required');
      return;
    }

    if (comboProducts.length === 0) {
      toast.warning('Please add at least one product to the combo');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || null,
      discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
      combo_price: formData.combo_price ? parseFloat(formData.combo_price) : null,
      status: formData.status,
      image_url: formData.image_url || comboImages[0] || null,
      image_urls: comboImages.length > 0 ? comboImages : (formData.image_url ? [formData.image_url] : []),
      display_position: formData.display_position ? parseInt(formData.display_position) : null,
      expires_at: formData.expires_at || null,
      product_ids: comboProducts.map(p => p.id),
      product_items: comboProducts.map((product, index) => ({
        product_id: product.id,
        variant_name: product.variant_name || null,
        variant_price: product.variant_price ? Number(product.variant_price) : null,
        quantity: product.quantity || 1,
        display_order: index,
      }))
    };

    console.log('Submitting combo with payload:', payload);
    console.log('Combo products:', comboProducts);
    console.log('Product IDs:', payload.product_ids);

    try {
      if (modalMode === 'add') {
        console.log('Creating new combo...');
        const response = await apiClient.post('/combos', payload);
        console.log('Create response:', response.data);
        toast.success('Combo created successfully');
      } else if (modalMode === 'edit' && selectedCombo) {
        console.log('Updating combo:', selectedCombo.id);
        const response = await apiClient.put(`/combos/${selectedCombo.id}`, payload);
        console.log('Update response:', response.data);
        toast.success('Combo updated successfully');
      }
      setIsModalOpen(false);
      loadCombos();
    } catch (error: any) {
      console.error('Submit error:', error);
      console.error('Error response:', error.response);
      const errorMsg = error.response?.data?.message || error.message || 'Operation failed';
      toast.error(`Error: ${errorMsg}`);
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
      const response = await apiClient.get(`/products/admin/search?q=${encodeURIComponent(query)}`);
      const products = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setSearchResults(products.slice(0, 10));
      setShowSearchResults(true);
    } catch (error) {
      console.error('Failed to search products:', error);
      setSearchResults([]);
    }
  };

  const addProductToCombo = (product: Product, variant?: SizeVariant) => {
    const selectedProduct: Product = {
      ...product,
      variant_name: variant?.name || null,
      variant_price: variant ? Number(variant.price) : null,
      quantity: product.quantity || 1,
      display_order: comboProducts.length,
    };
    const selectedKey = getComboProductKey(selectedProduct);
    if (!comboProducts.find(p => getComboProductKey(p) === selectedKey)) {
      setComboProducts([...comboProducts, selectedProduct]);
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setExpandedProductId(null);
  };

  const removeProductFromCombo = (productId: number, variantName?: string | null) => {
    setComboProducts(comboProducts.filter(p => !(p.id === productId && (p.variant_name || '') === (variantName || ''))));
  };

  const updateComboProductQuantity = (productId: number, variantName: string | null | undefined, quantity: number) => {
    if (quantity < 1) return;
    setComboProducts(comboProducts.map(product =>
      product.id === productId && (product.variant_name || '') === (variantName || '')
        ? { ...product, quantity }
        : product
    ));
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
                label="Combo Price"
                name="combo_price"
                type="number"
                value={formData.combo_price}
                onChange={handleInputChange}
                placeholder="Optional fixed price"
              />
              
              <FormInput
                label="Display Position"
                name="display_position"
                type="number"
                value={formData.display_position}
                onChange={handleInputChange}
                placeholder="1, 2, 3..."
              />

              <FormInput
                label="Expires At"
                name="expires_at"
                type="date"
                value={formData.expires_at}
                onChange={handleInputChange}
              />
            </div>

            <ImageUpload
              label="Primary Combo Image"
              value={formData.image_url}
              onChange={(url) => {
                setFormData({ ...formData, image_url: url });
                if (url && !comboImages.includes(url)) {
                  setComboImages([url, ...comboImages]);
                }
              }}
              folder="trustcart/combos"
            />

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Additional Combo Images
                </label>
                <span className="text-xs text-gray-500">
                  {comboImages.length} image(s)
                </span>
              </div>

              {comboImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {comboImages.map((imgUrl, index) => (
                    <div key={`${imgUrl}-${index}`} className="relative group">
                      <img
                        src={imgUrl}
                        alt={`Combo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const nextImages = comboImages.filter((_, i) => i !== index);
                          setComboImages(nextImages);
                          if (formData.image_url === imgUrl) {
                            setFormData({ ...formData, image_url: nextImages[0] || '' });
                          }
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextImages = [imgUrl, ...comboImages.filter((_, i) => i !== index)];
                            setComboImages(nextImages);
                            setFormData({ ...formData, image_url: imgUrl });
                          }}
                          className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Primary
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <ImageUpload
                value=""
                onChange={(url) => {
                  if (url && !comboImages.includes(url)) {
                    const nextImages = [...comboImages, url];
                    setComboImages(nextImages);
                    if (!formData.image_url) {
                      setFormData({ ...formData, image_url: url });
                    }
                  }
                }}
                label="Add Image"
                folder="trustcart/combos"
              />
            </div>

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
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {searchResults.map((product) => {
                      const variants = getProductVariants(product);
                      const isExpanded = expandedProductId === product.id;
                      const salePrice = Number(product.sale_price || product.base_price || 0);

                      return (
                        <div key={product.id} className="border-b last:border-b-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (variants.length > 0) {
                                setExpandedProductId(isExpanded ? null : product.id);
                              } else {
                                addProductToCombo(product);
                              }
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-left"
                          >
                            {product.image_url && (
                              <img src={product.image_url} alt={product.name_en} className="w-10 h-10 object-cover rounded" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                                {variants.length > 0 && (
                                  <span className={`text-xs transition-transform inline-block ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                )}
                                {product.name_en}
                              </p>
                              {product.name_bn && <p className="text-xs text-gray-500 truncate">{product.name_bn}</p>}
                              {variants.length > 0 ? (
                                <p className="text-xs text-blue-500">{variants.length} variant{variants.length > 1 ? 's' : ''} available</p>
                              ) : (
                                <p className="text-xs text-gray-500">৳{salePrice.toFixed(2)}</p>
                              )}
                            </div>
                          </button>

                          {variants.length > 0 && isExpanded && (
                            <div className="bg-gray-50 border-t">
                              {variants.map((variant, index) => (
                                <button
                                  key={`${variant.name}-${index}`}
                                  type="button"
                                  onClick={() => addProductToCombo(product, variant)}
                                  className="w-full text-left pl-10 pr-4 py-2 hover:bg-blue-100 flex items-center gap-3 transition-colors border-b last:border-b-0 border-gray-100"
                                >
                                  <span className="text-gray-400 text-xs">├─</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-gray-800">{variant.name}</div>
                                    {variant.sku_suffix && <div className="text-xs text-gray-400">SKU: {variant.sku_suffix}</div>}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-sm font-semibold text-green-600">৳{Number(variant.price).toFixed(2)}</div>
                                    {variant.stock !== undefined && variant.stock !== null && (
                                      <div className="text-xs text-gray-400">Stock: {variant.stock}</div>
                                    )}
                                  </div>
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => addProductToCombo(product)}
                                className="w-full text-left pl-10 pr-4 py-2 hover:bg-yellow-50 flex items-center gap-3 transition-colors border-t border-gray-200"
                              >
                                <span className="text-gray-400 text-xs">└─</span>
                                <div className="flex-1 text-sm text-gray-500 italic">Base product (no variant)</div>
                                <div className="text-sm font-semibold text-blue-600">৳{salePrice.toFixed(2)}</div>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comboProducts.map((product) => (
                        <tr key={getComboProductKey(product)}>
                          <td className="px-4 py-2 text-sm text-gray-900 flex items-center gap-2">
                            {product.image_url && (
                              <img src={product.image_url} alt={product.name_en} className="w-8 h-8 object-cover rounded" />
                            )}
                            {product.name_en}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {product.variant_name || <span className="text-gray-400">Base product</span>}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={product.quantity || 1}
                              onChange={(e) => updateComboProductQuantity(product.id, product.variant_name, parseInt(e.target.value) || 1)}
                              className="w-16 text-center border rounded px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">৳{getComboProductPrice(product).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeProductFromCombo(product.id, product.variant_name)}
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

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setComboToDelete(null);
          }}
          onConfirm={confirmDelete}
          type="delete"
          title="Delete Combo?"
          message={
            <>
              <p className="text-gray-600 mb-2">You are about to delete:</p>
              <p className="text-lg font-semibold text-gray-800">
                "{comboToDelete?.name}"
              </p>
            </>
          }
          subMessage={
            comboToDelete?.products && comboToDelete.products.length > 0
              ? `This combo contains ${comboToDelete.products.length} product(s)`
              : undefined
          }
          warningMessage="This action cannot be undone. The combo will be permanently removed."
          confirmText="Yes, Delete"
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
}
