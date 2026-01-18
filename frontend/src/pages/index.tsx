import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import ElectroProductCard from "@/components/ElectroProductCard";
import HeroBannerCarousel from "@/components/HeroBannerCarousel";
import SideBanner from "@/components/SideBanner";
import CategorySlider from "@/components/CategorySlider";
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
      const response = await apiClient.get("/banners/public");
      const banners = response.data || [];
      console.log("Banners loaded:", banners);

      setCarouselBanners(
        banners.filter((b: Banner) => b.banner_type === "carousel")
      );
      setSideBanners(banners.filter((b: Banner) => b.banner_type === "side"));
    } catch (error) {
      console.error("Failed to load banners:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.get("/categories?active=true");
      console.log("Categories loaded:", response.data);
      setCategories(response.data || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadSpecialOffers = async () => {
    try {
      const response = await apiClient.get("/special-offers/public");
      console.log("Special offers loaded:", response.data);
      setSpecialOffers(response.data || []);
    } catch (error) {
      console.error("Failed to load special offers:", error);
    }
  };

  const loadDealOfTheDay = async () => {
    try {
      const response = await apiClient.get("/products/deal-of-the-day");
      console.log("Deal of the Day loaded:", response.data);
      setDealOfTheDay(response.data);
    } catch (error) {
      console.error("Failed to load deal of the day:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.get("/products");
      const products = response.data || [];
      console.log(
        "Products loaded:",
        products.length,
        "First product:",
        products[0]
      );

      // Calculate sale price and discount percentage for products
      const productsWithSalePrice = products.map((p: any) => {
        let salePrice = p.sale_price;
        let discountPercent = 0;

        // If sale_price exists, calculate discount percentage
        if (salePrice && salePrice < p.base_price) {
          discountPercent = Math.round(
            ((p.base_price - salePrice) / p.base_price) * 100
          );
        }
        // Otherwise calculate from discount fields
        else if (p.discount_value && p.discount_type) {
          if (p.discount_type === "percentage") {
            salePrice = p.base_price - (p.base_price * p.discount_value) / 100;
            discountPercent = Math.round(p.discount_value);
          } else if (p.discount_type === "flat") {
            salePrice = p.base_price - p.discount_value;
            discountPercent = Math.round(
              ((p.base_price - salePrice) / p.base_price) * 100
            );
          }
        }

        return {
          ...p,
          salePrice,
          discountPercent,
          hasDiscount: !!salePrice && salePrice < p.base_price,
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

  // console.log("Featrued Products", featuredProducts[0].image_url)

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />
      <div className="max-w-7xl mx-auto">
        {/* Hero Carousel with Side Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border-b"
        >
          <div className="container mx-auto px-4 lg:px-48 xl:px-56 py-6">
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
          <div className="container mx-auto px-4 lg:px-48 xl:px-56 py-4 sm:py-6 md:py-8">
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
                    Free Shipping
                  </h4>
                  <p className="hidden sm:block text-sm text-gray-600 leading-tight">
                    On orders over ৳500
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

        {/* Deal of the Day */}
        {dealOfTheDay && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-amber-50 to-orange-50 py-12"
          >
            <div className="container mx-auto px-4 lg:px-48 xl:px-56">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {/* Left Side - Content */}
                  <div className="p-12 flex flex-col justify-center">
                    <div className="inline-block bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-xs sm:text-sm font-bold mb-4 w-fit">
                      🔥 DEAL OF THE DAY
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                      {dealOfTheDay.name_en}
                    </h2>
                    <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6">
                      {dealOfTheDay.brand || "Premium Quality"}
                    </p>
                    <div className="mb-8">
                      <div className="flex items-end gap-3 mb-2">
                        <span className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900">
                          ৳
                          {Number(
                            dealOfTheDay.sale_price || dealOfTheDay.base_price
                          ).toFixed(0)}
                        </span>
                        {dealOfTheDay.sale_price && (
                          <span className="text-xl sm:text-2xl line-through text-gray-400 pb-2">
                            ৳{Number(dealOfTheDay.base_price).toFixed(0)}
                          </span>
                        )}
                      </div>
                      {dealOfTheDay.sale_price && (
                        <div className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold">
                          Save ৳
                          {(
                            Number(dealOfTheDay.base_price) -
                            Number(dealOfTheDay.sale_price)
                          ).toFixed(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <a
                        href={`/products/${dealOfTheDay.slug}`}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all hover:scale-105 shadow-lg"
                      >
                        Grab This Deal Now!
                      </a>
                    </div>
                  </div>
                  {/* Right Side - Image */}
                  <div className="flex items-center justify-center overflow-hidden">
                    {dealOfTheDay.image_url ? (
                      <img
                        src={dealOfTheDay.image_url}
                        alt={dealOfTheDay.name_en}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="bg-gradient-to-br from-orange-100 to-orange-200 w-full h-full flex items-center justify-center">
                        <div className="text-9xl animate-pulse">🏷️</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Categories Slider */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4 lg:px-48 xl:px-56 py-12"
        >
          <h2 className="text-3xl font-bold text-center mb-8">
            Shop by Categories
          </h2>
          <CategorySlider categories={categories} />
        </motion.div>

        {/* Hot Deals Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4 lg:px-48 xl:px-56 py-12"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <span className="text-4xl">🔥</span>
                Hot Deals
              </h2>
              <p className="text-gray-600 mt-2">
                Biggest discounts of the season
              </p>
            </div>
            <Link
              href="/products?sort=discount"
              className="text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-2"
            >
              View All Deals
              <FaArrowRight />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts
              .filter((p) => p.hasDiscount)
              .slice(0, 4)
              .map((product) => (
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
                  price={product.salePrice}
                  originalPrice={product.base_price || product.price}
                  stock={product.stock_quantity}
                  image={product.image_url}
                  rating={5}
                  reviews={Math.floor(Math.random() * 200)}
                  discount={
                    product.hasDiscount ? product.discountPercent : undefined
                  }
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
          className="container mx-auto px-4 lg:px-48 xl:px-56 py-12"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Featured Products</h2>
              <p className="text-gray-600 mt-2">
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
                  reviews={Math.floor(Math.random() * 200)}
                  discount={
                    product.hasDiscount ? product.discountPercent : undefined
                  }
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
      </div>
      <ElectroFooter />
    </div>
  );
}
