import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
import ImageUpload from '@/components/admin/ImageUpload';
import MultipleImageUpload from '@/components/admin/MultipleImageUpload';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { FaPlus, FaSearch, FaEye, FaEyeSlash } from 'react-icons/fa';
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
  image_url?: string;
  description_en?: string;
  size_variants?: SizeVariant[];
}

interface SizeVariant {
  name: string;
  price: number;
  stock?: number;
  sku_suffix?: string;
}

interface ProductImage {
  id: number;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

export default function AdminProducts() {
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Array<number | string>>([]);
  const [bulkWorking, setBulkWorking] = useState(false);
  const itemsPerPage = 10;

  const [additionalInfoRows, setAdditionalInfoRows] = useState<Array<{ key: string; value: string }>>([]);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);
  const [viewProductImages, setViewProductImages] = useState<ProductImage[]>([]);
  const [viewProductDetails, setViewProductDetails] = useState<any>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);

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
    display_position: ''
  });

  const toAdditionalInfoRows = (data: any): Array<{ key: string; value: string }> => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
    return Object.entries(data).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value)
    }));
  };

  const buildAdditionalInfoObject = (): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const row of additionalInfoRows) {
      const key = row.key?.trim();
      if (!key) continue;
      result[key] = row.value ?? '';
    }
    return result;
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products/admin/all');
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
      display_position: ''
    });
    setAdditionalInfoRows([]);
    setSizeVariants([]);
    setPendingImages([]);
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
        display_position: fullProduct.display_position ? fullProduct.display_position.toString() : ''
      });

      setAdditionalInfoRows(toAdditionalInfoRows(fullProduct.additional_info));
      setSizeVariants(Array.isArray(fullProduct.size_variants) ? fullProduct.size_variants : []);
      
      console.log('Form data set to:', {
        ...fullProduct,
        category_id: fullProduct.category_id ? fullProduct.category_id.toString() : ''
      });
    } catch (error) {
      console.error('Error loading product details:', error);
      toast.error('Failed to load product details. Using basic data.');
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
        display_position: ''
      });
      setAdditionalInfoRows([]);
      setSizeVariants([]);
    }
    setIsModalOpen(true);
  };

  const handleView = async (product: Product) => {
    setModalMode('view');
    setSelectedProduct(product);
    setViewProductImages([]);
    setViewProductDetails(null);
    setIsModalOpen(true);
    
    // Fetch full product details and images
    try {
      const [productRes, imagesRes] = await Promise.all([
        apiClient.get(`/products/${product.id}`),
        apiClient.get(`/products/${product.id}/images`)
      ]);
      
      setViewProductDetails(productRes.data);
      
      const images = imagesRes.data || [];
      // Sort images: primary first, then by display_order
      const sortedImages = [...images].sort((a: ProductImage, b: ProductImage) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.display_order || 0) - (b.display_order || 0);
      });
      
      // If no images in product_images table, use the legacy image_url
      if (sortedImages.length === 0 && productRes.data.image_url) {
        setViewProductImages([{
          id: 0,
          image_url: productRes.data.image_url,
          display_order: 0,
          is_primary: true
        }]);
      } else {
        setViewProductImages(sortedImages);
      }
    } catch (error) {
      console.error('Error loading product details for view:', error);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name_en}"?`)) return;

    try {
      await apiClient.delete(`/products/${product.id}`);
      setProducts(products.filter(p => p.id !== product.id));
      toast.success('Product deleted successfully');
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      await apiClient.put(`/products/${product.id}`, { status: newStatus });
      setProducts(products.map(p => 
        p.id === product.id ? { ...p, status: newStatus } : p
      ));
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      toast.error('Failed to update product visibility');
    }
  };

  const clearSelection = () => setSelectedProductIds([]);

  const handleBulkApply = async (bulkAction: 'delete' | 'activate' | 'deactivate') => {
    if (selectedProductIds.length === 0) {
      toast.warning('Please select at least one product');
      return;
    }

    const actionLabel = bulkAction === 'delete' ? 'delete' : bulkAction === 'activate' ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionLabel} ${selectedProductIds.length} selected product(s)?`)) return;

    setBulkWorking(true);
    try {
      const results = await Promise.allSettled(
        selectedProductIds.map((id) => {
          const productId = Number(id);
          if (bulkAction === 'delete') return apiClient.delete(`/products/${productId}`);
          if (bulkAction === 'activate') return apiClient.put(`/products/${productId}`, { status: 'active' });
          return apiClient.put(`/products/${productId}`, { status: 'inactive' });
        }),
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      await loadProducts();
      clearSelection();

      if (failed > 0) {
        toast.warning(`Bulk action completed: ${succeeded} succeeded, ${failed} failed.`);
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      toast.error('Bulk action failed');
    } finally {
      setBulkWorking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted, mode:', modalMode);
    console.log('Form data:', formData);
    console.log('Selected product:', selectedProduct);
    
    // Validation
    if (!formData.sku || !formData.slug) {
      toast.warning('SKU and Slug are required fields');
      return;
    }

    if (!formData.category_id) {
      toast.warning('Category is required');
      return;
    }

    if (!formData.name_en) {
      toast.warning('Product name (English) is required');
      return;
    }

    if (!formData.base_price || parseFloat(formData.base_price) <= 0) {
      toast.warning('Valid price is required');
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

    // Build and include additional_info from key/value rows
    if (additionalInfoRows.length > 0) {
      const keys = additionalInfoRows
        .map(r => r.key?.trim())
        .filter((k): k is string => Boolean(k));

      const duplicates = keys.filter((k, idx) => keys.indexOf(k) !== idx);
      if (duplicates.length > 0) {
        toast.warning(`Duplicate keys in Additional Information: ${Array.from(new Set(duplicates)).join(', ')}`);
        return;
      }

      const additionalInfo = buildAdditionalInfoObject();
      if (Object.keys(additionalInfo).length > 0) {
        payload.additional_info = additionalInfo;
      }
    }

    // Include size variants if any are defined
    if (sizeVariants.length > 0) {
      // Filter out empty variants
      const validVariants = sizeVariants.filter(v => v.name && v.name.trim() && v.price > 0);
      payload.size_variants = validVariants;
    } else {
      payload.size_variants = [];
    }

    console.log('Payload to send:', payload);

    try {
      if (modalMode === 'add') {
        console.log('Creating new product...');
        const response = await apiClient.post('/products', payload);
        console.log('Create response:', response.data);
        
        // If there are pending images, upload them now
        const newProductId = response.data.id;
        if (pendingImages.length > 0 && newProductId) {
          console.log('Uploading pending images for product:', newProductId);
          for (let i = 0; i < pendingImages.length; i++) {
            try {
              await apiClient.post(`/products/${newProductId}/images`, {
                image_url: pendingImages[i],
                display_order: i,
                is_primary: i === 0 // First image is primary
              });
            } catch (imgError) {
              console.error('Failed to upload image:', imgError);
            }
          }
        }
        
        toast.success('Product added successfully');
        setPendingImages([]);
        setIsModalOpen(false);
        loadProducts();
      } else if (modalMode === 'edit' && selectedProduct) {
        console.log('Updating product:', selectedProduct.id);
        const response = await apiClient.put(`/products/${selectedProduct.id}`, payload);
        console.log('Update response:', response.data);
        toast.success('Product updated successfully');
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
      
      toast.error(`Error: ${errorMsg}`);
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
    },
    {
      key: 'visibility',
      label: 'Visible',
      render: (_value: any, row: Product) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleVisibility(row);
          }}
          className={`p-2 rounded-lg transition-all ${
            row.status === 'active'
              ? 'bg-green-100 text-green-600 hover:bg-green-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
          title={row.status === 'active' ? 'Click to hide from customers' : 'Click to show to customers'}
        >
          {row.status === 'active' ? <FaEye size={18} /> : <FaEyeSlash size={18} />}
        </button>
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

        {/* Bulk Actions */}
        {!loading && products.length > 0 && (
          <div className="mb-4 bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => handleBulkApply('activate')}
                disabled={selectedProductIds.length === 0 || bulkWorking}
                className={`px-4 py-2 rounded-lg text-sm text-white ${
                  selectedProductIds.length === 0 || bulkWorking
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {bulkWorking ? 'Working…' : 'Set Active'}
              </button>

              <button
                onClick={() => handleBulkApply('deactivate')}
                disabled={selectedProductIds.length === 0 || bulkWorking}
                className={`px-4 py-2 rounded-lg text-sm text-white ${
                  selectedProductIds.length === 0 || bulkWorking
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {bulkWorking ? 'Working…' : 'Set Inactive'}
              </button>

              <button
                onClick={() => handleBulkApply('delete')}
                disabled={selectedProductIds.length === 0 || bulkWorking}
                className={`px-4 py-2 rounded-lg text-sm text-white ${
                  selectedProductIds.length === 0 || bulkWorking
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {bulkWorking ? 'Working…' : 'Delete'}
              </button>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-700">
              <span>
                Selected <span className="font-semibold">{selectedProductIds.length}</span>
              </span>
              <button
                onClick={clearSelection}
                disabled={selectedProductIds.length === 0 || bulkWorking}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  selectedProductIds.length === 0 || bulkWorking
                    ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Products Table */}
        <DataTable
          columns={columns}
          data={paginatedProducts}
          loading={loading}
          selection={{
            selectedRowIds: selectedProductIds,
            onChange: (next) => setSelectedProductIds(next),
            getRowId: (row) => row.id,
          }}
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
              {/* Product Images Gallery */}
              {viewProductImages.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {viewProductImages.map((img, index) => (
                      <div key={img.id || index} className="relative">
                        <img
                          src={img.image_url}
                          alt={`Product image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        {img.is_primary && (
                          <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewProductImages.length === 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
                  <p className="text-gray-500 text-sm">No images uploaded for this product.</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name (English)</label>
                  <p className="mt-1 text-gray-900">{selectedProduct?.name_en}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name (Bengali)</label>
                  <p className="mt-1 text-gray-900">{selectedProduct?.name_bn || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <p className="mt-1 text-gray-900">{selectedProduct?.sku || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Slug</label>
                  <p className="mt-1 text-gray-900">{selectedProduct?.slug || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <p className="mt-1 text-gray-900">৳{Number(selectedProduct?.base_price || 0).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="mt-1 text-gray-900">{selectedProduct?.category_name || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              
              {/* Description */}
              {viewProductDetails?.description_en && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <div 
                    className="mt-1 text-gray-900 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: viewProductDetails.description_en }}
                  />
                </div>
              )}

              {/* Size Variants */}
              {viewProductDetails?.size_variants && viewProductDetails.size_variants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size Variants</label>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 mb-2 pb-2 border-b border-purple-200">
                      <span>Size</span>
                      <span>Price</span>
                      <span>Stock</span>
                      <span>SKU Suffix</span>
                    </div>
                    {viewProductDetails.size_variants.map((variant: SizeVariant, idx: number) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 py-1 text-sm">
                        <span className="text-gray-900 font-medium">{variant.name}</span>
                        <span className="text-gray-900">৳{variant.price}</span>
                        <span className="text-gray-900">{variant.stock || 0}</span>
                        <span className="text-gray-600">{variant.sku_suffix || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Additional Info */}
              {viewProductDetails?.additional_info && Object.keys(viewProductDetails.additional_info).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Information</label>
                  <div className="bg-gray-50 rounded-lg p-3">
                    {Object.entries(viewProductDetails.additional_info).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                        <span className="text-gray-600 font-medium">{key}:</span>
                        <span className="text-gray-900">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                label="Primary Product Image"
                folder="trustcart/products"
              />

              {/* Multiple Images Upload - Edit mode: direct upload */}
              {modalMode === 'edit' && selectedProduct && (
                <div className="border-t pt-4 mt-4">
                  <MultipleImageUpload
                    productId={selectedProduct.id}
                    folder="trustcart/products"
                  />
                </div>
              )}

              {/* Multiple Images Upload - Add mode: queue for upload after save */}
              {modalMode === 'add' && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Additional Product Images
                    </label>
                    <span className="text-xs text-gray-500">
                      {pendingImages.length} image(s) queued
                    </span>
                  </div>
                  
                  {pendingImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {pendingImages.map((imgUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imgUrl}
                            alt={`Pending ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          {index === 0 && (
                            <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                              Primary
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingImages(pendingImages.filter((_, i) => i !== index))}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <ImageUpload
                    value=""
                    onChange={(url) => {
                      if (url) {
                        setPendingImages([...pendingImages, url]);
                      }
                    }}
                    label="Add Image"
                    folder="trustcart/products"
                  />
                  
                  <p className="text-xs text-gray-500 mt-2">
                    These images will be uploaded when you save the product. The first image will be set as primary.
                  </p>
                </div>
              )}

              <RichTextEditor
                label="Description"
                value={formData.description_en}
                onChange={(value) => setFormData({ ...formData, description_en: value })}
                placeholder="Enter product description..."
              />

              {/* Size Variants Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Size Variants <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSizeVariants([...sizeVariants, { name: '', price: 0, stock: 0, sku_suffix: '' }])}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <FaPlus className="h-3 w-3" />
                    Add Variant
                  </button>
                </div>

                {sizeVariants.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Add size variants if this product comes in different sizes (e.g., 250g, 500g, 1kg)
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sizeVariants.map((variant, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-12 gap-2">
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => {
                              const next = [...sizeVariants];
                              next[idx] = { ...next[idx], name: e.target.value };
                              setSizeVariants(next);
                            }}
                            placeholder="Size name (e.g., 500g, Large)"
                            className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <input
                            type="number"
                            value={variant.price || ''}
                            onChange={(e) => {
                              const next = [...sizeVariants];
                              next[idx] = { ...next[idx], price: parseFloat(e.target.value) || 0 };
                              setSizeVariants(next);
                            }}
                            placeholder="Price"
                            className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <input
                            type="number"
                            value={variant.stock || ''}
                            onChange={(e) => {
                              const next = [...sizeVariants];
                              next[idx] = { ...next[idx], stock: parseInt(e.target.value) || 0 };
                              setSizeVariants(next);
                            }}
                            placeholder="Stock"
                            className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <input
                            type="text"
                            value={variant.sku_suffix || ''}
                            onChange={(e) => {
                              const next = [...sizeVariants];
                              next[idx] = { ...next[idx], sku_suffix: e.target.value };
                              setSizeVariants(next);
                            }}
                            placeholder="SKU suffix"
                            className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            type="button"
                            onClick={() => setSizeVariants(sizeVariants.filter((_, i) => i !== idx))}
                            className="col-span-1 px-2 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50"
                            aria-label="Remove variant"
                            title="Remove variant"
                          >
                            ×
                          </button>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Size: {variant.name || '—'} | Price: ৳{variant.price || 0} | Stock: {variant.stock || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Information Key/Value Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Information
                  </label>
                  <button
                    type="button"
                    onClick={() => setAdditionalInfoRows([...additionalInfoRows, { key: '', value: '' }])}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FaPlus className="h-3 w-3" />
                    Add field
                  </button>
                </div>

                {additionalInfoRows.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Add key/value pairs like weight, dimensions, warranty, etc.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {additionalInfoRows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={row.key}
                          onChange={(e) => {
                            const next = [...additionalInfoRows];
                            next[idx] = { ...next[idx], key: e.target.value };
                            setAdditionalInfoRows(next);
                          }}
                          placeholder="Key (e.g., weight)"
                          className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={row.value}
                          onChange={(e) => {
                            const next = [...additionalInfoRows];
                            next[idx] = { ...next[idx], value: e.target.value };
                            setAdditionalInfoRows(next);
                          }}
                          placeholder="Value (e.g., 500g)"
                          className="col-span-6 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setAdditionalInfoRows(additionalInfoRows.filter((_, i) => i !== idx))}
                          className="col-span-1 px-2 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                          aria-label="Remove"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
            </form>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
