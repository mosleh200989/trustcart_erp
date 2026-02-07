import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaStar, FaShoppingCart, FaHeart, FaEye, FaTag } from "react-icons/fa";
import AddToCartPopup from "./AddToCartPopup";
import { BACKEND_ORIGIN } from "@/config/backend";
import { useToast } from "@/contexts/ToastContext";
import { trackAddToCart } from "@/utils/gtm";

interface ProductCardProps {
  id: number;
  slug?: string;
  nameBn?: string;
  nameEn?: string;
  name?: string;
  categoryName?: string;
  price: number;
  originalPrice?: number;
  stock?: number;
  image?: string;
  imageUrl?: string;
  image_url?: string;
  thumb?: string;
  thumbnail?: string;
  rating?: number;
  reviews?: number;
  discount?: number;
}

const resolveImageUrl = (value: unknown) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return raw;

  return `${BACKEND_ORIGIN}/uploads/${raw}`;
};

export default function ElectroProductCard({
  id,
  slug,
  nameBn,
  nameEn,
  name,
  categoryName,
  price,
  originalPrice,
  stock,
  image,
  imageUrl,
  image_url,
  thumb,
  thumbnail,
  rating = 5,
  reviews = 0,
  discount,
}: ProductCardProps) {
  const toast = useToast();
  const [showPopup, setShowPopup] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const displayName = nameEn || name || nameBn || "Product";
  const displayCategory =
    typeof categoryName === "string" ? categoryName.trim() : "";
  const productUrl = slug ? `/products/${slug}` : `/products/${id}`;
  const resolvedImageUrl =
    resolveImageUrl(imageUrl) ||
    resolveImageUrl(image_url) ||
    resolveImageUrl(thumb) ||
    resolveImageUrl(thumbnail) ||
    resolveImageUrl(image);
  const priceNum = typeof price === "number" ? price : parseFloat(price) || 0;
  const originalPriceNum = originalPrice
    ? typeof originalPrice === "number"
      ? originalPrice
      : parseFloat(originalPrice)
    : undefined;
  const hasDiscount = originalPriceNum && originalPriceNum > priceNum;
  const discountPercent = hasDiscount
    ? Math.round(((originalPriceNum - priceNum) / originalPriceNum) * 100)
    : discount;

  useEffect(() => {
    setImageError(false);
  }, [resolvedImageUrl]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find((item: any) => item.id === id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id,
        name: displayName,
        name_en: displayName,
        price: priceNum,
        quantity: 1,
        image,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    
    // Track add to cart event for GTM/Analytics
    trackAddToCart({
      id,
      name: displayName,
      price: priceNum,
      quantity: 1,
      category: displayCategory || 'Products',
    });
    
    setShowPopup(true);
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.warning("Please login to add items to your wishlist.");
      router.push("/customer/login");
      return;
    }

    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    if (!wishlist.find((item: any) => item.id === id)) {
      wishlist.push({ id, name: displayName, price: priceNum, image });
      localStorage.setItem("wishlist", JSON.stringify(wishlist));
      window.dispatchEvent(new Event("wishlistUpdated"));
      toast.success("Added to your wishlist.");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 group relative">
      {/* Discount Badge */}
      {discountPercent && discountPercent > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <div
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-500 via-green-400 to-green-600 text-white px-3 py-3 text-xs font-extrabold shadow-xl border border-white/60"
            style={{
              clipPath:
                "polygon(50% 0%, 60% 12%, 76% 6%, 72% 22%, 88% 24%, 78% 36%, 100% 50%, 78% 64%, 88% 76%, 72% 78%, 76% 94%, 60% 88%, 50% 100%, 40% 88%, 24% 94%, 28% 78%, 12% 76%, 22% 64%, 0% 50%, 22% 36%, 12% 24%, 28% 22%, 24% 6%, 40% 12%)",
            }}
          >
            <span>-{discountPercent}%</span>
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
        {/* Image - 1:1 Aspect Ratio for Professional E-commerce Look */}
        <div className="relative w-full pt-[100%] bg-gray-50 overflow-hidden">
          {resolvedImageUrl && !imageError ? (
            <img
              src={resolvedImageUrl}
              alt={displayName}
              className="absolute inset-0 w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                console.error("Image failed to load:", resolvedImageUrl);
                setImageError(true);
              }}
            />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
              <span className="text-6xl">📦</span>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300"></div>
        </div>

        {/* Content */}
        <div className="py-1 px-2 sm:px-3">
          {/* Rating */}
          {/* <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <FaStar
                key={i}
                size={14}
                className={i < rating ? "text-yellow-400" : "text-gray-300"}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">({reviews})</span>
          </div> */}

          {/* Name */}
          <h3
            className={`font-semibold text-gray-800 text-sm sm:text-base lg:text-xl group-hover:text-orange-500 transition-colors text-center line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] lg:min-h-[3.5rem] ${
              displayCategory ? "mb-1" : "mb-2 sm:mb-3"
            }`}
          >
            {displayName}
          </h3>

          {displayCategory && (
            <div className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3 text-center line-clamp-1">
              {displayCategory}
            </div>
          )}

          {/* Price */}
          <div className="mb-2 sm:mb-3 text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
              <span className="text-base sm:text-lg lg:text-2xl font-bold text-orange-500">
                ৳{priceNum.toFixed(2)}
              </span>
              {hasDiscount && originalPriceNum && (
                <span className="text-xs sm:text-sm text-gray-400 line-through">
                  ৳{originalPriceNum.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-green-600 font-semibold min-h-[1rem]">
              {hasDiscount && originalPriceNum
                ? `You save ৳${(originalPriceNum - priceNum).toFixed(2)}`
                : null}
            </div>
          </div>
        </div>
      </Link>

      {/* Add to Cart Button */}
      <div className="px-2 sm:px-3 pb-2 sm:pb-4">
        <button
          onClick={handleAddToCart}
          disabled={stock === 0}
          className="add-to-cart-btn w-full py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: stock === 0 ? '#d1d5db' : 'white',
            border: '2px solid #f97316',
            color: '#f97316',
          }}
          onMouseEnter={(e) => {
            if (stock !== 0) {
              e.currentTarget.style.backgroundColor = '#f97316';
              e.currentTarget.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (stock !== 0) {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#f97316';
            }
          }}
        >
          <FaShoppingCart size={18} />
          <span>Add to Cart</span>
        </button>
      </div>

      {/* Add to Cart Popup */}
      <AddToCartPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        product={{
          id,
          name_en: displayName,
          name: displayName,
          price,
          image: resolvedImageUrl || image,
        }}
      />
    </div>
  );
}
