import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';
import { FaFire, FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaSearch, FaCheck } from 'react-icons/fa';
import apiClient from '@/services/api';

interface HotDeal {
  id: number;
  product_id: number;
  name_en: string;
  name_bn?: string;
  slug: string;
  sku: string;
  base_price: number;
  sale_price?: number;
  image_url?: string;
  special_price?: number;
  discount_percent?: number;
  display_order: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  category_name?: string;
  stock_quantity?: number;
}

interface Product {
  id: number;
  name_en: string;
  name_bn?: string;
  slug: string;
  sku: string;
  base_price: number;
  sale_price?: number;
  image_url?: string;
  category_name?: string;
  stock_quantity?: number;
}

export default function HotDealsManager() {
  const toast = useToast();
  const [hotDeals, setHotDeals] = useState<HotDeal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedDeal, setSelectedDeal] = useState<HotDeal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    specialPrice: '',
    discountPercent: '',
    displayOrder: '0',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadHotDeals();
    loadProducts();
  }, []);

  const loadHotDeals = async () => {
    try {
      const response = await apiClient.get('/products/admin/hot-deals');
      setHotDeals(response.data || []);
    } catch (error) {
      console.error('Error loading hot deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAdd = () => {
    setModalMode('add');
    setSelectedDeal(null);
    setSelectedProductId(null);
    setFormData({
      specialPrice: '',
      discountPercent: '',
      displayOrder: '0',
      startDate: '',
      endDate: '',
    });
    setSearchQuery('');
    setIsModalOpen(true);
  };

  const handleEdit = (deal: HotDeal) => {
    setModalMode('edit');
    setSelectedDeal(deal);
    setSelectedProductId(deal.product_id);
    setFormData({
      specialPrice: deal.special_price?.toString() || '',
      discountPercent: deal.discount_percent?.toString() || '',
      displayOrder: deal.display_order?.toString() || '0',
      startDate: deal.start_date ? new Date(deal.start_date).toISOString().slice(0, 16) : '',
      endDate: deal.end_date ? new Date(deal.end_date).toISOString().slice(0, 16) : '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (deal: HotDeal) => {
    if (!confirm(`Remove "${deal.name_en}" from hot deals?`)) return;

    try {
      await apiClient.delete(`/products/admin/hot-deals/${deal.id}`);
      await loadHotDeals();
      toast.success('Hot deal removed successfully');
    } catch (error) {
      console.error('Error removing hot deal:', error);
      toast.error('Failed to remove hot deal');
    }
  };

  const handleToggleStatus = async (deal: HotDeal) => {
    try {
      await apiClient.put(`/products/admin/hot-deals/${deal.id}/toggle`);
      await loadHotDeals();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to toggle status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modalMode === 'add' && !selectedProductId) {
      toast.warning('Please select a product');
      return;
    }

    const payload = {
      productId: selectedProductId,
      specialPrice: formData.specialPrice ? parseFloat(formData.specialPrice) : undefined,
      discountPercent: formData.discountPercent ? parseInt(formData.discountPercent) : undefined,
      displayOrder: parseInt(formData.displayOrder) || 0,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
    };

    try {
      if (modalMode === 'add') {
        await apiClient.post('/products/admin/hot-deals', payload);
        toast.success('Product added to hot deals successfully!');
      } else if (selectedDeal) {
        await apiClient.put(`/products/admin/hot-deals/${selectedDeal.id}`, payload);
        toast.success('Hot deal updated successfully!');
      }
      setIsModalOpen(false);
      await loadHotDeals();
    } catch (error: any) {
      console.error('Error saving hot deal:', error);
      toast.error(error.response?.data?.message || 'Failed to save hot deal');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const notInHotDeals = !hotDeals.some(deal => deal.product_id === product.id);
    return matchesSearch && notInHotDeals;
  });

  const columns = [
    {
      key: 'name_en',
      label: 'Product',
      render: (_: any, row: HotDeal) => (
        <div className="flex items-center gap-3">
          <img
            src={row.image_url || '/placeholder.png'}
            alt={row.name_en}
            className="w-12 h-12 object-cover rounded-lg"
          />
          <div>
            <div className="font-semibold text-gray-800">{row.name_en}</div>
            <div className="text-xs text-gray-500">SKU: {row.sku}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category_name',
      label: 'Category',
      render: (_: any, row: HotDeal) => (
        <span className="text-gray-600">{row.category_name || 'N/A'}</span>
      ),
    },
    {
      key: 'base_price',
      label: 'Base Price',
      render: (_: any, row: HotDeal) => (
        <span className="font-semibold">৳{Number(row.base_price).toFixed(2)}</span>
      ),
    },
    {
      key: 'special_price',
      label: 'Hot Deal Price',
      render: (_: any, row: HotDeal) => (
        <div>
          {row.special_price ? (
            <span className="font-bold text-orange-600">৳{Number(row.special_price).toFixed(2)}</span>
          ) : row.discount_percent ? (
            <span className="font-bold text-green-600">{row.discount_percent}% OFF</span>
          ) : (
            <span className="text-gray-400">Same as base</span>
          )}
        </div>
      ),
    },
    {
      key: 'display_order',
      label: 'Order',
      render: (_: any, row: HotDeal) => (
        <span className="bg-gray-100 px-2 py-1 rounded text-sm">{row.display_order}</span>
      ),
    },
    {
      key: 'start_date',
      label: 'Duration',
      render: (_: any, row: HotDeal) => (
        <div className="text-xs">
          {row.start_date || row.end_date ? (
            <>
              {row.start_date && <div>From: {new Date(row.start_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' })}</div>}
              {row.end_date && <div>To: {new Date(row.end_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' })}</div>}
            </>
          ) : (
            <span className="text-gray-400">Always active</span>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_: any, row: HotDeal) => (
        <button
          onClick={() => handleToggleStatus(row)}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            row.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_: any, row: HotDeal) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Edit"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Remove"
          >
            <FaTrash />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FaFire className="text-orange-500" />
              Hot Deals Manager
            </h1>
            <p className="text-gray-600 mt-1">Manage products displayed in the Hot Deals section</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg"
          >
            <FaPlus />
            Add Hot Deal
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Hot Deals</div>
            <div className="text-2xl font-bold text-gray-800">{hotDeals.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Active Deals</div>
            <div className="text-2xl font-bold text-green-600">
              {hotDeals.filter(d => d.is_active).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Inactive Deals</div>
            <div className="text-2xl font-bold text-red-600">
              {hotDeals.filter(d => !d.is_active).length}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <p className="mt-2 text-gray-600">Loading hot deals...</p>
            </div>
          ) : hotDeals.length === 0 ? (
            <div className="p-8 text-center">
              <FaFire className="mx-auto text-6xl text-gray-300 mb-4" />
              <p className="text-gray-600 mb-4">No hot deals yet. Add products to display in the Hot Deals section.</p>
              <button
                onClick={handleAdd}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition"
              >
                Add First Hot Deal
              </button>
            </div>
          ) : (
            <DataTable columns={columns} data={hotDeals} />
          )}
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'add' ? 'Add Product to Hot Deals' : 'Edit Hot Deal'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Selection (only in add mode) */}
            {modalMode === 'add' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Product *
                </label>
                <div className="relative mb-3">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {searchQuery ? 'No products found' : 'All products are already in hot deals'}
                    </div>
                  ) : (
                    filteredProducts.slice(0, 20).map((product) => (
                      <div
                        key={product.id}
                        onClick={() => setSelectedProductId(product.id)}
                        className={`p-3 cursor-pointer border-b last:border-0 transition ${
                          selectedProductId === product.id
                            ? 'bg-orange-50 border-l-4 border-l-orange-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {selectedProductId === product.id && (
                            <FaCheck className="text-orange-500" />
                          )}
                          <img
                            src={product.image_url || '/placeholder.png'}
                            alt={product.name_en}
                            className="w-10 h-10 object-cover rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{product.name_en}</div>
                            <div className="text-xs text-gray-500">SKU: {product.sku} | ৳{Number(product.base_price).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {selectedProductId && (
                  <div className="mt-2 p-2 bg-orange-50 rounded-lg text-sm text-orange-800">
                    Selected: {products.find(p => p.id === selectedProductId)?.name_en}
                  </div>
                )}
              </div>
            )}

            {/* Show selected product in edit mode */}
            {modalMode === 'edit' && selectedDeal && (
              <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                <img
                  src={selectedDeal.image_url || '/placeholder.png'}
                  alt={selectedDeal.name_en}
                  className="w-12 h-12 object-cover rounded"
                />
                <div>
                  <div className="font-medium text-gray-800">{selectedDeal.name_en}</div>
                  <div className="text-xs text-gray-500">SKU: {selectedDeal.sku}</div>
                </div>
              </div>
            )}

            {/* Special Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Price (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.specialPrice}
                onChange={(e) => setFormData({ ...formData, specialPrice: e.target.value })}
                placeholder="Leave empty to use product's sale price"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">Set a specific price for the hot deal</p>
            </div>

            {/* Discount Percent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Percentage (Optional)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.discountPercent}
                onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                placeholder="e.g., 20 for 20% off"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">Alternative to special price - show as "X% OFF"</p>
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">Leave empty for no time restrictions</p>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2"
              >
                <FaFire />
                {modalMode === 'add' ? 'Add to Hot Deals' : 'Update Hot Deal'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
