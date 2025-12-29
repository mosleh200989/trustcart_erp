import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaFire, FaTimes, FaCheck, FaCalendar } from 'react-icons/fa';
import apiClient from '@/services/api';

export default function DealOfTheDayManager() {
  const [products, setProducts] = useState<any[]>([]);
  const [currentDeal, setCurrentDeal] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
    loadCurrentDeal();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCurrentDeal = async () => {
    try {
      const response = await apiClient.get('/products/deal-of-the-day');
      setCurrentDeal(response.data);
    } catch (error) {
      console.error('Error loading current deal:', error);
    }
  };

  const handleSetDeal = async () => {
    if (!selectedProductId) {
      alert('Please select a product');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/products/admin/deal-of-the-day', {
        productId: selectedProductId,
        endDate: endDate || undefined,
      });
      alert('Deal of the Day set successfully!');
      await loadCurrentDeal();
      setSelectedProductId(null);
      setEndDate('');
    } catch (error) {
      console.error('Error setting deal:', error);
      alert('Failed to set Deal of the Day');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDeal = async () => {
    if (!confirm('Are you sure you want to remove the current Deal of the Day?')) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.delete('/products/admin/deal-of-the-day');
      alert('Deal of the Day removed successfully!');
      await loadCurrentDeal();
    } catch (error) {
      console.error('Error removing deal:', error);
      alert('Failed to remove Deal of the Day');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaFire className="text-orange-500" />
            Deal of the Day Manager
          </h1>
          <p className="text-gray-600 mt-2">Set and manage the featured Deal of the Day for your homepage</p>
        </div>

        {/* Current Deal Display */}
        {currentDeal && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaFire className="text-orange-500" />
              Current Deal of the Day
            </h2>
            <button
              onClick={handleRemoveDeal}
              disabled={loading}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition flex items-center gap-2"
            >
              <FaTimes />
              Remove Deal
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4 bg-white rounded-lg p-4">
              <img
                src={currentDeal.image_url || '/placeholder.png'}
                alt={currentDeal.name_en}
                className="w-24 h-24 object-cover rounded-lg"
              />
              <div>
                <h3 className="font-bold text-lg text-gray-800">{currentDeal.name_en}</h3>
                <p className="text-sm text-gray-600">SKU: {currentDeal.sku}</p>
                <p className="text-sm text-gray-600">Brand: {currentDeal.brand || 'N/A'}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Price:</span>
                  <span className="font-semibold">৳{Number(currentDeal.base_price).toFixed(2)}</span>
                </div>
                {currentDeal.sale_price && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sale Price:</span>
                    <span className="font-semibold text-orange-600">৳{Number(currentDeal.sale_price).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock:</span>
                  <span className="font-semibold">{currentDeal.stock_quantity || 0} units</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set New Deal Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Set New Deal of the Day</h2>
        
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* End Date (Optional) */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <FaCalendar className="text-orange-500" />
            End Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration</p>
        </div>

        {/* Product Selection */}
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No products found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  className={`p-4 cursor-pointer transition ${
                    selectedProductId === product.id
                      ? 'bg-orange-50 border-l-4 border-orange-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {selectedProductId === product.id && (
                        <FaCheck className="text-orange-500 text-xl" />
                      )}
                    </div>
                    <img
                      src={product.image_url || '/placeholder.png'}
                      alt={product.name_en}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{product.name_en}</h3>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm font-semibold text-orange-600">
                          ৳{Number(product.sale_price || product.base_price).toFixed(2)}
                        </span>
                        {product.sale_price && (
                          <span className="text-sm text-gray-500 line-through">
                            ৳{Number(product.base_price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-6">
          <button
            onClick={handleSetDeal}
            disabled={loading || !selectedProductId}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaFire />
            {loading ? 'Setting Deal...' : 'Set as Deal of the Day'}
          </button>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
