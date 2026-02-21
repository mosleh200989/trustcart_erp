import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/contexts/ToastContext';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
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
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [formData, setFormData] = useState({
    name_en: '',
    name_bn: '',
    slug: '',
    sku: '',
    base_price: '',
    category_id: '',
    stock_quantity: '',
    description_en: '',
    status: 'active'
  });

  useEffect(() => {
    loadProducts();
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
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    setFormData({
      name_en: product.name_en,
      name_bn: product.name_bn,
      slug: product.slug,
      sku: product.sku || '',
      base_price: product.base_price.toString(),
      category_id: '',
      stock_quantity: product.stock_quantity?.toString() || '',
      description_en: '',
      status: product.status
    });
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
      toast.success('Product deleted successfully');
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        const response = await apiClient.post('/products', formData);
        setProducts([...products, response.data]);
        toast.success('Product added successfully');
      } else if (modalMode === 'edit' && selectedProduct) {
        const response = await apiClient.put(`/products/${selectedProduct.id}`, formData);
        setProducts(products.map(p => p.id === selectedProduct.id ? response.data : p));
        toast.success('Product updated successfully');
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      render: (value: number) => `৳${value.toFixed(2)}`
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
        <div className="mb-4 flex justify-end">
          <PageSizeSelector
            value={itemsPerPage}
            onChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
        </div>
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
                <p className="mt-1 text-gray-900">৳{selectedProduct?.base_price.toFixed(2)}</p>
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
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                />
                <FormInput
                  label="SKU"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
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
