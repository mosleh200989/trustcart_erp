import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import ElectroProductCard from '@/components/ElectroProductCard';
import HeroBannerCarousel from '@/components/HeroBannerCarousel';
import SideBanner from '@/components/SideBanner';
import CategorySlider from '@/components/CategorySlider';
import { FaTruck, FaUndo, FaHeadset, FaLock, FaArrowRight, FaShieldAlt } from 'react-icons/fa';
import apiClient from '@/services/api';

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  button_text: string;
  button_link: string;
  image_url: string;
  background_color: string;
  text_color: string;
  banner_type: string;
}

interface Category {
  id: number;
  name_en: string;
  name_bn: string;
  slug: string;
  image_url: string;
}

interface SpecialOffer {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  features?: string[];
  primary_button_text?: string;
  primary_button_link?: string;
  secondary_button_text?: string;
  secondary_button_link?: string;
  image_url?: string;
  background_gradient?: string;
}

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [carouselBanners, setCarouselBanners] = useState<Banner[]>([]);
  const [sideBanners, setSideBanners] = useState<Banner[]>([]);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [dealOfTheDay, setDealOfTheDay] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadBanners();
    loadSpecialOffers();
    loadDealOfTheDay();
  }, []);

  const loadBanners = async () => {
    try {
      const response = await apiClient.get('/banners?active=true');
      const banners = response.data || [];
      console.log('Banners loaded:', banners);
      
      setCarouselBanners(banners.filter((b: Banner) => b.banner_type === 'carousel'));
      setSideBanners(banners.filter((b: Banner) => b.banner_type === 'side'));
    } catch (error) {
      console.error('Failed to load banners:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/categories?active=true');
      console.log('Categories loaded:', response.data);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadSpecialOffers = async () => {
    try {
      const response = await apiClient.get('/special-offers?active=true');
      console.log('Special offers loaded:', response.data);
      setSpecialOffers(response.data || []);
    } catch (error) {
      console.error('Failed to load special offers:', error);
    }
  };

  const loadDealOfTheDay = async () => {
    try {
      const response = await apiClient.get('/products/deal-of-the-day');
      console.log('Deal of the Day loaded:', response.data);
      setDealOfTheDay(response.data);
    } catch (error) {
      console.error('Failed to load deal of the day:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      const products = response.data || [];
      console.log('Products loaded:', products.length, 'First product:', products[0]);
      
      // Calculate sale price and discount percentage for products
      const productsWithSalePrice = products.map((p: any) => {
        let salePrice = p.sale_price;
        let discountPercent = 0;
        
        // If sale_price exists, calculate discount percentage
        if (salePrice && salePrice < p.base_price) {
          discountPercent = Math.round(((p.base_price - salePrice) / p.base_price) * 100);
        }
        // Otherwise calculate from discount fields
        else if (p.discount_value && p.discount_type) {
          if (p.discount_type === 'percentage') {
            salePrice = p.base_price - (p.base_price * p.discount_value / 100);
            discountPercent = Math.round(p.discount_value);
          } else if (p.discount_type === 'flat') {
            salePrice = p.base_price - p.discount_value;
            discountPercent = Math.round(((p.base_price - salePrice) / p.base_price) * 100);
          }
        }
        
        return {
          ...p,
          salePrice,
          discountPercent,
          hasDiscount: !!salePrice && salePrice < p.base_price
        };
      });
      
      // Show all products for now
      setFeaturedProducts(productsWithSalePrice.slice(0, 12));
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  console.log(dealOfTheDay)

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      {/* Hero Carousel with Side Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white border-b"
      >
        <div className="container mx-auto px-4 lg:px-36 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Carousel - 2/3 width */}
            <div className="lg:col-span-2">
              <HeroBannerCarousel banners={carouselBanners} />
            </div>

            {/* Side Banner - 1/3 width */}
            <div className="hidden lg:block">
              <SideBanner banners={sideBanners} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Features */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white border-b"
      >
        <div className="container mx-auto px-4 lg:px-36 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-4"
            >
              <div className="bg-orange-100 p-4 rounded-full">
                <FaTruck size={32} className="text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">Free Shipping</h4>
                <p className="text-sm text-gray-600">On orders over ৳500</p>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-4"
            >
              <div className="bg-orange-100 p-4 rounded-full">
                <FaUndo size={32} className="text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">Easy Returns</h4>
                <p className="text-sm text-gray-600">30 days return policy</p>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-4"
            >
              <div className="bg-orange-100 p-4 rounded-full">
                <FaHeadset size={32} className="text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">24/7 Support</h4>
                <p className="text-sm text-gray-600">Dedicated support team</p>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-4"
            >
              <div className="bg-orange-100 p-4 rounded-full">
                <FaShieldAlt size={32} className="text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">Secure Payment</h4>
                <p className="text-sm text-gray-600">100% secure transactions</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Special Order Section - Dynamic from Admin */}
      {specialOffers.length > 0 && specialOffers.map((offer, index) => (
        <motion.div 
          key={offer.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          className={`bg-gradient-to-br ${offer.background_gradient} py-12`}
        >
          <div className="container mx-auto px-4 lg:px-36">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Left Side - Content */}
                <div className="p-12 flex flex-col justify-center">
                  {offer.subtitle && (
                    <div className="inline-block bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-xs sm:text-sm font-bold mb-4 w-fit">
                      {offer.subtitle}
                    </div>
                  )}
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                    {offer.title}
                  </h2>
                  {offer.description && (
                    <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6">
                      {offer.description}
                    </p>
                  )}
                  {offer.features && offer.features.length > 0 && (
                    <ul className="space-y-3 mb-8">
                      {offer.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-gray-700">
                          <span className="bg-green-100 text-green-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-4">
                    {offer.primary_button_text && offer.primary_button_link && (
                      <a
                        href={offer.primary_button_link}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all hover:scale-105 shadow-lg"
                      >
                        {offer.primary_button_text}
                      </a>
                    )}
                    {offer.secondary_button_text && offer.secondary_button_link && (
                      <a
                        href={offer.secondary_button_link}
                        className="border-2 border-orange-500 text-orange-500 px-8 py-3 rounded-full font-bold text-lg hover:bg-orange-50 transition-all"
                      >
                        {offer.secondary_button_text}
                      </a>
                    )}
                  </div>
                </div>
                {/* Right Side - Image */}
                <div className="flex items-center justify-center overflow-hidden">
                  {offer.image_url ? (
                    <img
                      src={offer.image_url}
                      alt={offer.title}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="bg-gradient-to-br from-orange-100 to-orange-200 w-full h-full flex items-center justify-center">
                      <div className="text-9xl animate-pulse">📦</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Categories Slider */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 lg:px-36 py-12"
      >
        <h2 className="text-3xl font-bold text-center mb-8">Shop by Categories</h2>
        <CategorySlider categories={categories} />
      </motion.div>

      {/* Deal of the Day */}
      {dealOfTheDay && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 py-12"
        >
          <div className="container mx-auto px-4 lg:px-36">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="bg-gradient-to-br from-orange-400 to-red-500 p-12 text-white flex flex-col justify-center">
                  <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold mb-4 w-fit">
                    🔥 DEAL OF THE DAY
                  </div>
                  <h2 className="text-4xl font-bold mb-4">{dealOfTheDay.name_en}</h2>
                  <p className="text-xl mb-6 text-white/90">{dealOfTheDay.brand || 'Premium Quality'}</p>
                  <div className="flex items-end gap-3 mb-6">
                    <span className="text-6xl font-bold">
                      ৳{Number(dealOfTheDay.sale_price || dealOfTheDay.base_price).toFixed(0)}
                    </span>
                    {dealOfTheDay.sale_price && (
                      <span className="text-2xl line-through opacity-75 pb-2">
                        ৳{Number(dealOfTheDay.base_price).toFixed(0)}
                      </span>
                    )}
                  </div>
                  <a
                    href={`/products/${dealOfTheDay.slug}`}
                    className="bg-white text-orange-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all hover:scale-105 shadow-xl inline-block text-center w-fit"
                  >
                    Grab This Deal Now!
                  </a>
                </div>
                <div className="relative h-96 md:h-auto bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center p-8">
                  {dealOfTheDay.image_url ? (
                    <img
                      src={dealOfTheDay.image_url}
                      alt={dealOfTheDay.name_en}
                      className="max-h-80 w-auto object-contain drop-shadow-2xl"
                    />
                  ) : (
                    <div className="text-9xl">🏷️</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Hot Deals Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 lg:px-36 py-12"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <span className="text-4xl">🔥</span>
              Hot Deals
            </h2>
            <p className="text-gray-600 mt-2">Biggest discounts of the season</p>
          </div>
          <Link href="/products?sort=discount" className="text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-2">
            View All Deals
            <FaArrowRight />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.filter(p => p.hasDiscount).slice(0, 4).map((product) => (
            <ElectroProductCard
              key={product.id}
              id={product.id}
              slug={product.slug}
              name={product.name_en || product.name}
              nameBn={product.name_bn}
              nameEn={product.name_en}
              price={product.salePrice}
              originalPrice={product.base_price || product.price}
              stock={product.stock_quantity}
              image={product.image_url}
              rating={5}
              reviews={Math.floor(Math.random() * 200)}
              discount={product.hasDiscount ? product.discountPercent : undefined}
            />
          ))}
        </div>
      </motion.div>

      {/* Featured Products */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 lg:px-36 py-12"
      >
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <ElectroProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={product.name_en || product.name}
                nameBn={product.name_bn}
                nameEn={product.name_en}
                price={product.hasDiscount ? product.salePrice : (product.base_price || product.price)}
                originalPrice={product.hasDiscount ? (product.base_price || product.price) : undefined}
                stock={product.stock_quantity}
                image={product.image_url}
                rating={5}
                reviews={Math.floor(Math.random() * 200)}
                discount={product.hasDiscount ? product.discountPercent : undefined}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Newsletter Banner */}
      {/* <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-16">
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
      </div> */}

      <ElectroFooter />
    </div>
  );
}
