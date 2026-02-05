import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { combos } from '@/services/api';
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
  FaClock
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

  // Add to cart popup
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [cartProduct, setCartProduct] = useState<any>(null);

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
        quantity: 1,
        image: product.image_url || '',
        slug: product.slug || ''
      });
    });
    
    // Show popup for the combo
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
          className="container mx-auto px-4 lg:px-48 xl:px-56 py-8"
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
            <span className="text-gray-800">{combo.name}</span>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Left - Images */}
            <div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
                <div className="relative">
                  <img
                    src={combo.image_url || combo.products?.[0]?.image_url || 'https://via.placeholder.com/600x500?text=Combo+Deal'}
                    alt={combo.name}
                    className="w-full h-80 lg:h-96 object-cover"
                  />
                  {discountPercent > 0 && (
                    <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                      <FaPercent className="text-sm" />
                      {discountPercent}% OFF
                    </div>
                  )}
                </div>
              </div>
              
              {/* Thumbnail Gallery - Show product images */}
              {combo.products && combo.products.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {combo.products.map((product) => (
                    <div
                      key={product.id}
                      className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200"
                    >
                      <img 
                        src={product.image_url || 'https://via.placeholder.com/64'} 
                        alt={product.name_en} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right - Details */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-3">{combo.name}</h1>
              
              {combo.description && (
                <p className="text-gray-600 mb-6 whitespace-pre-line">{combo.description}</p>
              )}

              {/* Price Box */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Combo Price</p>
                    <p className="text-3xl font-bold text-orange-500">৳{comboPrice.toFixed(0)}</p>
                  </div>
                  {savings > 0 && (
                    <>
                      <div className="h-12 w-px bg-gray-300"></div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Regular Price</p>
                        <p className="text-xl text-gray-400 line-through">৳{totalPrice.toFixed(0)}</p>
                      </div>
                      <div className="h-12 w-px bg-gray-300"></div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">You Save</p>
                        <p className="text-xl font-semibold text-green-600">৳{savings.toFixed(0)}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="bg-white px-3 py-1.5 rounded-full text-gray-700 flex items-center gap-1.5">
                    <FaBoxOpen className="text-orange-500" />
                    {combo.products?.length || 0} Products
                  </span>
                  <span className="bg-white px-3 py-1.5 rounded-full text-gray-700 flex items-center gap-1.5">
                    <FaCheck className="text-green-500" />
                    In Stock
                  </span>
                  {combo.expires_at && (
                    <span className="bg-white px-3 py-1.5 rounded-full text-gray-700 flex items-center gap-1.5">
                      <FaClock className="text-orange-500" />
                      Expires: {new Date(combo.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddAllToCart}
                disabled={!combo.products || combo.products.length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2 mb-4"
              >
                <FaShoppingCart />
                Add All to Cart - ৳{comboPrice.toFixed(0)}
              </button>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-orange-500 text-xl mb-1">🚚</div>
                  <p className="text-gray-600">Free Delivery</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-orange-500 text-xl mb-1">✅</div>
                  <p className="text-gray-600">Quality Assured</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-orange-500 text-xl mb-1">🔄</div>
                  <p className="text-gray-600">Easy Returns</p>
                </div>
              </div>
            </div>
          </div>

          {/* Products in Combo */}
          <div className="mb-12">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FaTag className="text-orange-500" />
              Products Included in This Combo
            </h2>

            {combo.products && combo.products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
                {combo.products.map((product) => {
                  const price = Number(product.base_price) || 0;
                  return (
                    <ElectroProductCard
                      key={product.id}
                      id={product.id}
                      slug={product.slug || product.id.toString()}
                      name={product.name_en}
                      nameBn={product.name_bn}
                      nameEn={product.name_en}
                      price={price}
                      originalPrice={price}
                      stock={10}
                      image={product.image_url || ''}
                      rating={5}
                      reviews={0}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                No products in this combo yet.
              </div>
            )}
          </div>

          {/* Why Buy This Combo */}
          <div className="bg-white rounded-xl p-6 lg:p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Why Buy This Combo?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 p-3 rounded-full">
                  <FaPercent className="text-orange-500 text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Save More</h3>
                  <p className="text-gray-600 text-sm">Get {discountPercent}% discount when you buy together</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <FaCheck className="text-green-500 text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Curated Selection</h3>
                  <p className="text-gray-600 text-sm">Products carefully selected to complement each other</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <FaShoppingCart className="text-blue-500 text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Convenient</h3>
                  <p className="text-gray-600 text-sm">Add all products with a single click</p>
                </div>
              </div>
            </div>
          </div>
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
