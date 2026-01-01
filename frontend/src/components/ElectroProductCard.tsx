import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaStar, FaShoppingCart, FaHeart, FaEye, FaTag } from "react-icons/fa";
import AddToCartPopup from "./AddToCartPopup";

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
  categoryName,
  price,
  originalPrice,
  stock,
  image,
  rating = 5,
  reviews = 0,
  discount,
}: ProductCardProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const displayName = nameEn || name || nameBn || "Product";
  const displayCategory =
    typeof categoryName === "string" ? categoryName.trim() : "";
  const productUrl = slug ? `/products/${slug}` : `/products/${id}`;
  const imageUrl = typeof image === "string" ? image.trim() : "";
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
  }, [imageUrl]);

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
    setShowPopup(true);
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Please login to add items to your wishlist.");
      router.push("/customer/login");
      return;
    }

    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    if (!wishlist.find((item: any) => item.id === id)) {
      wishlist.push({ id, name: displayName, price: priceNum, image });
      localStorage.setItem("wishlist", JSON.stringify(wishlist));
      window.dispatchEvent(new Event("wishlistUpdated"));
      alert("Added to your wishlist.");
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
        {/* Image */}
        <div className="relative h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="object-fit group-hover:scale-110 transition-transform duration-500 w-full h-full"
              onError={(e) => {
                console.error("Image failed to load:", imageUrl);
                setImageError(true);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
              <span className="text-6xl">📦</span>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300"></div>
        </div>

        {/* Content */}
        <div className="py-1 px-3">
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
            className={`font-semibold text-gray-800 text-xl group-hover:text-orange-500 transition-colors text-center ${
              displayCategory ? "mb-1" : "mb-3"
            }`}
          >
            {displayName}
          </h3>

          {displayCategory && (
            <div className="text-sm text-gray-500 mb-3 text-center line-clamp-1">
              {displayCategory}
            </div>
          )}

          {/* Price */}
          <div className="mb-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl font-bold text-orange-500">
                ৳{priceNum.toFixed(2)}
              </span>
              {hasDiscount && originalPriceNum && (
                <span className="text-sm text-gray-400 line-through">
                  ৳{originalPriceNum.toFixed(2)}
                </span>
              )}
            </div>
            {hasDiscount && originalPriceNum && (
              <div className="text-xs text-green-600 font-semibold">
                You save ৳{(originalPriceNum - priceNum).toFixed(2)}
              </div>
            )}
          </div>
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
