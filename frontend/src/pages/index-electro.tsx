import { useEffect, useState } from 'react';
import Link from 'next/link';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import ElectroProductCard from '@/components/ElectroProductCard';
import { FaTruck, FaUndo, FaHeadset, FaLock, FaArrowRight } from 'react-icons/fa';
import apiClient from '@/services/api';

export default function ElectroHome() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      const products = response.data || [];
      console.log('Electro products loaded:', products.length);
      // Show all products (stock filter removed)
      setFeaturedProducts(products.slice(0, 8));
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      {/* Hero Carousel */}
      <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-500">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center">
            <div className="flex-1">
              <h1 className="text-5xl font-bold text-white mb-4">
                Super Sale!
              </h1>
              <h2 className="text-3xl text-white mb-6">
                Up to <span className="text-6xl font-bold">70% OFF</span>
              </h2>
              <p className="text-xl text-white mb-8">
                On selected premium organic products
              </p>
              <Link href="/products" className="inline-flex items-center gap-2 bg-white text-orange-500 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition">
                Shop Now
                <FaArrowRight />
              </Link>
            </div>
            <div className="flex-1 text-center">
              <div className="text-9xl">🛒</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-4 rounded-full">
                <FaTruck size={32} className="text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">Fast Delivery</h4>
                <p className="text-sm text-gray-600">Dhaka ৳60 | Outside ৳110</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-4 rounded-full">
                <FaUndo size={32} className="text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">Easy Returns</h4>
                <p className="text-sm text-gray-600">30 days return policy</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-4 rounded-full">
                <FaHeadset size={32} className="text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">24/7 Support</h4>
                <p className="text-sm text-gray-600">Dedicated support team</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-4 rounded-full">
                <FaLock size={32} className="text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">Secure Payment</h4>
                <p className="text-sm text-gray-600">100% secure transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-8">Shop by Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { name: 'Spices', icon: '🌶️', color: 'from-red-400 to-red-500' },
            { name: 'Oils', icon: '🛢️', color: 'from-yellow-400 to-yellow-500' },
            { name: 'Dry Fruits', icon: '🥜', color: 'from-orange-400 to-orange-500' },
            { name: 'Beverages', icon: '☕', color: 'from-brown-400 to-brown-500' },
            { name: 'Honey', icon: '🍯', color: 'from-amber-400 to-amber-500' },
            { name: 'Dairy', icon: '🥛', color: 'from-blue-400 to-blue-500' }
          ].map((cat, idx) => (
            <Link
              key={idx}
              href={`/products?category=${cat.name.toLowerCase()}`}
              className={`bg-gradient-to-br ${cat.color} p-8 rounded-lg text-center hover:scale-105 transition-transform cursor-pointer`}
            >
              <div className="text-6xl mb-3">{cat.icon}</div>
              <h3 className="text-white font-bold text-lg">{cat.name}</h3>
            </Link>
          ))}
        </div>
      </div>

      {/* Flash Sale Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <span className="text-3xl">⚡</span>
              <div>
                <h3 className="text-2xl font-bold">Flash Sale</h3>
                <p>Limited time offers - Hurry up!</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-white text-purple-600 px-4 py-2 rounded-lg text-center">
                <div className="text-2xl font-bold">02</div>
                <div className="text-xs">Hours</div>
              </div>
              <div className="bg-white text-purple-600 px-4 py-2 rounded-lg text-center">
                <div className="text-2xl font-bold">35</div>
                <div className="text-xs">Minutes</div>
              </div>
              <div className="bg-white text-purple-600 px-4 py-2 rounded-lg text-center">
                <div className="text-2xl font-bold">42</div>
                <div className="text-xs">Seconds</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Featured Products</h2>
            <p className="text-gray-600 mt-2">Check out our best selling products</p>
          </div>
          <Link href="/products" className="text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-2">
            View All
            <FaArrowRight />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ElectroProductCard
                key={product.id}
                id={product.id}
                name={product.name_en || product.name}
                nameBn={product.name_bn}
                nameEn={product.name_en}
                categoryName={
                  product.category_name ||
                  product.category?.name_en ||
                  product.category?.name
                }
                price={product.base_price || product.price}
                originalPrice={product.mrp}
                stock={product.stock_quantity}
                image={product.image}
                rating={5}
                reviews={Math.floor(Math.random() * 200)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Promotional Banners */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-lg p-12 text-white relative overflow-hidden">
            <div className="absolute right-0 bottom-0 text-9xl opacity-20">🥗</div>
            <h3 className="text-3xl font-bold mb-4">Organic Collection</h3>
            <p className="mb-6">100% Natural & Fresh Products</p>
            <Link href="/products?category=organic" className="inline-block bg-white text-green-600 px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition">
              Explore Now
            </Link>
          </div>
          <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-lg p-12 text-white relative overflow-hidden">
            <div className="absolute right-0 bottom-0 text-9xl opacity-20">🌶️</div>
            <h3 className="text-3xl font-bold mb-4">Spice Up Your Life</h3>
            <p className="mb-6">Premium Quality Spices & Masalas</p>
            <Link href="/products?category=spices" className="inline-block bg-white text-orange-600 px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition">
              Shop Spices
            </Link>
          </div>
        </div>
      </div>

      {/* Newsletter Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-16">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Get Special Offers & Discounts</h2>
          <p className="text-xl mb-8">Subscribe to our newsletter and never miss a deal!</p>
          <div className="max-w-xl mx-auto flex gap-2">
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 px-6 py-4 rounded-full text-gray-900 focus:outline-none"
            />
            <button className="bg-orange-500 hover:bg-orange-600 px-8 py-4 rounded-full font-bold transition">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      <ElectroFooter />
    </div>
  );
}
