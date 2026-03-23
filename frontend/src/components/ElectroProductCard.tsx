import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { FaStar, FaShoppingCart, FaHeart, FaEye, FaTag } from "react-icons/fa";
import { BACKEND_ORIGIN } from "@/config/backend";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { trackAddToCart } from "@/utils/gtm";
import { useFlyToCart } from "@/hooks/useFlyToCart";

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
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { fly } = useFlyToCart();
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

    // Fly-to-cart animation — starts from the button, grabs image from card
    const btn = e.currentTarget as HTMLElement;
    const card = btn.closest('.electro-product-card') as HTMLElement | null;
    fly(btn, card);

    addItem({
      id,
      name: displayName,
      name_en: displayName,
      price: priceNum,
      quantity: 1,
      image,
      category: displayCategory || undefined,
    });
    
    // Track add to cart event for GTM/Analytics
    trackAddToCart({
      id,
      name: displayName,
      price: priceNum,
      quantity: 1,
      category: displayCategory || undefined,
    });
    
    toast.success("Added to cart successfully!");
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();

    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    if (!wishlist.find((item: any) => item.id === id)) {
      wishlist.push({ id, name: displayName, price: priceNum, originalPrice: originalPriceNum, image });
      localStorage.setItem("wishlist", JSON.stringify(wishlist));
      window.dispatchEvent(new Event("wishlistUpdated"));
      toast.success("Added to your wishlist.");
    }
  };

  return (
    <div className="electro-product-card bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 group relative">
      {/* Discount Badge */}
      {discountPercent && discountPercent > 0 && (
        <div className="absolute top-2 right-2 z-10">
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
      <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={handleAddToWishlist}
          className="bg-white hover:bg-orange-500 hover:text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-110"
          title="Add to Wishlist"
          aria-label="Add to Wishlist"
        >
          <FaHeart size={16} />
        </button>
        <button
          className="bg-white hover:bg-orange-500 hover:text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-110"
          title="Quick View"
          aria-label="Quick View"
        >
          <FaEye size={16} />
        </button>
      </div>

      <Link href={productUrl}>
        {/* Image - 1:1 Aspect Ratio for Professional E-commerce Look */}
        <div className="relative w-full pt-[100%] bg-gray-50 overflow-hidden">
          {resolvedImageUrl && !imageError ? (
            <Image
              src={resolvedImageUrl}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain group-hover:scale-110 transition-transform duration-500"
              onError={() => {
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
          <div
            className={`text-center min-h-[2.5rem] sm:min-h-[3rem] lg:min-h-[3.5rem] ${
              displayCategory ? "mb-1" : "mb-2 sm:mb-3"
            }`}
          >
            {nameBn && (
              <h3 className="font-semibold text-gray-800 text-sm sm:text-base lg:text-xl group-hover:text-orange-500 transition-colors line-clamp-1">
                {nameBn}
              </h3>
            )}
            <p className="text-sm sm:text-base text-gray-600 font-medium line-clamp-1">
              {nameEn || name || "Product"}
            </p>
          </div>

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
          className="add-to-cart-btn w-full py-2.5 sm:py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-orange-500 bg-white text-orange-500 hover:!bg-orange-500 hover:!text-white hover:border-orange-500 active:bg-orange-600 active:text-white disabled:bg-gray-300 disabled:border-gray-300 disabled:text-gray-500"
        >
          <FaShoppingCart size={18} />
          <span>Add to Cart</span>
        </button>
      </div>
    </div>
  );
}
