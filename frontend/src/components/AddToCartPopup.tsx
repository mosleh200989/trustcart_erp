import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaCheckCircle, FaShoppingCart, FaTimes, FaArrowLeft, FaCreditCard } from 'react-icons/fa';
import apiClient from '@/services/api';
import ElectroProductCard from './ElectroProductCard';

interface AddToCartPopupProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
}

const AddToCartPopup: React.FC<AddToCartPopupProps> = ({ isOpen, onClose, product }) => {
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);

  const normalizeProductForCard = (item: any) => {
    const resolvedPrice = Number(
      item.selling_price ?? item.price ?? item.base_price ?? item.grand_total ?? 0,
    );

    return {
      id: item.id ?? item.product_id ?? Math.random(),
      nameEn: item.name_en ?? item.nameEn ?? item.name,
      nameBn: item.name_bn ?? item.nameBn,
      name: item.name ?? item.name_en ?? item.name_bn,
      categoryName:
        item.category_name ??
        item.categoryName ??
        item.category?.name_en ??
        item.category?.name,
      price: resolvedPrice,
      originalPrice: item.base_price ? Number(item.base_price) : undefined,
      stock: item.stock_quantity ?? item.stock ?? item.stockQuantity,
      image: item.image_url ?? item.imageUrl ?? item.image ?? item.thumb,
      rating: item.rating ?? item.average_rating ?? 5,
      reviews: item.reviews ?? item.review_count ?? 0,
      discount: item.discount ?? item.discount_percentage,
    };
  };

  useEffect(() => {
    if (isOpen) {
      loadSuggestedProducts();
    }
  }, [isOpen]);

  const loadSuggestedProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      const allProducts = response.data || [];
      const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
      setSuggestedProducts(shuffled.slice(0, 4));
    } catch (error) {
      console.error('Error loading suggested products:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-green-500 text-white p-6 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-3xl" />
              <div>
                <h3 className="text-xl font-bold">Product Added to Cart!</h3>
                {product && (
                  <p className="text-green-100 text-sm mt-1">{product.name_en || product.name}</p>
                )}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-green-100 transition-colors"
            >
              <FaTimes className="text-2xl" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Top Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 mb-6 border-b border-gray-200">
              <button 
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                <FaArrowLeft />
                Continue Shopping
              </button>
              <Link 
                href="/checkout"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
              >
                <FaCreditCard />
                View Cart
              </Link>
            </div>

            {/* Suggested Products Section */}
            <div>
              <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-orange-500"></span>
                Products You May Like
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {suggestedProducts.map(item => {
                  const cardProps = normalizeProductForCard(item);
                  return <ElectroProductCard key={cardProps.id} {...cardProps} />;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddToCartPopup;
