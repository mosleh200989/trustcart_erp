import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
import ImageUpload from '@/components/admin/ImageUpload';
import MultipleImageUpload from '@/components/admin/MultipleImageUpload';
import { FaPlus, FaSearch } from 'react-icons/fa';
import apiClient from '@/services/api';

interface Product {
  id: number;
  name_en: string;
  name_bn: string;
  slug: string;
  sku?: string;
  base_price: number;
  category_name?: string;
  status: string;
  stock_quantity?: number;
}

export default function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    name_en: '',
    name_bn: '',
    slug: '',
    sku: '',
    base_price: '',
    category_id: '',
    stock_quantity: '',
    description_en: '',
    status: 'active',
    image_url: '',
    display_position: '',
    additional_info: ''
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/products/categories');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const handleAdd = () => {
    setModalMode('add');
    setFormData({
      name_en: '',
      name_bn: '',
      slug: '',
      sku: '',
      base_price: '',
      category_id: '',
      stock_quantity: '',
      description_en: '',
      status: 'active',
      image_url: '',
      display_position: '',
      additional_info: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = async (product: Product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    
    // Fetch full product details
    try {
      const response = await apiClient.get(`/products/${product.id}`);
      const fullProduct = response.data;
      
      console.log('Full product data:', fullProduct);
      console.log('Category ID from product:', fullProduct.category_id);
      
      setFormData({
        name_en: fullProduct.name_en || '',
        name_bn: fullProduct.name_bn || '',
        slug: fullProduct.slug || '',
        sku: fullProduct.sku || '',
        base_price: fullProduct.base_price?.toString() || '',
        category_id: fullProduct.category_id ? fullProduct.category_id.toString() : '',
        stock_quantity: fullProduct.stock_quantity ? fullProduct.stock_quantity.toString() : '',
        description_en: fullProduct.description_en || '',
        status: fullProduct.status || 'active',
        image_url: fullProduct.image_url || '',
        display_position: fullProduct.display_position ? fullProduct.display_position.toString() : '',
        additional_info: fullProduct.additional_info ? JSON.stringify(fullProduct.additional_info, null, 2) : ''
      });
      
      console.log('Form data set to:', {
        ...fullProduct,
        category_id: fullProduct.category_id ? fullProduct.category_id.toString() : ''
      });
    } catch (error) {
      console.error('Error loading product details:', error);
      alert('Failed to load product details. Using basic data.');
      setFormData({
        name_en: product.name_en,
        name_bn: product.name_bn,
        slug: product.slug,
        sku: product.sku || '',
        base_price: product.base_price.toString(),
        category_id: '',
        stock_quantity: product.stock_quantity?.toString() || '',
        description_en: '',
        status: product.status,
        image_url: '',
        display_position: '',
        additional_info: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleView = (product: Product) => {
    setModalMode('view');
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name_en}"?`)) return;

    try {
      await apiClient.delete(`/products/${product.id}`);
      setProducts(products.filter(p => p.id !== product.id));
      alert('Product deleted successfully');
    } catch (error) {
      alert('Failed to delete product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted, mode:', modalMode);
    console.log('Form data:', formData);
    console.log('Selected product:', selectedProduct);
    
    // Validation
    if (!formData.sku || !formData.slug) {
      alert('SKU and Slug are required fields');
      return;
    }

    if (!formData.category_id) {
      alert('Category is required');
      return;
    }

    if (!formData.name_en) {
      alert('Product name (English) is required');
      return;
    }

    if (!formData.base_price || parseFloat(formData.base_price) <= 0) {
      alert('Valid price is required');
      return;
    }
    
    // Prepare data with proper types
    const payload: any = {
      name_en: formData.name_en.trim(),
      name_bn: formData.name_bn?.trim() || null,
      slug: formData.slug.trim(),
      sku: formData.sku.trim(),
      base_price: parseFloat(formData.base_price),
      category_id: parseInt(formData.category_id),
      description_en: formData.description_en?.trim() || null,
      status: formData.status || 'active'
    };

    // Only include optional fields if they have values
    if (formData.image_url && formData.image_url.trim()) {
      payload.image_url = formData.image_url.trim();
    }

    if (formData.stock_quantity && formData.stock_quantity.trim()) {
      payload.stock_quantity = parseInt(formData.stock_quantity);
    }

    if (formData.display_position && formData.display_position.trim()) {
      payload.display_position = parseInt(formData.display_position);
    }

    // Parse and include additional_info JSON
    if (formData.additional_info && formData.additional_info.trim()) {
      try {
        payload.additional_info = JSON.parse(formData.additional_info.trim());
      } catch (jsonError) {
        alert('Invalid JSON format in Additional Information field. Please check your syntax.');
        return;
      }
    }

    console.log('Payload to send:', payload);

    try {
      if (modalMode === 'add') {
        console.log('Creating new product...');
        const response = await apiClient.post('/products', payload);
        console.log('Create response:', response.data);
        alert('Product added successfully');
        setIsModalOpen(false);
        loadProducts();
      } else if (modalMode === 'edit' && selectedProduct) {
        console.log('Updating product:', selectedProduct.id);
        const response = await apiClient.put(`/products/${selectedProduct.id}`, payload);
        console.log('Update response:', response.data);
        alert('Product updated successfully');
        setIsModalOpen(false);
        loadProducts();
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      let errorMsg = 'Operation failed';
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMsg = error.response.data.message.join(', ');
        } else {
          errorMsg = error.response.data.message;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(`Error: ${errorMsg}`);
    }
  };

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '');   // Remove leading/trailing hyphens
  };

  const generateSKU = async (categoryId: string): Promise<string> => {
    if (!categoryId) return '';
    
    try {
      // Find category
      const category = categories.find(cat => cat.id.toString() === categoryId);
      if (!category) return '';
      
      // Get category prefix (first 3 letters of name_en in uppercase)
      const prefix = (category.name_en || 'PRD').substring(0, 3).toUpperCase();
      
      // Count products in this category
      const productsInCategory = products.filter(p => p.category_name === category.name_en);
      const nextNumber = productsInCategory.length + 1;
      
      // Format: PREFIX-XXXX (e.g., SPI-0001, DRY-0012)
      return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating SKU:', error);
      return '';
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Update form data
    const updatedData = { ...formData, [name]: value };
    
    // Auto-generate slug from name_en
    if (name === 'name_en' && value) {
      updatedData.slug = generateSlug(value);
    }
    
    // Auto-generate SKU when category changes (only in add mode)
    if (name === 'category_id' && value && modalMode === 'add') {
      const sku = await generateSKU(value);
      updatedData.sku = sku;
    }
    
    setFormData(updatedData);
  };

  const filteredProducts = products.filter(p =>
    p.name_en?.toLowerCase().includes(search.toLowerCase()) ||
    p.name_bn?.includes(search) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name_en', label: 'Name (EN)' },
    { key: 'name_bn', label: 'Name (BN)' },
    { 
      key: 'base_price', 
      label: 'Price',
      render: (value: any) => `৳${Number(value || 0).toFixed(2)}`
    },
    { key: 'category_name', label: 'Category' },
    { key: 'stock_quantity', label: 'Stock' },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          value === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    }
  ];

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Products Management</h1>
            <p className="text-gray-600 mt-1">Manage your product inventory</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
          >
            <FaPlus />
            Add New Product
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or SKU..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Products Table */}
        <DataTable
          columns={columns}
          data={paginatedProducts}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'add' ? 'Add New Product' : modalMode === 'edit' ? 'Edit Product' : 'View Product'}
          size="lg"
          footer={
            modalMode !== 'view' ? (
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
                  form="product-form"
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                >
                  {modalMode === 'add' ? 'Create' : 'Update'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            )
          }
        >
          {modalMode === 'view' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name (English)</label>
                <p className="mt-1 text-gray-900">{selectedProduct?.name_en}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name (Bengali)</label>
                <p className="mt-1 text-gray-900">{selectedProduct?.name_bn}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <p className="mt-1 text-gray-900">৳{Number(selectedProduct?.base_price || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <p className="mt-1 text-gray-900">{selectedProduct?.category_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Stock</label>
                <p className="mt-1 text-gray-900">{selectedProduct?.stock_quantity || 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    selectedProduct?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedProduct?.status}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Name (English)"
                  name="name_en"
                  value={formData.name_en}
                  onChange={handleInputChange}
                  required
                />
                <FormInput
                  label="Name (Bengali)"
                  name="name_bn"
                  value={formData.name_bn}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <FormInput
                label="Category"
                name="category_id"
                type="select"
                value={formData.category_id}
                onChange={handleInputChange}
                required
                options={categories.map(cat => ({
                  value: cat.id,
                  label: cat.name_en || cat.name
                }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                  placeholder="Auto-generated from product name (editable)"
                />
                <FormInput
                  label="SKU"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="Auto-generated from category (editable)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Price"
                  name="base_price"
                  type="number"
                  value={formData.base_price}
                  onChange={handleInputChange}
                  required
                />
                <FormInput
                  label="Stock Quantity"
                  name="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Display Position"
                  name="display_position"
                  type="number"
                  value={formData.display_position}
                  onChange={handleInputChange}
                  placeholder="1, 2, 3... (for homepage/products page order)"
                />
              </div>

              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                label="Primary Product Image (Legacy)"
                folder="trustcart/products"
              />

              {/* Multiple Images Upload - Only show in edit mode */}
              {modalMode === 'edit' && selectedProduct && (
                <div className="border-t pt-4 mt-4">
                  <MultipleImageUpload
                    productId={selectedProduct.id}
                    folder="trustcart/products"
                  />
                </div>
              )}

              {modalMode === 'add' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You can add multiple images after creating the product. 
                    Upload the primary image above, then save the product to access the multiple image uploader.
                  </p>
                </div>
              )}

              <FormInput
                label="Description"
                name="description_en"
                type="textarea"
                value={formData.description_en}
                onChange={handleInputChange}
                rows={3}
              />

              {/* Additional Information JSON Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Information (JSON)
                </label>
                <textarea
                  name="additional_info"
                  value={formData.additional_info || ''}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder='{"weight": "500g", "dimensions": "10x10x15 cm", "warranty": "1 year"}'
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter product specifications in JSON format. Example: {`{"weight": "500g", "manufacturer": "Brand Name"}`}
                </p>
              </div>

              <FormInput
                label="Description"
                name="description_en"
                type="textarea"
                value={formData.description_en}
                onChange={handleInputChange}
                rows={3}
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
            </form>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
