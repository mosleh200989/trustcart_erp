import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import ElectroProductCard from "@/components/ElectroProductCard";
import HeroBannerCarousel from "@/components/HeroBannerCarousel";
import SideBanner from "@/components/SideBanner";
import CategorySlider from "@/components/CategorySlider";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_LOCALE } from '@/config/seo';
import {
  FaTruck,
  FaUndo,
  FaHeadset,
  FaLock,
  FaArrowRight,
  FaShieldAlt,
} from "react-icons/fa";
import apiClient from "@/services/api";

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
  const [hotDeals, setHotDeals] = useState<any[]>([]);
  const [combosDeals, setCombosDeals] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [carouselBanners, setCarouselBanners] = useState<Banner[]>([]);
  const [sideBanners, setSideBanners] = useState<Banner[]>([]);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [dealOfTheDay, setDealOfTheDay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [hotDealsLoading, setHotDealsLoading] = useState(true);
  const [combosLoading, setCombosLoading] = useState(true);
  const [dealLoading, setDealLoading] = useState(true);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadBanners();
    loadSpecialOffers();
    loadDealOfTheDay();
    loadHotDeals();
    loadCombos();
  }, []);

  const loadBanners = async () => {
    try {
      const response = await apiClient.get("/banners/public");
      const banners = response.data || [];

      setCarouselBanners(
        banners.filter((b: Banner) => b.banner_type === "carousel")
      );
      setSideBanners(banners.filter((b: Banner) => b.banner_type === "side"));
    } catch (error) {
      console.error("Failed to load banners:", error);
    } finally {
      setBannersLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.get("/categories?active=true");
      setCategories(response.data || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadSpecialOffers = async () => {
    try {
      const response = await apiClient.get("/special-offers/public");
      setSpecialOffers(response.data || []);
    } catch (error) {
      console.error("Failed to load special offers:", error);
    }
  };

  const loadDealOfTheDay = async () => {
    try {
      const response = await apiClient.get("/products/deal-of-the-day");
      setDealOfTheDay(response.data);
    } catch (error) {
      console.error("Failed to load deal of the day:", error);
    } finally {
      setDealLoading(false);
    }
  };

  const loadHotDeals = async () => {
    try {
      const response = await apiClient.get("/products/hot-deals");
      setHotDeals(response.data || []);
    } catch (error) {
      console.error("Failed to load hot deals:", error);
    } finally {
      setHotDealsLoading(false);
    }
  };

  const loadCombos = async () => {
    try {
      const response = await apiClient.get("/combos");
      setCombosDeals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load combos:", error);
    } finally {
      setCombosLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.get("/products");
      const products = response.data || [];

      // Calculate sale price and discount percentage for products
      const productsWithSalePrice = products.map((p: any) => {
        const basePrice = parseFloat(p.base_price) || 0;
        let salePrice = p.sale_price ? parseFloat(p.sale_price) : null;
        let discountPercent = 0;

        // If sale_price exists, calculate discount percentage
        if (salePrice && salePrice < basePrice) {
          discountPercent = Math.round(
            ((basePrice - salePrice) / basePrice) * 100
          );
        }
        // Otherwise calculate from discount fields
        else if (p.discount_value && p.discount_type) {
          const discountValue = parseFloat(p.discount_value) || 0;
          if (p.discount_type === "percentage") {
            salePrice = basePrice - (basePrice * discountValue) / 100;
            discountPercent = Math.round(discountValue);
          } else if (p.discount_type === "flat") {
            salePrice = basePrice - discountValue;
            discountPercent = Math.round(
              ((basePrice - salePrice) / basePrice) * 100
            );
          }
        }

        return {
          ...p,
          base_price: basePrice,
          salePrice,
          discountPercent,
          hasDiscount: !!salePrice && salePrice < basePrice,
        };
      });

      // Show all products for now
      setFeaturedProducts(productsWithSalePrice.slice(0, 12));
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Skeleton building blocks
  const Pulse = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );

  const BannerSkeleton = () => (
    <div className="bg-white border-b">
      <div className="container mx-auto px-4 lg:px-8 xl:px-12 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><Pulse className="w-full h-48 sm:h-64 lg:h-72 rounded-lg" /></div>
          <div className="hidden lg:block"><Pulse className="w-full h-72 rounded-lg" /></div>
        </div>
      </div>
    </div>
  );

  const CategorySkeleton = () => (
    <div className="container mx-auto px-4 lg:px-8 xl:px-12 py-12">
      <Pulse className="h-8 w-56 mx-auto mb-8 rounded-lg" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-28 flex flex-col items-center gap-2">
            <Pulse className="w-20 h-20 rounded-full" />
            <Pulse className="h-4 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  const ProductGridSkeleton = ({ count = 4 }: { count?: number }) => (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg overflow-hidden border border-gray-100">
          <Pulse className="w-full h-36 sm:h-44 lg:h-52 rounded-none" />
          <div className="p-3 space-y-2">
            <Pulse className="h-4 w-3/4 rounded" />
            <Pulse className="h-4 w-1/2 rounded" />
            <Pulse className="h-8 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );

  const SectionSkeleton = ({ title }: { title: string }) => (
    <div className="container mx-auto px-4 lg:px-8 xl:px-12 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl xl:text-3xl font-bold">{title}</h2>
          <Pulse className="h-4 w-48 mt-2 rounded" />
        </div>
        <Pulse className="h-5 w-24 rounded" />
      </div>
      <ProductGridSkeleton />
    </div>
  );

  const DealSkeleton = () => (
    <div className="container mx-auto px-4 lg:px-8 xl:px-12 py-4 lg:py-6">
      {/* Mobile */}
      <div className="lg:hidden bg-gray-100 rounded-xl p-4 flex items-center gap-4">
        <Pulse className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-3 w-24 rounded" />
          <Pulse className="h-5 w-40 rounded" />
        </div>
        <Pulse className="h-7 w-16 rounded flex-shrink-0" />
      </div>
      {/* Desktop */}
      <div className="hidden lg:flex bg-gray-100 rounded-2xl items-center p-4">
        <Pulse className="w-40 h-40 xl:w-48 xl:h-48 rounded-xl flex-shrink-0" />
        <div className="flex-1 px-6 space-y-3">
          <Pulse className="h-6 w-48 rounded" />
          <Pulse className="h-8 w-64 rounded" />
          <Pulse className="h-10 w-36 rounded" />
        </div>
        <Pulse className="h-14 w-36 rounded-full mr-6" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{SITE_NAME} — Premium Organic Groceries in Bangladesh</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${SITE_NAME} — Premium Organic Groceries in Bangladesh`} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={DEFAULT_OG_IMAGE} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content={SITE_LOCALE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${SITE_NAME} — Premium Organic Groceries in Bangladesh`} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL,
            description: SITE_DESCRIPTION,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${SITE_URL}/products?search={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          }) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: SITE_NAME,
            url: SITE_URL,
            logo: DEFAULT_OG_IMAGE,
            contactPoint: {
              '@type': 'ContactPoint',
              telephone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '',
              contactType: 'customer service',
            },
          }) }}
        />
      </Head>
      <ElectroNavbar />
      <div className="max-w-7xl mx-auto">
        {/* Hero Carousel with Side Banner */}
        {bannersLoading ? (
          <BannerSkeleton />
        ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border-b"
        >
          <div className="container mx-auto px-4 lg:px-8 xl:px-12 py-6">
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
        )}

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white border-b"
        >
          <div className="container mx-auto px-4 lg:px-8 xl:px-12 py-4 sm:py-6 md:py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 sm:gap-4"
              >
                <div className="bg-orange-100 p-2.5 sm:p-4 rounded-full flex-shrink-0">
                  <FaTruck className="text-orange-500 w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm sm:text-base leading-tight">
                    Fast Delivery
                  </h4>
                  <p className="hidden sm:block text-sm text-gray-600 leading-tight">
                    Dhaka ৳60 | Outside ৳110
                  </p>
                </div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 sm:gap-4"
              >
                <div className="bg-orange-100 p-2.5 sm:p-4 rounded-full flex-shrink-0">
                  <FaUndo className="text-orange-500 w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm sm:text-base leading-tight">
                    Easy Returns
                  </h4>
                  <p className="hidden sm:block text-sm text-gray-600 leading-tight">
                    30 days return policy
                  </p>
                </div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 sm:gap-4"
              >
                <div className="bg-orange-100 p-2.5 sm:p-4 rounded-full flex-shrink-0">
                  <FaHeadset className="text-orange-500 w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm sm:text-base leading-tight">
                    24/7 Support
                  </h4>
                  <p className="hidden sm:block text-sm text-gray-600 leading-tight">
                    Dedicated support team
                  </p>
                </div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 sm:gap-4"
              >
                <div className="bg-orange-100 p-2.5 sm:p-4 rounded-full flex-shrink-0">
                  <FaShieldAlt className="text-orange-500 w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm sm:text-base leading-tight">
                    Secure Payment
                  </h4>
                  <p className="hidden sm:block text-sm text-gray-600 leading-tight">
                    100% secure transactions
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Deal of the Day - Responsive Design: Compact on Mobile, Larger on Desktop */}
        {dealLoading ? (
          <DealSkeleton />
        ) : dealOfTheDay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="container mx-auto px-4 lg:px-8 xl:px-12 py-4 lg:py-6"
          >
            {/* Mobile View - Compact Banner */}
            <a
              href={`/products/${dealOfTheDay.slug}`}
              className="lg:hidden block bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border border-orange-200 rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-[1.01] overflow-hidden"
            >
              <div className="flex items-center gap-4 p-3 sm:p-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-orange-100">
                  {dealOfTheDay.image_url ? (
                    <img
                      src={dealOfTheDay.image_url}
                      alt={dealOfTheDay.name_en}
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🏷️</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-orange-600 text-xs font-bold uppercase tracking-wide">🔥 Deal of the Day</span>
                    {dealOfTheDay.sale_price && (
                      <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        Save ৳{(Number(dealOfTheDay.base_price) - Number(dealOfTheDay.sale_price)).toFixed(0)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-gray-800 font-bold text-base sm:text-lg truncate">
                    {dealOfTheDay.name_en}
                  </h3>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-orange-600 font-bold text-xl sm:text-2xl">
                    ৳{Number(dealOfTheDay.sale_price || dealOfTheDay.base_price).toFixed(0)}
                  </div>
                  {dealOfTheDay.sale_price && (
                    <div className="text-gray-400 text-xs line-through">
                      ৳{Number(dealOfTheDay.base_price).toFixed(0)}
                    </div>
                  )}
                </div>
              </div>
            </a>

            {/* Desktop View - Larger Card */}
            <div className="hidden lg:block bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border border-orange-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center">
                {/* Left - Product Image */}
                <div className="w-40 h-40 xl:w-48 xl:h-48 flex-shrink-0 bg-white m-4 rounded-xl overflow-hidden shadow-sm border border-orange-100">
                  {dealOfTheDay.image_url ? (
                    <img
                      src={dealOfTheDay.image_url}
                      alt={dealOfTheDay.name_en}
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">🏷️</div>
                  )}
                </div>
                
                {/* Center - Content */}
                <div className="flex-1 py-6 px-2">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-orange-100 text-orange-600 text-sm font-bold px-4 py-1.5 rounded-full">
                      🔥 DEAL OF THE DAY
                    </span>
                    {dealOfTheDay.sale_price && (
                      <span className="bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full animate-pulse">
                        {Math.round(((Number(dealOfTheDay.base_price) - Number(dealOfTheDay.sale_price)) / Number(dealOfTheDay.base_price)) * 100)}% OFF
                      </span>
                    )}
                  </div>
                  <h3 className="text-gray-800 font-bold text-2xl xl:text-3xl mb-1">
                    {dealOfTheDay.name_en}
                  </h3>
                  {dealOfTheDay.brand && (
                    <p className="text-gray-500 text-sm mb-3">{dealOfTheDay.brand}</p>
                  )}
                  <div className="flex items-end gap-3">
                    <span className="text-orange-600 font-bold text-4xl xl:text-5xl">
                      ৳{Number(dealOfTheDay.sale_price || dealOfTheDay.base_price).toFixed(0)}
                    </span>
                    {dealOfTheDay.sale_price && (
                      <span className="text-gray-400 text-xl line-through pb-1">
                        ৳{Number(dealOfTheDay.base_price).toFixed(0)}
                      </span>
                    )}
                    {dealOfTheDay.sale_price && (
                      <span className="text-green-600 text-sm font-semibold pb-1.5">
                        Save ৳{(Number(dealOfTheDay.base_price) - Number(dealOfTheDay.sale_price)).toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right - CTA Button */}
                <div className="pr-6">
                  <a
                    href={`/products/${dealOfTheDay.slug}`}
                    className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-orange-600 transition-all hover:scale-105 shadow-md"
                  >
                    Grab Deal
                    <FaArrowRight />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Categories Slider */}
        {categoriesLoading ? (
          <CategorySkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="container mx-auto px-4 lg:px-8 xl:px-12 py-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">
              Shop by Categories
            </h2>
            <CategorySlider categories={categories} />
          </motion.div>
        )}

        {/* Hot Deals Section */}
        {hotDealsLoading ? (
          <SectionSkeleton title="Hot Deals" />
        ) : (hotDeals.length > 0 || featuredProducts.filter(p => p.hasDiscount).length > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="container mx-auto px-4 lg:px-8 xl:px-12 py-12"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl xl:text-3xl font-bold flex items-center gap-3">
                  <span className="text-3xl xl:text-4xl">🔥</span>
                  Hot Deals
                </h2>
                <p className="text-gray-600 mt-1">
                  Biggest discounts of the season
                </p>
              </div>
              <Link
                href="/products?sort=discount"
                className="text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-2 ml-0.5"
              >
                View All Deals
                <FaArrowRight />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
              {/* Use hot deals from API if available, otherwise fallback to discounted products */}
              {(hotDeals.length > 0 ? hotDeals : featuredProducts.filter(p => p.hasDiscount))
                .slice(0, 4)
                .map((product) => {
                  // Calculate price - for hot deals, use special_price if set
                  const basePrice = Number(product.base_price || product.price || 0);
                  const salePrice = product.special_price 
                    ? Number(product.special_price) 
                    : product.sale_price 
                      ? Number(product.sale_price) 
                      : product.salePrice || basePrice;
                  const discountPercent = product.discount_percent 
                    || (basePrice > salePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0);
                  
                  return (
                    <ElectroProductCard
                      key={product.id || product.product_id}
                      id={product.product_id || product.id}
                      slug={product.slug}
                      name={product.name_en || product.name}
                      nameBn={product.name_bn}
                      nameEn={product.name_en}
                      categoryName={
                        product.category_name ||
                        product.category?.name_en ||
                        product.category?.name
                      }
                      price={salePrice}
                      originalPrice={basePrice}
                      stock={product.stock_quantity}
                      image={product.image_url}
                      rating={5}
                      discount={discountPercent > 0 ? discountPercent : undefined}
                    />
                  );
                })}
            </div>
          </motion.div>
        )}

        {/* Combo Deals Section */}
        {combosLoading ? (
          <SectionSkeleton title="Combo Deals" />
        ) : combosDeals.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="container mx-auto px-4 lg:px-8 xl:px-12 py-12"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl xl:text-3xl font-bold flex items-center gap-3">
                  Combo Deals
                </h2>
                <p className="text-gray-600 mt-1">
                  Buy together and save more
                </p>
              </div>
              <Link
                href="/products?type=combo"
                className="text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-2"
              >
                View All
                <FaArrowRight />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
              {combosDeals.slice(0, 4).map((combo) => {
                // Calculate total original price
                const totalOriginalPrice = combo.products?.reduce(
                  (sum: number, p: any) => sum + Number(p.base_price || 0), 0
                ) || 0;
                const comboPrice = Number(combo.combo_price) || totalOriginalPrice;
                const discountPercent = totalOriginalPrice > 0 
                  ? Math.round(((totalOriginalPrice - comboPrice) / totalOriginalPrice) * 100) 
                  : 0;
                
                return (
                  <Link
                    key={combo.id}
                    href={`/combo/${combo.slug}`}
                    className="group bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all"
                  >
                    <div className="relative">
                      <img
                        src={combo.image_url || combo.products?.[0]?.image_url || 'https://via.placeholder.com/300x200?text=Combo'}
                        alt={combo.name}
                        className="w-full h-32 sm:h-40 lg:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {discountPercent > 0 && (
                        <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-semibold">
                          -{discountPercent}%
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-0.5 rounded text-xs font-semibold">
                        {combo.products?.length || 0} items
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-1 group-hover:text-orange-500 transition-colors">
                        {combo.name}
                      </h3>
                      <p className="text-gray-500 text-xs mb-2 line-clamp-1">{combo.description}</p>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-orange-500">৳{comboPrice}</span>
                        {totalOriginalPrice > comboPrice && (
                          <span className="text-xs text-gray-400 line-through">৳{totalOriginalPrice}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Featured Products */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4 lg:px-8 xl:px-12 py-12"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl xl:text-3xl font-bold">Featured Products</h2>
              <p className="text-gray-600 mt-1">
                Check out our best selling products
              </p>
            </div>
            <Link
              href="/products"
              className="text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-2"
            >
              View All
              <FaArrowRight />
            </Link>
          </div>

          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
              {featuredProducts.slice(0, 8).map((product) => (
                <ElectroProductCard
                  key={product.id}
                  id={product.id}
                  slug={product.slug}
                  name={product.name_en || product.name}
                  nameBn={product.name_bn}
                  nameEn={product.name_en}
                  categoryName={
                    product.category_name ||
                    product.category?.name_en ||
                    product.category?.name
                  }
                  price={
                    product.hasDiscount
                      ? product.salePrice
                      : product.base_price || product.price
                  }
                  originalPrice={
                    product.hasDiscount
                      ? product.base_price || product.price
                      : undefined
                  }
                  stock={product.stock_quantity}
                  image={product?.image_url}
                  rating={5}
                  discount={
                    product.hasDiscount ? product.discountPercent : undefined
                  }
                />
              ))}
            </div>
          )}

          {/* View All Button */}
          <div className="text-center mt-8">
            <Link
              href="/products"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              View All Products
            </Link>
          </div>
        </motion.div>
      </div>
      <ElectroFooter />
    </div>
  );
}
