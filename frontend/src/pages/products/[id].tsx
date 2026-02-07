import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useToast } from '@/contexts/ToastContext';
import { motion } from "framer-motion";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import ElectroProductCard from "@/components/ElectroProductCard";
import AddToCartPopup from "@/components/AddToCartPopup";
import apiClient from "@/services/api";
import { trackViewItem, trackAddToCart } from "@/utils/gtm";
import {
  FaStar,
  FaShoppingCart,
  FaHeart,
  FaShareAlt,
  FaChevronLeft,
  FaChevronRight,
  FaSearchPlus,
  FaWhatsapp,
  FaPhone,
  FaFacebookMessenger,
} from "react-icons/fa";

interface SizeVariant {
  name: string;
  price: number;
  stock?: number;
  sku_suffix?: string;
}

export default function ProductDetailsPage() {
  const router = useRouter();
  const toast = useToast();
  const { id } = router.query;
  const [product, setProduct] = useState<any>(null);
  const [productImages, setProductImages] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesPerView, setSlidesPerView] = useState(4);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [imageSlideIndex, setImageSlideIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "additional">(
    "description"
  );
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [selectedVariant, setSelectedVariant] = useState<SizeVariant | null>(null);

  const getSlidesPerView = () => {
    if (typeof window === "undefined") return 4;
    const width = window.innerWidth;
    if (width < 640) return 1;
    if (width < 768) return 2;
    if (width < 1024) return 3;
    return 4;
  };

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  useEffect(() => {
    if (!productImages || productImages.length === 0) return;
    const safeIndex = Math.min(
      Math.max(0, imageSlideIndex),
      productImages.length - 1
    );
    const next = productImages[safeIndex]?.image_url;
    if (next) setSelectedImage(next);
  }, [imageSlideIndex, productImages]);

  useEffect(() => {
    if (!productImages || productImages.length <= 1) return;
    const interval = setInterval(() => {
      setImageSlideIndex((prev) => (prev + 1) % productImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [productImages]);

  useEffect(() => {
    const update = () => setSlidesPerView(getSlidesPerView());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const maxSlide = Math.max(0, relatedProducts.length - slidesPerView);
    setCurrentSlide((prev) => Math.min(prev, maxSlide));
  }, [relatedProducts.length, slidesPerView]);

  const loadProduct = async () => {
    try {
      // Check if id is a number (ID) or string (slug)
      const isNumericId = !isNaN(Number(id));
      const endpoint = isNumericId
        ? `/products/${id}`
        : `/products/by-slug/${id}`;

      const response = await apiClient.get(endpoint);
      setProduct(response.data);
      
      // Track product view for GTM/Analytics
      trackViewItem({
        id: response.data.id,
        name: response.data.name_en || response.data.name,
        price: Number(response.data.sale_price || response.data.base_price || 0),
        category: response.data.category?.name || response.data.category?.name_en || undefined,
      });
      
      // Debug: Log description to see what format it's in
      // console.log("Product description_en:", response.data.description_en);

      // Load product images
      try {
        const imagesResponse = await apiClient.get(
          `/products/${response.data.id}/images`
        );
        console.log("Product images API response:", imagesResponse.data);
        let images = imagesResponse.data || [];
        console.log("Number of images loaded from API:", images.length);
        
        // Ensure the main product image_url is included in the gallery
        const mainImageUrl = response.data.image_url;
        if (mainImageUrl) {
          const mainImageExists = images.some(
            (img: any) => img.image_url === mainImageUrl
          );
          if (!mainImageExists) {
            // Add the main image as primary at the beginning
            images = [
              { id: -1, image_url: mainImageUrl, is_primary: true, display_order: -1 },
              ...images.map((img: any) => ({ ...img, is_primary: false }))
            ];
            console.log("Added main product image_url to gallery:", mainImageUrl);
          }
        }
        
        const sortedImages = [...images].sort((a: any, b: any) => {
          const aPrimary = a?.is_primary ? 1 : 0;
          const bPrimary = b?.is_primary ? 1 : 0;
          if (aPrimary !== bPrimary) return bPrimary - aPrimary;
          const aOrder =
            typeof a?.display_order === "number" ? a.display_order : 0;
          const bOrder =
            typeof b?.display_order === "number" ? b.display_order : 0;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (a?.id ?? 0) - (b?.id ?? 0);
        });
        setProductImages(sortedImages);
        console.log("Setting productImages to:", sortedImages);
        // Set the first image as selected, or fall back to the main image_url
        if (sortedImages.length > 0) {
          setImageSlideIndex(0);
          setSelectedImage(sortedImages[0].image_url);
          console.log("Selected image set to:", sortedImages[0].image_url);
        } else if (response.data.image_url) {
          console.log("No images in product_images, using fallback image_url:", response.data.image_url);
          setSelectedImage(response.data.image_url);
          // If no images in the images table but has image_url, create a temporary image array
          setProductImages([
            { id: 0, image_url: response.data.image_url, is_primary: true },
          ]);
          setImageSlideIndex(0);
        }
      } catch (error) {
        console.error("Error loading product images:", error);
        // Fallback to main image
        if (response.data.image_url) {
          setSelectedImage(response.data.image_url);
          setProductImages([
            { id: 0, image_url: response.data.image_url, is_primary: true },
          ]);
          setImageSlideIndex(0);
        }
      }

      // Load related products using the product ID
      try {
        const productId = response.data.id;
        const relatedResponse = await apiClient.get(
          `/products/related/${productId}`
        );
        setRelatedProducts(relatedResponse.data || []);
      } catch (error) {
        console.error("Error loading related products:", error);
      }
    } catch (error) {
      console.error("Error loading product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    // Create a unique ID that includes variant info
    const cartItemId = selectedVariant 
      ? `${product.id}-${selectedVariant.name}` 
      : product.id.toString();
    
    const existingItem = cart.find((item: any) => item.cartItemId === cartItemId || (item.id === product.id && !item.variant && !selectedVariant));

    const itemPrice = selectedVariant ? selectedVariant.price : Number(product.base_price);

    if (existingItem && existingItem.cartItemId === cartItemId) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        cartItemId: cartItemId,
        name: selectedVariant 
          ? `${product.name_en} (${selectedVariant.name})` 
          : product.name_en,
        name_en: product.name_en,
        price: itemPrice,
        quantity: quantity,
        image: product.image_url,
        variant: selectedVariant ? selectedVariant.name : null,
        variantDetails: selectedVariant || null,
        category: product.category?.name || product.category?.name_en || undefined,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    
    // Track add to cart event for GTM/Analytics
    trackAddToCart({
      id: product.id,
      name: selectedVariant 
        ? `${product.name_en} (${selectedVariant.name})` 
        : product.name_en,
      price: itemPrice,
      quantity: quantity,
      category: product.category?.name || product.category?.name_en || undefined,
      variant: selectedVariant?.name,
    });
    
    setShowCartPopup(true);
  };

  const handleBuyNow = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    // Create a unique ID that includes variant info
    const cartItemId = selectedVariant 
      ? `${product.id}-${selectedVariant.name}` 
      : product.id.toString();
    
    const existingItem = cart.find((item: any) => item.cartItemId === cartItemId || (item.id === product.id && !item.variant && !selectedVariant));

    const itemPrice = selectedVariant ? selectedVariant.price : Number(product.base_price);

    if (existingItem && existingItem.cartItemId === cartItemId) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        cartItemId: cartItemId,
        name: selectedVariant 
          ? `${product.name_en} (${selectedVariant.name})` 
          : product.name_en,
        name_en: product.name_en,
        price: itemPrice,
        quantity: quantity,
        image: product.image_url,
        variant: selectedVariant ? selectedVariant.name : null,
        variantDetails: selectedVariant || null,
        category: product.category?.name || product.category?.name_en || undefined,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    router.push("/checkout");
  };

  const handleAddToWishlist = () => {
    if (!product) return;
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.warning("Please login to add items to your wishlist.");
      router.push("/customer/login");
      return;
    }

    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    if (!wishlist.find((item: any) => item.id === product.id)) {
      wishlist.push({
        id: product.id,
        name: product.name_en || product.name_bn || product.name,
        price: product.base_price || product.price,
        image: product.image_url,
      });
      localStorage.setItem("wishlist", JSON.stringify(wishlist));
      window.dispatchEvent(new Event("wishlistUpdated"));
      toast.success("Added to your wishlist.");
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <ElectroNavbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-xl">Loading product...</p>
        </div>
        <ElectroFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <ElectroNavbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">
            The product you're looking for doesn't exist.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600"
          >
            Go to Homepage
          </button>
        </div>
        <ElectroFooter />
      </div>
    );
  }

  const displayName = product.name_en || product.name_bn || "Product";
  const basePrice = Number(product.base_price || product.price || 0);
  // Use selected variant price if a variant is selected, otherwise use base price
  const price = selectedVariant ? selectedVariant.price : basePrice;
  const additionalInfo = product.additional_info || {};
  const sizeVariants: SizeVariant[] = Array.isArray(product.size_variants) ? product.size_variants : [];

  const maxRelatedSlide = Math.max(0, relatedProducts.length - slidesPerView);
  const relatedSlideStepPercent = 100 / slidesPerView;

  const supportPhone = (process.env.NEXT_PUBLIC_SUPPORT_PHONE || "").trim();
  const supportWhatsApp = (
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || ""
  ).trim();
  const supportMessenger = (
    process.env.NEXT_PUBLIC_SUPPORT_MESSENGER || ""
  ).trim();
  const canShowContacts = Boolean(
    supportPhone || supportWhatsApp || supportMessenger
  );

  const getCurrentUrl = () => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  };

  const handleWhatsAppContact = () => {
    const digits = supportWhatsApp.replace(/\D/g, "");
    if (!digits) return;
    const message = `Hello, I have a question about: ${displayName}\n${getCurrentUrl()}`;
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleMessengerContact = () => {
    if (!supportMessenger) return;
    window.open(supportMessenger, "_blank", "noopener,noreferrer");
  };

  const goPrevImage = () => {
    if (!productImages || productImages.length <= 1) return;
    setImageSlideIndex(
      (prev) => (prev - 1 + productImages.length) % productImages.length
    );
  };

  const goNextImage = () => {
    if (!productImages || productImages.length <= 1) return;
    setImageSlideIndex((prev) => (prev + 1) % productImages.length);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4 lg:px-64 py-8"
        >
          {/* Breadcrumb */}
          <div className="text-sm text-gray-600 mb-6">
            <span
              onClick={() => router.push("/")}
              className="cursor-pointer hover:text-orange-500"
            >
              Home
            </span>
            <span className="mx-2">/</span>
            <span
              onClick={() => router.push("/products")}
              className="cursor-pointer hover:text-orange-500"
            >
              Products
            </span>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{displayName}</span>
          </div>

          {/* Product Details */}
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Product Images */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {/* Desktop: Thumbnails on Left + Main Image */}
                <div className="hidden md:flex gap-4">
                  {/* Vertical Thumbnail Bar (Left Side) */}
                  {productImages.length >= 1 && (
                    <div className="flex flex-col gap-2 w-20 flex-shrink-0">
                      {productImages.map((img, index) => (
                        <div
                          key={img.id || index}
                          onClick={() => {
                            setImageSlideIndex(index);
                            setSelectedImage(img.image_url);
                          }}
                          onMouseEnter={() => {
                            setImageSlideIndex(index);
                            setSelectedImage(img.image_url);
                          }}
                          className={`relative bg-gray-50 rounded-lg overflow-hidden aspect-square cursor-pointer border-2 transition-all duration-200 hover:shadow-md ${
                            selectedImage === img.image_url
                              ? "border-orange-500 shadow-md"
                              : "border-gray-200 hover:border-orange-300"
                          }`}
                        >
                          <img
                            src={img.image_url}
                            alt={`${displayName} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {selectedImage === img.image_url && (
                            <div className="absolute inset-0 bg-orange-500/10" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Main Image with Zoom */}
                  <div className="flex-1">
                    <div
                      className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-zoom-in"
                      onMouseEnter={() => setShowZoom(true)}
                      onMouseLeave={() => setShowZoom(false)}
                      onMouseMove={handleMouseMove}
                    >
                      {selectedImage ? (
                        <>
                          <img
                            src={selectedImage}
                            alt={displayName}
                            className="w-full h-full object-cover transition-transform duration-300"
                          />
                          {/* Zoom Overlay */}
                          {showZoom && (
                            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                              <div
                                className="w-full h-full bg-no-repeat"
                                style={{
                                  backgroundImage: `url(${selectedImage})`,
                                  backgroundSize: "200%",
                                  backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                                }}
                              />
                            </div>
                          )}
                          {/* Zoom Icon */}
                          <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
                            <FaSearchPlus className="text-gray-600" />
                          </div>

                          {/* Slider Controls */}
                          {productImages.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  goPrevImage();
                                }}
                                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 p-3 rounded-full shadow-lg transition-all"
                                aria-label="Previous image"
                              >
                                <FaChevronLeft size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  goNextImage();
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 p-3 rounded-full shadow-lg transition-all"
                                aria-label="Next image"
                              >
                                <FaChevronRight size={18} />
                              </button>
                            </>
                          )}

                          {/* Image Counter Badge */}
                          {productImages.length > 1 && (
                            <div className="absolute bottom-4 left-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                              {imageSlideIndex + 1} / {productImages.length}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <FaShoppingCart className="text-6xl mx-auto mb-2" />
                            <p>No Image</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile: Main Image + Horizontal Thumbnails Below */}
                <div className="md:hidden">
                  {/* Main Image with Zoom */}
                  <div
                    className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square mb-4 cursor-zoom-in"
                    onMouseEnter={() => setShowZoom(true)}
                    onMouseLeave={() => setShowZoom(false)}
                    onMouseMove={handleMouseMove}
                  >
                    {selectedImage ? (
                      <>
                        <img
                          src={selectedImage}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                        {/* Zoom Overlay */}
                        {showZoom && (
                          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                            <div
                              className="w-full h-full bg-no-repeat"
                              style={{
                                backgroundImage: `url(${selectedImage})`,
                                backgroundSize: "200%",
                                backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                              }}
                            />
                          </div>
                        )}
                        {/* Zoom Icon */}
                        <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
                          <FaSearchPlus className="text-gray-600" />
                        </div>

                        {/* Slider Controls - only show arrows if more than 1 image */}
                        {productImages.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                goPrevImage();
                              }}
                              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 p-3 rounded-full shadow-lg transition-all"
                              aria-label="Previous image"
                            >
                              <FaChevronLeft size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                goNextImage();
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 p-3 rounded-full shadow-lg transition-all"
                              aria-label="Next image"
                            >
                              <FaChevronRight size={18} />
                            </button>
                          </>
                        )}

                        {/* Image Counter Badge - only show if more than 1 image */}
                        {productImages.length > 1 && (
                          <div className="absolute bottom-4 left-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                            {imageSlideIndex + 1} / {productImages.length}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <FaShoppingCart className="text-6xl mx-auto mb-2" />
                          <p>No Image</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Horizontal Thumbnail Images (Mobile) */}
                  {productImages.length >= 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {productImages.map((img, index) => (
                        <div
                          key={img.id || index}
                          onClick={() => {
                            setImageSlideIndex(index);
                            setSelectedImage(img.image_url);
                          }}
                          className={`relative bg-gray-100 rounded-lg overflow-hidden w-16 h-16 flex-shrink-0 cursor-pointer border-2 transition-all ${
                            selectedImage === img.image_url
                              ? "border-orange-500 shadow-md"
                              : "border-transparent hover:border-gray-300"
                          }`}
                        >
                          <img
                            src={img.image_url}
                            alt={`${displayName} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Product Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                  {displayName}
                </h1>

                {/* Rating - TODO: Uncomment when review system is implemented
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400 mr-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar key={star} className="text-sm" />
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm">(125 reviews)</span>
                </div>
                */}

                {/* Price */}
                <div className="mb-6">
                  <div className="text-3xl lg:text-4xl font-bold text-orange-500 mb-2">
                    ৳{price.toFixed(2)}
                  </div>
                  {selectedVariant && basePrice !== selectedVariant.price && (
                    <p className="text-gray-500 text-sm line-through">
                      Base price: ৳{basePrice.toFixed(2)}
                    </p>
                  )}
                  {product.sku && (
                    <p className="text-gray-600 text-sm">
                      SKU: {product.sku}{selectedVariant?.sku_suffix ? `-${selectedVariant.sku_suffix}` : ''}
                    </p>
                  )}
                </div>

                {/* Size Variants */}
                {sizeVariants.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-3">
                      Select Size
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {/* Base option (no variant selected) */}
                      <button
                        onClick={() => setSelectedVariant(null)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 font-medium ${
                          selectedVariant === null
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 hover:border-orange-300 text-gray-700'
                        }`}
                      >
                        <span className="block">Default</span>
                        <span className="block text-sm text-gray-500">৳{basePrice.toFixed(0)}</span>
                      </button>
                      {sizeVariants.map((variant, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedVariant(variant)}
                          className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 font-medium ${
                            selectedVariant?.name === variant.name
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-300 hover:border-orange-300 text-gray-700'
                          } ${
                            variant.stock !== undefined && variant.stock <= 0
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                          disabled={variant.stock !== undefined && variant.stock <= 0}
                        >
                          <span className="block">{variant.name}</span>
                          <span className="block text-sm text-gray-500">৳{variant.price.toFixed(0)}</span>
                          {variant.stock !== undefined && variant.stock <= 0 && (
                            <span className="block text-xs text-red-500">Out of Stock</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock Status */}
                <div className="mb-6">
                  <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    In Stock
                  </span>
                </div>

                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-12 h-10 border border-gray-300 rounded-lg text-center"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 border-2 border-orange-500 bg-white text-orange-500 py-2.5 rounded-lg hover:!bg-orange-500 hover:text-white flex items-center justify-center space-x-2 font-semibold transition-all duration-300"
                  >
                    <FaShoppingCart />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 bg-orange-500 text-white py-2.5 rounded-lg hover:bg-orange-600 flex items-center justify-center space-x-2 font-semibold transition-all duration-300"
                  >
                    <FaShoppingCart />
                    <span>Buy Now</span>
                  </button>
                  <button
                    onClick={handleAddToWishlist}
                    className="w-full sm:w-12 h-12 border-2 border-orange-500 text-orange-500 rounded-lg hover:!bg-orange-500 hover:text-white flex items-center justify-center sm:justify-center space-x-2 sm:space-x-0 transition-all duration-300"
                  >
                    <FaHeart />
                    <span className="sm:hidden">Add to Wishlist</span>
                  </button>
                  <button className="w-full sm:w-12 h-12 border-2 border-orange-500 text-orange-500 rounded-lg hover:!bg-orange-500 hover:text-white flex items-center justify-center sm:justify-center space-x-2 sm:space-x-0 transition-all duration-300">
                    <FaShareAlt />
                    <span className="sm:hidden">Share Product</span>
                  </button>
                </div>

                {/* Contact / Social Buttons */}
                {canShowContacts && (
                  <div className="flex flex-col sm:flex-row gap-2 mb-6">
                    {supportWhatsApp && (
                      <button
                        type="button"
                        onClick={handleWhatsAppContact}
                        className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-semibold transition-all duration-300"
                      >
                        <FaWhatsapp />
                        <span>WhatsApp</span>
                      </button>
                    )}
                    {supportPhone && (
                      <a
                        href={`tel:${supportPhone}`}
                        className="flex-1 border-2 border-gray-300 text-gray-800 py-2.5 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 font-semibold transition-all duration-300"
                      >
                        <FaPhone />
                        <span>Call</span>
                      </a>
                    )}
                    {supportMessenger && (
                      <button
                        type="button"
                        onClick={handleMessengerContact}
                        className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-semibold transition-all duration-300"
                      >
                        <FaFacebookMessenger />
                        <span>Messenger</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Additional Info */}
                <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                  {product.category_name && (
                    <p>
                      <span className="font-semibold">Category:</span>{" "}
                      {product.category_name}
                    </p>
                  )}
                  {product.brand && (
                    <p>
                      <span className="font-semibold">Brand:</span>{" "}
                      {product.brand}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Tabs Section - Description & Additional Information */}
            <div className="mt-8 border-t pt-8">
              {/* Tab Headers */}
              <div className="flex border-b mb-6">
                <button
                  onClick={() => setActiveTab("description")}
                  className={`px-6 py-3 font-semibold transition ${
                    activeTab === "description"
                      ? "border-b-2 border-orange-500 text-orange-500"
                      : "text-gray-600 hover:text-orange-500"
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab("additional")}
                  className={`px-6 py-3 font-semibold transition ${
                    activeTab === "additional"
                      ? "border-b-2 border-orange-500 text-orange-500"
                      : "text-gray-600 hover:text-orange-500"
                  }`}
                >
                  Additional Information
                </button>
              </div>

              {/* Tab Content */}
              <div className="min-h-[200px]">
                {activeTab === "description" && (
                  <div className="prose max-w-none">
                    <h3 className="text-xl font-semibold mb-4">
                      Product Description
                    </h3>
                    {product.description_en ? (
                      // Check if description contains HTML tags
                      /<[a-z][\s\S]*>/i.test(product.description_en) ? (
                        // Render as HTML if it contains HTML tags
                        <div 
                          className="text-gray-700 leading-relaxed prose prose-sm sm:prose lg:prose-lg max-w-none
                            [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 
                            [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4
                            [&>li]:mb-2 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-3
                            [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3
                            [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-2
                            [&>strong]:font-bold [&>em]:italic
                            [&>a]:text-orange-500 [&>a]:underline"
                          dangerouslySetInnerHTML={{ __html: product.description_en }}
                        />
                      ) : (
                        // Render as plain text with preserved line breaks
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {product.description_en}
                        </p>
                      )
                    ) : (
                      <p className="text-gray-500 italic">
                        No description available for this product.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "additional" && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Additional Information
                    </h3>
                    {Object.keys(additionalInfo).length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[300px]">
                          <tbody>
                            {Object.entries(additionalInfo).map(
                              ([key, value]) => (
                                <tr key={key} className="border-b">
                                  <td className="py-2 lg:py-3 px-2 lg:px-4 bg-gray-50 font-semibold text-gray-700 capitalize text-sm lg:text-base break-words">
                                    {key.replace(/_/g, " ")}
                                  </td>
                                  <td className="py-2 lg:py-3 px-2 lg:px-4 text-gray-600 text-sm lg:text-base break-words">
                                    {typeof value === "object"
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">
                        No additional information available for this product.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recommended Products Slider */}
          {relatedProducts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Recommended Products</h2>
              <div className="relative">
                {/* Navigation Arrows */}
                {relatedProducts.length > slidesPerView && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentSlide(Math.max(0, currentSlide - 1))
                      }
                      disabled={currentSlide === 0}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white hover:bg-orange-500 text-gray-700 hover:text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Previous products"
                    >
                      <FaChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentSlide(
                          Math.min(maxRelatedSlide, currentSlide + 1)
                        )
                      }
                      disabled={currentSlide >= maxRelatedSlide}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white hover:bg-orange-500 text-gray-700 hover:text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Next products"
                    >
                      <FaChevronRight size={20} />
                    </button>
                  </>
                )}

                {/* Products Slider */}
                <div className="overflow-hidden">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{
                      transform: `translateX(-${currentSlide * relatedSlideStepPercent}%)`,
                    }}
                  >
                    {relatedProducts.map((relatedProduct) => (
                      <div
                        key={relatedProduct.id}
                        className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 flex-shrink-0 px-3"
                      >
                        <ElectroProductCard
                          id={relatedProduct.id}
                          slug={relatedProduct.slug}
                          name={relatedProduct.name_en || relatedProduct.name}
                          nameEn={relatedProduct.name_en}
                          nameBn={relatedProduct.name_bn}
                          categoryName={
                            relatedProduct.category_name ||
                            relatedProduct.category?.name_en ||
                            relatedProduct.category?.name
                          }
                          price={
                            relatedProduct.base_price || relatedProduct.price
                          }
                          image={relatedProduct.image_url}
                          rating={5}
                          reviews={0}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Add to Cart Popup */}
        <AddToCartPopup
          isOpen={showCartPopup}
          onClose={() => setShowCartPopup(false)}
          product={product}
        />
      </div>
      <ElectroFooter />
    </div>
  );
}
