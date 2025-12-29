import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaStar, FaShoppingCart, FaHeart, FaEye } from 'react-icons/fa';
import AddToCartPopup from './AddToCartPopup';

interface ProductCardProps {
  id: number;
  slug?: string;
  nameBn?: string;
  nameEn?: string;
  name?: string;
  price: number;
  originalPrice?: number;
  stock?: number;
  image?: string;
  rating?: number;
  reviews?: number;
  discount?: number;
}

export default function ElectroProductCard({ 
  id,
  slug,
  nameBn, 
  nameEn, 
  name,
  price, 
  originalPrice, 
  stock,
  image,
  rating = 5,
  reviews = 0,
  discount
}: ProductCardProps) {
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();
  const displayName = nameEn || name || nameBn || 'Product';
  const productUrl = slug ? `/products/${slug}` : `/products/${id}`;
  const priceNum = typeof price === 'number' ? price : parseFloat(price) || 0;
  const originalPriceNum = originalPrice ? (typeof originalPrice === 'number' ? originalPrice : parseFloat(originalPrice)) : undefined;
  const hasDiscount = originalPriceNum && originalPriceNum > priceNum;
  const discountPercent = hasDiscount ? Math.round(((originalPriceNum - priceNum) / originalPriceNum) * 100) : discount;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find((item: any) => item.id === id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ id, name: displayName, name_en: displayName, price: priceNum, quantity: 1, image });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    setShowPopup(true);
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Please login to add items to your wishlist.');
      router.push('/customer/login');
      return;
    }

    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    if (!wishlist.find((item: any) => item.id === id)) {
      wishlist.push({ id, name: displayName, price: priceNum, image });
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
      window.dispatchEvent(new Event('wishlistUpdated'));
      alert('Added to your wishlist.');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 group relative">
      {/* Discount Badge */}
      {discountPercent && discountPercent > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-lg">
            -{discountPercent}%
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={handleAddToWishlist}
          className="bg-white hover:bg-orange-500 hover:text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-110"
          title="Add to Wishlist"
        >
          <FaHeart size={16} />
        </button>
        <button 
          className="bg-white hover:bg-orange-500 hover:text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-110"
          title="Quick View"
        >
          <FaEye size={16} />
        </button>
      </div>

      <Link href={productUrl}>
        {/* Image */}
        <div className="relative h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={displayName}
              crossOrigin="anonymous"
              className="object-contain group-hover:scale-110 transition-transform duration-500 max-h-full p-4"
              onError={(e) => {
                console.error('Image failed to load:', image);
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50"><span class="text-6xl">📦</span></div>';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
              <span className="text-6xl">📦</span>
            </div>
          )}
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
        </div>

        {/* Content */}
        <div className="py-4 px-3">
          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <FaStar
                key={i}
                size={14}
                className={i < rating ? 'text-yellow-400' : 'text-gray-300'}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">({reviews})</span>
          </div>

          {/* Name */}
          <h3 className="font-semibold text-gray-800 mb-3 line-clamp-2 min-h-[3rem] group-hover:text-orange-500 transition-colors">
            {displayName}
          </h3>

          {/* Price */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-orange-500">৳{priceNum.toFixed(2)}</span>
              {hasDiscount && originalPriceNum && (
                <span className="text-sm text-gray-400 line-through">৳{originalPriceNum.toFixed(2)}</span>
              )}
            </div>
            {hasDiscount && originalPriceNum && (
              <div className="text-xs text-green-600 font-semibold">
                You save ৳{(originalPriceNum - priceNum).toFixed(2)}
              </div>
            )}
          </div>

          {/* Stock Status */}
          {stock !== undefined && (
            <div className="mb-3">
              {stock > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  In Stock ({stock})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Out of Stock
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Add to Cart Button */}
      <div className="px-3 pb-4">
        <button
          onClick={handleAddToCart}
          disabled={stock === 0}
          className="w-full bg-white border-2 border-orange-500 hover:!bg-orange-500 hover:text-white hover:shadow-lg text-orange-500 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <FaShoppingCart size={18} />
          Add to Cart
        </button>
      </div>

      {/* Add to Cart Popup */}
      <AddToCartPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        product={{ id, name_en: displayName, name: displayName, price, image }}
      />
    </div>
  );
}
