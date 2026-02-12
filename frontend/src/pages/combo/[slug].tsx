import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { combos } from '@/services/api';
import apiClient from '@/services/api';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import ElectroProductCard from '@/components/ElectroProductCard';
import AddToCartPopup from '@/components/AddToCartPopup';
import { 
  FaShoppingCart, 
  FaTag, 
  FaBoxOpen,
  FaPercent,
  FaCheck,
  FaClock,
  FaHeart,
  FaShareAlt,
  FaChevronLeft,
  FaChevronRight,
  FaSearchPlus,
  FaWhatsapp,
  FaPhone,
  FaFacebookMessenger,
} from 'react-icons/fa';

interface Product {
  id: number;
  name_en: string;
  name_bn?: string;
  slug?: string;
  base_price: number;
  image_url?: string;
}

interface ComboDeal {
  id: number;
  name: string;
  slug: string;
  description?: string;
  discount_percentage: number;
  combo_price?: number;
  image_url?: string;
  products?: Product[];
  expires_at?: string;
}

// Helper function to add item to localStorage cart
const addToLocalCart = (item: { id: number; name: string; price: number; quantity: number; image: string; slug: string }) => {
  const stored = localStorage.getItem('cart');
  const cart = stored ? JSON.parse(stored) : [];
  
  // Check if item already exists
  const existingIndex = cart.findIndex((cartItem: any) => cartItem.id === item.id);
  if (existingIndex >= 0) {
    cart[existingIndex].quantity += item.quantity;
  } else {
    cart.push(item);
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  
  // Dispatch custom event for cart update
  window.dispatchEvent(new Event('cartUpdated'));
};

export default function ComboDetailPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [combo, setCombo] = useState<ComboDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Add to cart popup
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [cartProduct, setCartProduct] = useState<any>(null);

  // Image gallery
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [imageSlideIndex, setImageSlideIndex] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

  // Recommended products
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesPerView, setSlidesPerView] = useState(4);

  // Description tab
  const [activeTab, setActiveTab] = useState<'description' | 'products'>('description');

  const getSlidesPerView = () => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width < 640) return 1;
    if (width < 768) return 2;
    if (width < 1024) return 3;
    return 4;
  };

  useEffect(() => {
    const update = () => setSlidesPerView(getSlidesPerView());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const maxSlide = Math.max(0, recommendedProducts.length - slidesPerView);
    setCurrentSlide((prev) => Math.min(prev, maxSlide));
  }, [recommendedProducts.length, slidesPerView]);

  useEffect(() => {
    if (slug && typeof slug === 'string') {
      loadCombo(slug);
    }
  }, [slug]);

  const loadCombo = async (comboSlug: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await combos.getBySlug(comboSlug);
      if (data) {
        setCombo(data);
        
        // Set initial image
        const mainImage = data.image_url || data.products?.[0]?.image_url || '';
        setSelectedImage(mainImage);
        
        // Load recommended products
        loadRecommendedProducts(data);
      } else {
        setError('Combo not found');
      }
    } catch (err) {
      console.error('Failed to load combo:', err);
      setError('Failed to load combo details');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendedProducts = async (comboData: ComboDeal) => {
    try {
      if (comboData.products && comboData.products.length > 0) {
        const productId = comboData.products[0].id;
        const response = await apiClient.get(`/products/related/${productId}`);
        const comboProductIds = comboData.products.map(p => p.id);
        const filtered = (response.data || []).filter((p: any) => !comboProductIds.includes(p.id));
        setRecommendedProducts(filtered.length > 0 ? filtered : response.data || []);
      }
    } catch (err) {
      console.error('Failed to load recommended products:', err);
      try {
        const response = await apiClient.get('/products?limit=8&status=active');
        const products = response.data?.data || response.data || [];
        setRecommendedProducts(products.slice(0, 8));
      } catch {
        // Silently fail
      }
    }
  };

  // Build gallery images from combo image + product images
  const getGalleryImages = () => {
    if (!combo) return [];
    const images: { id: number; image_url: string; label?: string }[] = [];
    if (combo.image_url) {
      images.push({ id: -1, image_url: combo.image_url, label: 'Combo' });
    }
    if (combo.products) {
      combo.products.forEach(product => {
        if (product.image_url) {
          images.push({ id: product.id, image_url: product.image_url, label: product.name_en });
        }
      });
    }
    return images;
  };

  const galleryImages = getGalleryImages();

  // Calculate total price of all products
  const calculateTotalPrice = () => {
    if (!combo?.products) return 0;
    return combo.products.reduce((sum, p) => sum + (Number(p.base_price) || 0), 0);
  };

  // Calculate discounted price
  const calculateComboPrice = () => {
    if (combo?.combo_price) return Number(combo.combo_price);
    const totalPrice = calculateTotalPrice();
    const discount = combo?.discount_percentage || 0;
    return totalPrice - (totalPrice * discount / 100);
  };

  // Handle add all products to cart
  const handleAddAllToCart = () => {
    if (!combo?.products) return;
    
    combo.products.forEach(product => {
      addToLocalCart({
        id: product.id,
        name: product.name_en,
        price: Number(product.base_price),
        quantity: quantity,
        image: product.image_url || '',
        slug: product.slug || ''
      });
    });
    
    setCartProduct({
      id: combo.id,
      name: combo.name,
      price: calculateComboPrice(),
      image: combo.image_url || combo.products[0]?.image_url || '',
      isCombo: true,
      productCount: combo.products.length
    });
    setShowCartPopup(true);
  };

  // Handle buy now
  const handleBuyNow = () => {
    handleAddAllToCart();
    router.push('/checkout');
  };

  // Handle add to wishlist
  const handleAddToWishlist = () => {
    if (!combo) return;
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/customer/login');
      return;
    }
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    const comboWishlistId = `combo-${combo.id}`;
    if (!wishlist.find((item: any) => item.id === comboWishlistId)) {
      wishlist.push({
        id: comboWishlistId,
        name: combo.name,
        price: calculateComboPrice(),
        image: combo.image_url || combo.products?.[0]?.image_url || '',
      });
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
      window.dispatchEvent(new Event('wishlistUpdated'));
    }
  };

  // Handle add single product to cart
  const handleAddProductToCart = (product: Product) => {
    addToLocalCart({
      id: product.id,
      name: product.name_en,
      price: Number(product.base_price),
      quantity: 1,
      image: product.image_url || '',
      slug: product.slug || ''
    });
    setCartProduct({
      id: product.id,
      name: product.name_en,
      price: Number(product.base_price),
      image: product.image_url || ''
    });
    setShowCartPopup(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const goPrevImage = () => {
    if (galleryImages.length <= 1) return;
    const newIndex = (imageSlideIndex - 1 + galleryImages.length) % galleryImages.length;
    setImageSlideIndex(newIndex);
    setSelectedImage(galleryImages[newIndex].image_url);
  };

  const goNextImage = () => {
    if (galleryImages.length <= 1) return;
    const newIndex = (imageSlideIndex + 1) % galleryImages.length;
    setImageSlideIndex(newIndex);
    setSelectedImage(galleryImages[newIndex].image_url);
  };

  // Contact support
  const supportPhone = (process.env.NEXT_PUBLIC_SUPPORT_PHONE || '').trim();
  const supportWhatsApp = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '').trim();
  const supportMessenger = (process.env.NEXT_PUBLIC_SUPPORT_MESSENGER || '').trim();
  const canShowContacts = Boolean(supportPhone || supportWhatsApp || supportMessenger);

  const getCurrentUrl = () => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  };

  const handleWhatsAppContact = () => {
    const digits = supportWhatsApp.replace(/\D/g, '');
    if (!digits) return;
    const message = `Hello, I have a question about: ${combo?.name}\n${getCurrentUrl()}`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleMessengerContact = () => {
    if (!supportMessenger) return;
    window.open(supportMessenger, '_blank', 'noopener,noreferrer');
  };

  // Auto-slide images
  useEffect(() => {
    if (galleryImages.length <= 1) return;
    const interval = setInterval(() => {
      setImageSlideIndex((prev) => {
        const next = (prev + 1) % galleryImages.length;
        setSelectedImage(galleryImages[next].image_url);
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [galleryImages.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ElectroNavbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-600">Loading combo details...</p>
        </div>
        <ElectroFooter />
      </div>
    );
  }

  if (error || !combo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ElectroNavbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <FaBoxOpen className="text-gray-300 text-6xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{error || 'Combo not found'}</h1>
          <p className="text-gray-600 mb-6">The combo deal you are looking for does not exist or has expired.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
        <ElectroFooter />
      </div>
    );
  }

  const totalPrice = calculateTotalPrice();
  const comboPrice = calculateComboPrice();
  const savings = totalPrice - comboPrice;
  const discountPercent = totalPrice > 0 ? Math.round((savings / totalPrice) * 100) : 0;
  const maxRelatedSlide = Math.max(0, recommendedProducts.length - slidesPerView);
  const relatedSlideStepPercent = 100 / slidesPerView;

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />
      
      <Head>
        <title>{combo.name} - Combo Deal | TrustCart</title>
        <meta name="description" content={combo.description || `${combo.name} combo deal - Save ৳${savings.toFixed(0)}`} />
      </Head>

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
              onClick={() => router.push('/')} 
              className="cursor-pointer hover:text-orange-500"
            >
              Home
            </span>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{combo.name}</span>
          </div>

          {/* Main Product-style Content */}
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left - Image Gallery (same style as product page) */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {/* Desktop: Thumbnails on Left + Main Image */}
                <div className="hidden md:flex gap-4">
                  {/* Vertical Thumbnail Bar */}
                  {galleryImages.length >= 1 && (
                    <div className="flex flex-col gap-2 w-20 flex-shrink-0">
                      {galleryImages.map((img, index) => (
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
                              ? 'border-orange-500 shadow-md'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          <img
                            src={img.image_url}
                            alt={img.label || `Image ${index + 1}`}
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
                            alt={combo.name}
                            className="w-full h-full object-cover transition-transform duration-300"
                          />
                          {showZoom && (
                            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                              <div
                                className="w-full h-full bg-no-repeat"
                                style={{
                                  backgroundImage: `url(${selectedImage})`,
                                  backgroundSize: '200%',
                                  backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                                }}
                              />
                            </div>
                          )}
                          <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
                            <FaSearchPlus className="text-gray-600" />
                          </div>
                          {discountPercent > 0 && (
                            <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                              <FaPercent className="text-sm" />
                              {discountPercent}% OFF
                            </div>
                          )}
                          {galleryImages.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); goPrevImage(); }}
                                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 p-3 rounded-full shadow-lg transition-all"
                                aria-label="Previous image"
                              >
                                <FaChevronLeft size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); goNextImage(); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 p-3 rounded-full shadow-lg transition-all"
                                aria-label="Next image"
                              >
                                <FaChevronRight size={18} />
                              </button>
                            </>
                          )}
                          {galleryImages.length > 1 && (
                            <div className="absolute bottom-4 left-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                              {imageSlideIndex + 1} / {galleryImages.length}
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
                  <div
                    className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square mb-4 cursor-zoom-in"
                    onMouseEnter={() => setShowZoom(true)}
                    onMouseLeave={() => setShowZoom(false)}
                    onMouseMove={handleMouseMove}
                  >
                    {selectedImage ? (
                      <>
                        <img src={selectedImage} alt={combo.name} className="w-full h-full object-cover" />
                        {showZoom && (
                          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                            <div
                              className="w-full h-full bg-no-repeat"
                              style={{
                                backgroundImage: `url(${selectedImage})`,
                                backgroundSize: '200%',
                                backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                              }}
                            />
                          </div>
                        )}
                        <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
                          <FaSearchPlus className="text-gray-600" />
                        </div>
                        {discountPercent > 0 && (
                          <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                            <FaPercent className="text-sm" />
                            {discountPercent}% OFF
                          </div>
                        )}
                        {galleryImages.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); goPrevImage(); }}
                              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 p-3 rounded-full shadow-lg transition-all"
                            >
                              <FaChevronLeft size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); goNextImage(); }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 p-3 rounded-full shadow-lg transition-all"
                            >
                              <FaChevronRight size={18} />
                            </button>
                          </>
                        )}
                        {galleryImages.length > 1 && (
                          <div className="absolute bottom-4 left-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                            {imageSlideIndex + 1} / {galleryImages.length}
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

                  {galleryImages.length >= 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {galleryImages.map((img, index) => (
                        <div
                          key={img.id || index}
                          onClick={() => {
                            setImageSlideIndex(index);
                            setSelectedImage(img.image_url);
                          }}
                          className={`relative bg-gray-100 rounded-lg overflow-hidden w-16 h-16 flex-shrink-0 cursor-pointer border-2 transition-all ${
                            selectedImage === img.image_url
                              ? 'border-orange-500 shadow-md'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img src={img.image_url} alt={img.label || `Image ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Right - Combo Info (product page style) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {/* Combo Name */}
                <div className="mb-4">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{combo.name}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <FaTag className="text-xs" /> Combo Deal
                    </span>
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <FaBoxOpen className="text-xs" /> {combo.products?.length || 0} Products
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="text-3xl lg:text-4xl font-bold text-orange-500 mb-1">
                    ৳{comboPrice.toFixed(2)}
                  </div>
                  {savings > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 line-through text-lg">৳{totalPrice.toFixed(2)}</span>
                      <span className="text-green-600 font-semibold text-sm">Save ৳{savings.toFixed(0)} ({discountPercent}% off)</span>
                    </div>
                  )}
                </div>

                {/* Stock / Expiry Status */}
                <div className="mb-6 flex flex-wrap gap-2">
                  <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    <FaCheck className="inline mr-1" /> In Stock
                  </span>
                  {combo.expires_at && (
                    <span className="inline-block px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                      <FaClock className="inline mr-1" /> Expires: {new Date(combo.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2">Quantity</label>
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
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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
                    onClick={handleAddAllToCart}
                    disabled={!combo.products || combo.products.length === 0}
                    className="flex-1 border-2 border-orange-500 bg-white text-orange-500 py-2.5 rounded-lg hover:!bg-orange-500 hover:text-white flex items-center justify-center space-x-2 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaShoppingCart />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={!combo.products || combo.products.length === 0}
                    className="flex-1 bg-orange-500 text-white py-2.5 rounded-lg hover:bg-orange-600 flex items-center justify-center space-x-2 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <span className="sm:hidden">Share</span>
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

                {/* Quick Info */}
                <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold">Products Included:</span>{' '}
                    {combo.products?.map(p => p.name_en).join(', ') || 'N/A'}
                  </p>
                  {combo.discount_percentage > 0 && (
                    <p>
                      <span className="font-semibold">Discount:</span>{' '}
                      {combo.discount_percentage}% off total price
                    </p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Tabs Section - Description & Products Included */}
            <div className="mt-8 border-t pt-8">
              <div className="flex border-b mb-6">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`px-6 py-3 font-semibold transition ${
                    activeTab === 'description'
                      ? 'border-b-2 border-orange-500 text-orange-500'
                      : 'text-gray-600 hover:text-orange-500'
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-6 py-3 font-semibold transition ${
                    activeTab === 'products'
                      ? 'border-b-2 border-orange-500 text-orange-500'
                      : 'text-gray-600 hover:text-orange-500'
                  }`}
                >
                  Products Included ({combo.products?.length || 0})
                </button>
              </div>

              <div className="min-h-[200px]">
                {activeTab === 'description' && (
                  <div className="prose max-w-none">
                    <h3 className="text-xl font-semibold mb-4">Combo Description</h3>
                    {combo.description ? (
                      /<[a-z][\s\S]*>/i.test(combo.description) ? (
                        <div
                          className="text-gray-700 leading-relaxed prose prose-sm sm:prose lg:prose-lg max-w-none
                            [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4
                            [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4
                            [&>li]:mb-2 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-3
                            [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3
                            [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-2
                            [&>strong]:font-bold [&>em]:italic
                            [&>a]:text-orange-500 [&>a]:underline"
                          dangerouslySetInnerHTML={{ __html: combo.description }}
                        />
                      ) : (
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{combo.description}</p>
                      )
                    ) : (
                      <p className="text-gray-500 italic">No description available for this combo deal.</p>
                    )}

                    {/* Why Buy Section */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-orange-100 p-3 rounded-full flex-shrink-0">
                          <FaPercent className="text-orange-500 text-xl" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1">Save More</h4>
                          <p className="text-gray-600 text-sm">Get {discountPercent}% discount when you buy together</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="bg-green-100 p-3 rounded-full flex-shrink-0">
                          <FaCheck className="text-green-500 text-xl" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1">Curated Selection</h4>
                          <p className="text-gray-600 text-sm">Products carefully selected to complement each other</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
                          <FaShoppingCart className="text-blue-500 text-xl" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1">Convenient</h4>
                          <p className="text-gray-600 text-sm">Add all products with a single click</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'products' && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <FaTag className="text-orange-500" />
                      Products in This Combo
                    </h3>
                    {combo.products && combo.products.length > 0 ? (
                      <div className="space-y-4">
                        {combo.products.map((product) => {
                          const price = Number(product.base_price) || 0;
                          return (
                            <div
                              key={product.id}
                              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-white">
                                <img
                                  src={product.image_url || 'https://via.placeholder.com/80'}
                                  alt={product.name_en}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4
                                  className="font-semibold text-gray-800 cursor-pointer hover:text-orange-500 transition-colors truncate"
                                  onClick={() => router.push(`/products/${product.slug || product.id}`)}
                                >
                                  {product.name_en}
                                </h4>
                                {product.name_bn && (
                                  <p className="text-sm text-gray-500">{product.name_bn}</p>
                                )}
                                <p className="text-orange-500 font-bold mt-1">৳{price.toFixed(2)}</p>
                              </div>
                              <button
                                onClick={() => handleAddProductToCart(product)}
                                className="flex-shrink-0 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center gap-1"
                              >
                                <FaShoppingCart className="text-xs" />
                                Add
                              </button>
                            </div>
                          );
                        })}
                        
                        {/* Total */}
                        <div className="border-t pt-4 mt-4">
                          <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-gray-600">Total (individual):</span>
                            <span className="text-gray-400 line-through">৳{totalPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-800">Combo Price:</span>
                            <span className="text-xl font-bold text-orange-500">৳{comboPrice.toFixed(2)}</span>
                          </div>
                          {savings > 0 && (
                            <div className="flex justify-between items-center text-sm mt-1">
                              <span className="text-green-600 font-medium">Your Savings:</span>
                              <span className="text-green-600 font-semibold">৳{savings.toFixed(2)} ({discountPercent}% off)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No products in this combo yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recommended Products Slider */}
          {recommendedProducts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Recommended Products</h2>
              <div className="relative">
                {recommendedProducts.length > slidesPerView && (
                  <>
                    <button
                      onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                      disabled={currentSlide === 0}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white hover:bg-orange-500 text-gray-700 hover:text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Previous products"
                    >
                      <FaChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setCurrentSlide(Math.min(maxRelatedSlide, currentSlide + 1))}
                      disabled={currentSlide >= maxRelatedSlide}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white hover:bg-orange-500 text-gray-700 hover:text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Next products"
                    >
                      <FaChevronRight size={20} />
                    </button>
                  </>
                )}

                <div className="overflow-hidden">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{
                      transform: `translateX(-${currentSlide * relatedSlideStepPercent}%)`,
                    }}
                  >
                    {recommendedProducts.map((relatedProduct) => (
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
                          price={relatedProduct.base_price || relatedProduct.price}
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
      </div>

      <ElectroFooter />

      {/* Add to Cart Popup */}
      {showCartPopup && cartProduct && (
        <AddToCartPopup
          isOpen={showCartPopup}
          product={cartProduct}
          onClose={() => {
            setShowCartPopup(false);
            setCartProduct(null);
          }}
        />
      )}
    </div>
  );
}
