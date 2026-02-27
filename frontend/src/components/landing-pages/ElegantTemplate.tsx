import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import apiClient from '@/services/api';
import PhoneInput from '@/components/PhoneInput';
import InternationalPhoneInput from '@/components/InternationalPhoneInput';
import { useToast } from '@/contexts/ToastContext';
import {
  FaPhone,
  FaWhatsapp,
  FaShoppingCart,
  FaMinus,
  FaPlus,
  FaCheckCircle,
  FaTruck,
  FaStar,
  FaShieldAlt,
  FaArrowDown,
} from 'react-icons/fa';

interface LandingPageSection {
  id: string;
  type: 'hero' | 'benefits' | 'images' | 'trust' | 'order-form' | 'cta' | 'custom-html';
  title?: string;
  content?: string;
  items?: Array<{ icon?: string; text: string }>;
  images?: string[];
  buttonText?: string;
  buttonLink?: string;
  backgroundColor?: string;
  textColor?: string;
  order: number;
  is_visible: boolean;
}

interface LandingPageProduct {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  compare_price?: number;
  product_id?: number;
  is_default: boolean;
  is_featured?: boolean;
  featured_label?: string;
}

interface LandingPageData {
  id: number;
  title: string;
  slug: string;
  description: string;
  hero_image_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_button_text: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  sections: LandingPageSection[];
  products: LandingPageProduct[];
  phone_number: string;
  whatsapp_number: string;
  show_order_form: boolean;
  cash_on_delivery: boolean;
  free_delivery: boolean;
  delivery_charge: number;
  delivery_charge_outside: number;
  delivery_note: string;
}

interface OrderItem {
  product: LandingPageProduct;
  quantity: number;
}

interface ElegantTemplateProps {
  page: LandingPageData;
  trafficSource?: string;
  isInternational?: boolean;
}

export default function ElegantTemplate({ page, trafficSource = 'landing_page', isInternational = false }: ElegantTemplateProps) {
  const router = useRouter();
  const orderFormRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Order form state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderForm, setOrderForm] = useState({
    name: '',
    phone: '',
    address: '',
    note: '',
  });
  const [deliveryZone, setDeliveryZone] = useState<'inside' | 'outside'>('outside');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

  // Scroll-based animation
  const [scrollY, setScrollY] = useState(0);

  // Incomplete order tracking
  const sessionIdRef = useRef<string>('');
  const trackingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    sessionIdRef.current = `lp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Debounced tracker
  const trackIncompleteOrder = useCallback(
    (stage: string) => {
      if (!page || submitted) return;
      const hasAnyData = orderForm.name || orderForm.phone || orderForm.address;
      if (!hasAnyData) return;

      if (trackingTimerRef.current) clearTimeout(trackingTimerRef.current);

      trackingTimerRef.current = setTimeout(() => {
        const subtotal = orderItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
        apiClient
          .post('/lead-management/incomplete-order/track', {
            sessionId: sessionIdRef.current,
            name: orderForm.name || null,
            phone: orderForm.phone || null,
            address: orderForm.address || null,
            note: orderForm.note || null,
            email: null,
            source: trafficSource,
            landingPageId: page.id,
            landingPageSlug: page.slug,
            landingPageTitle: page.title,
            abandonedStage: stage,
            deliveryZone,
            totalAmount: subtotal,
            cartData: orderItems.map((i) => ({
              product_id: i.product.product_id || null,
              name: i.product.name,
              price: i.product.price,
              quantity: i.quantity,
              image_url: i.product.image_url || null,
            })),
            referrerUrl: window.location.href,
            userAgent: navigator.userAgent,
          })
          .catch(() => {});
        hasTrackedRef.current = true;
      }, 2000);
    },
    [page, orderForm, orderItems, deliveryZone, submitted, trafficSource],
  );

  useEffect(() => {
    if (!page || submitted) return;
    const stage = orderForm.name && orderForm.phone && orderForm.address
      ? 'form_filled'
      : orderForm.phone
        ? 'phone_entered'
        : orderForm.name
          ? 'name_entered'
          : 'form_started';
    trackIncompleteOrder(stage);
  }, [orderForm.name, orderForm.phone, orderForm.address, orderForm.note, deliveryZone, trackIncompleteOrder]);

  useEffect(() => {
    if (!page || submitted || !hasTrackedRef.current) return;
    trackIncompleteOrder('product_changed');
  }, [orderItems]);

  // Initialize order items with default product
  useEffect(() => {
    if (page.products?.length > 0) {
      const defaultProduct = page.products.find((p) => p.is_default) || page.products[0];
      setOrderItems([{ product: defaultProduct, quantity: 1 }]);
    }
  }, [page]);

  const scrollToOrderForm = () => {
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const toggleProduct = (product: LandingPageProduct) => {
    setOrderItems([{ product, quantity: 1 }]);
  };

  const getSubtotal = () => orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const getDeliveryCharge = () => {
    if (page.free_delivery) return 0;
    return deliveryZone === 'inside'
      ? Number(page.delivery_charge || 0)
      : Number(page.delivery_charge_outside || 0);
  };

  const getTotal = () => getSubtotal() + getDeliveryCharge();

  const isBdPhoneValid = () => {
    if (!orderForm.phone) return false;
    if (isInternational) return orderForm.phone.replace(/\D/g, '').length >= 7;
    const digits = orderForm.phone.replace(/^\+?88/, '').replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('0');
  };

  const handleSubmitOrder = async () => {
    setFormTouched(true);
    if (!orderForm.name || !orderForm.phone || !orderForm.address) {
      toast.warning('অনুগ্রহ করে সব তথ্য পূরণ করুন');
      return;
    }
    if (!isBdPhoneValid()) {
      toast.warning(isInternational ? 'Please enter a valid phone number' : 'ফোন নম্বর অবশ্যই 0 দিয়ে শুরু হতে হবে এবং ১১ ডিজিট হতে হবে');
      return;
    }
    if (orderItems.length === 0) {
      toast.warning('অনুগ্রহ করে একটি প্রোডাক্ট নির্বাচন করুন');
      return;
    }

    try {
      setSubmitting(true);
      const subtotal = getSubtotal();
      const deliveryCharge = getDeliveryCharge();
      const total = subtotal + deliveryCharge;

      const orderPayload = {
        customer_name: orderForm.name,
        customer_phone: orderForm.phone,
        shipping_address: orderForm.address,
        notes: orderForm.note || '',
        payment_method: 'cash',
        items: orderItems.map((item) => ({
          product_id: item.product.product_id || null,
          product_name: item.product.name,
          product_image: item.product.image_url || null,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
        })),
        subtotal,
        delivery_charge: deliveryCharge,
        total_amount: total,
        status: 'pending',
        order_source: 'landing_page',
        traffic_source: trafficSource,
        referrer_url: window.location.href,
        utm_source: page.slug,
        utm_medium: 'landing_page',
        utm_campaign: page.title,
      };
      const res = await apiClient.post('/sales', orderPayload);
      const savedOrderId = res.data?.id || res.data?.data?.id;

      apiClient.post(`/landing-pages/${page.id}/increment-order`).catch(() => {});

      if (savedOrderId && sessionIdRef.current && page.id) {
        apiClient.post('/lead-management/incomplete-order/converted', {
          sessionId: sessionIdRef.current,
          landingPageId: page.id,
          orderId: savedOrderId,
        }).catch(() => {});
      }

      if (savedOrderId) {
        window.location.href = `/thank-you?orderId=${savedOrderId}`;
        return;
      } else {
        setSubmitted(true);
        toast.success('আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে! ধন্যবাদ।');
      }
    } catch (err: any) {
      console.error('Order submission error:', err);
      const status = err?.response?.status;
      const savedId = err?.response?.data?.id || err?.response?.data?.data?.id;
      if (savedId) {
        apiClient.post(`/landing-pages/${page?.id}/increment-order`).catch(() => {});
        if (sessionIdRef.current && page?.id) {
          apiClient.post('/lead-management/incomplete-order/converted', {
            sessionId: sessionIdRef.current,
            landingPageId: page.id,
            orderId: savedId,
          }).catch(() => {});
        }
        window.location.href = `/thank-you?orderId=${savedId}`;
        return;
      }
      if (status && status >= 500) {
        setSubmitted(true);
        toast.success('আপনার অর্ডারটি গ্রহণ করা হয়েছে! শীঘ্রই আমরা আপনার সাথে যোগাযোগ করবো।');
      } else {
        toast.error('অর্ডার জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const visibleSections = (page.sections || [])
    .filter((s) => s.is_visible)
    .sort((a, b) => a.order - b.order);

  // Helper: lighten / darken hex
  const adjustColor = (hex: string, amount: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  const primaryLight = adjustColor(page.primary_color, 40);
  const primaryDark = adjustColor(page.primary_color, -30);

  return (
    <>
      <Head>
        <title>{page.meta_title || page.title}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        {page.og_image_url && <meta property="og:image" content={page.og_image_url} />}
        <meta property="og:title" content={page.meta_title || page.title} />
        <meta property="og:description" content={page.meta_description || page.description} />
      </Head>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3); }
          50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.6); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .elegant-fade-in { animation: fadeInUp 0.8s ease-out forwards; }
        .elegant-slide-left { animation: slideInLeft 0.7s ease-out forwards; }
        .elegant-slide-right { animation: slideInRight 0.7s ease-out forwards; }
        .elegant-scale-in { animation: scaleIn 0.6s ease-out forwards; }
        .elegant-float { animation: float 4s ease-in-out infinite; }
        .elegant-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s infinite;
        }
        .elegant-glow { animation: pulseGlow 2.5s ease-in-out infinite; }
        .glass-card {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .glass-card-solid {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: page.background_color }}>

        {/* ═══════════════ HERO SECTION ═══════════════ */}
        <div className="relative overflow-hidden" style={{ minHeight: '85vh' }}>
          {/* Gradient Background */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${page.primary_color} 0%, ${primaryDark} 50%, ${adjustColor(page.primary_color, -60)} 100%)`,
            }}
          />

          {/* Decorative circles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
              style={{ backgroundColor: page.secondary_color }}
            />
            <div
              className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full opacity-5"
              style={{ backgroundColor: page.secondary_color }}
            />
            <div
              className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-5"
              style={{ backgroundColor: page.secondary_color, transform: `translateY(${scrollY * 0.1}px)` }}
            />
          </div>

          {/* Shimmer overlay */}
          <div className="absolute inset-0 elegant-shimmer pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
            <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
              {/* Hero Image */}
              {page.hero_image_url && (
                <div className="w-full md:w-1/2 elegant-slide-left">
                  <div className="relative">
                    {/* Glow behind image */}
                    <div
                      className="absolute inset-4 rounded-3xl blur-3xl opacity-30"
                      style={{ backgroundColor: page.secondary_color }}
                    />
                    <img
                      src={page.hero_image_url}
                      alt={page.title}
                      className="relative w-full max-w-lg mx-auto rounded-3xl shadow-2xl elegant-float"
                      style={{ border: `3px solid rgba(255,255,255,0.15)` }}
                    />
                    {/* Floating badge */}
                    {page.free_delivery && (
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 px-5 py-2.5 rounded-full shadow-xl font-bold text-sm elegant-glow">
                          <FaTruck className="text-lg" />
                          ফ্রি ডেলিভেরি!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hero Text */}
              <div className="w-full md:w-1/2 text-center md:text-left elegant-slide-right">
                {/* Trust badge */}
                <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full glass-card text-sm"
                  style={{ color: page.secondary_color }}
                >
                  <FaShieldAlt className="text-yellow-400" />
                  <span className="font-medium opacity-90">বিশ্বস্ত মানের নিশ্চয়তা</span>
                  <div className="flex gap-0.5 ml-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <FaStar key={s} className="text-yellow-400 text-xs" />
                    ))}
                  </div>
                </div>

                <h1
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-5 leading-tight"
                  style={{ color: page.secondary_color }}
                >
                  {page.hero_title || page.title}
                </h1>

                {page.hero_subtitle && (
                  <p
                    className="text-base sm:text-lg md:text-xl mb-8 leading-relaxed opacity-85"
                    style={{ color: page.secondary_color }}
                  >
                    {page.hero_subtitle}
                  </p>
                )}

                {/* Price preview */}
                {page.products?.[0] && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8">
                    {page.products[0].compare_price && page.products[0].compare_price > page.products[0].price && (
                      <span className="text-lg line-through opacity-60" style={{ color: page.secondary_color }}>
                        ৳{page.products[0].compare_price.toLocaleString()}
                      </span>
                    )}
                    <span className="text-3xl sm:text-4xl font-extrabold px-5 py-2 rounded-xl glass-card"
                      style={{ color: '#FFD700' }}
                    >
                      <span className="text-lg font-normal opacity-80 mr-1">মাত্র</span>
                      ৳{page.products[0].price.toLocaleString()}
                    </span>
                    {page.products[0].compare_price && page.products[0].compare_price > page.products[0].price && (
                      <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                        {Math.round(((page.products[0].compare_price - page.products[0].price) / page.products[0].compare_price) * 100)}% ছাড়!
                      </span>
                    )}
                  </div>
                )}

                {page.hero_button_text && (
                  <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                    <button
                      onClick={scrollToOrderForm}
                      className="group relative px-10 py-4 rounded-2xl text-xl sm:text-2xl font-extrabold shadow-2xl hover:shadow-xl transform hover:scale-105 transition-all duration-300 elegant-glow overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                        color: '#1a1a2e',
                      }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <FaShoppingCart className="text-lg" />
                        {page.hero_button_text}
                      </span>
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                    </button>
                    <div className="flex items-center gap-2 text-sm opacity-70" style={{ color: page.secondary_color }}>
                      <FaArrowDown className="animate-bounce" />
                      <span>নিচে স্ক্রল করুন</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-12 md:h-20">
              <path d="M0,60 C360,100 720,20 1080,60 C1260,80 1380,40 1440,50 L1440,100 L0,100 Z" fill={page.background_color} />
            </svg>
          </div>
        </div>

        {/* ═══════════════ DYNAMIC SECTIONS ═══════════════ */}
        {visibleSections.map((section, sIdx) => (
          <div key={section.id}>
            {/* Benefits Section */}
            {section.type === 'benefits' && (
              <div
                className="py-16 md:py-20 px-4 sm:px-6"
                style={{
                  backgroundColor: section.backgroundColor || '#FFFFFF',
                  color: section.textColor || '#1a1a2e',
                }}
              >
                <div className="max-w-5xl mx-auto">
                  {section.title && (
                    <div className="text-center mb-12">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3">{section.title}</h2>
                      <div
                        className="w-20 h-1 mx-auto rounded-full"
                        style={{ background: `linear-gradient(to right, ${page.primary_color}, ${primaryLight})` }}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(section.items || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div
                          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{
                            background: `linear-gradient(135deg, ${page.primary_color}08 0%, ${page.primary_color}15 100%)`,
                          }}
                        />
                        <div className="relative flex items-start gap-4">
                          <div
                            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${page.primary_color}15 0%, ${page.primary_color}25 100%)`,
                            }}
                          >
                            {item.icon || '✅'}
                          </div>
                          <span className="text-base font-medium leading-relaxed pt-2">{item.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Trust / Why Choose Us */}
            {section.type === 'trust' && (
              <div
                className="py-16 md:py-20 px-4 sm:px-6"
                style={{
                  backgroundColor: section.backgroundColor || '#f8f9fa',
                  color: section.textColor || '#1a1a2e',
                }}
              >
                <div className="max-w-4xl mx-auto">
                  {section.title && (
                    <div className="text-center mb-12">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3">{section.title}</h2>
                      <div
                        className="w-20 h-1 mx-auto rounded-full"
                        style={{ background: `linear-gradient(to right, ${page.primary_color}, ${primaryLight})` }}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(section.items || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/80 shadow-sm hover:shadow-md transition-all border border-gray-50"
                      >
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${page.primary_color}15` }}
                        >
                          <FaCheckCircle style={{ color: page.primary_color }} className="text-lg" />
                        </div>
                        <span className="text-base font-medium">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Image Gallery */}
            {section.type === 'images' && (
              <div
                className="py-16 md:py-20 px-4 sm:px-6"
                style={{ backgroundColor: section.backgroundColor || '#FFFFFF' }}
              >
                <div className="max-w-5xl mx-auto">
                  {section.title && (
                    <div className="text-center mb-12">
                      <h2
                        className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3"
                        style={{ color: section.textColor }}
                      >
                        {section.title}
                      </h2>
                      <div
                        className="w-20 h-1 mx-auto rounded-full"
                        style={{ background: `linear-gradient(to right, ${page.primary_color}, ${primaryLight})` }}
                      />
                    </div>
                  )}
                  <div className={`grid gap-5 ${
                    (section.images || []).length === 1
                      ? 'grid-cols-1 max-w-2xl mx-auto'
                      : (section.images || []).length === 3
                        ? 'grid-cols-1 sm:grid-cols-3'
                        : 'grid-cols-1 sm:grid-cols-2'
                  }`}>
                    {(section.images || []).map((img, idx) => (
                      <div key={idx} className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500">
                        <img
                          src={img}
                          alt={`${page.title} - ${idx + 1}`}
                          className="w-full rounded-2xl transform group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CTA Section */}
            {section.type === 'cta' && (
              <div className="relative overflow-hidden py-16 md:py-20 px-4 sm:px-6">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${section.backgroundColor || page.primary_color} 0%, ${adjustColor(section.backgroundColor || page.primary_color, -30)} 100%)`,
                  }}
                />
                {/* Decorative dots */}
                <div className="absolute inset-0 opacity-5 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(${section.textColor || page.secondary_color} 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                  }}
                />
                <div className="relative max-w-3xl mx-auto text-center">
                  {section.title && (
                    <h2
                      className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4"
                      style={{ color: section.textColor || page.secondary_color }}
                    >
                      {section.title}
                    </h2>
                  )}
                  {section.content && (
                    <p
                      className="text-lg sm:text-xl mb-8 opacity-90 leading-relaxed"
                      style={{ color: section.textColor || page.secondary_color }}
                    >
                      {section.content}
                    </p>
                  )}
                  {section.buttonText && (
                    <button
                      onClick={scrollToOrderForm}
                      className="group relative px-10 py-4 rounded-2xl text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${section.textColor || page.secondary_color}, ${adjustColor(section.textColor || page.secondary_color, -15)})`,
                        color: section.backgroundColor || page.primary_color,
                      }}
                    >
                      <span className="relative z-10">{section.buttonText}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Hero (mid-page) */}
            {section.type === 'hero' && (
              <div className="relative overflow-hidden py-16 md:py-20 px-4 sm:px-6">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${section.backgroundColor || page.primary_color} 0%, ${adjustColor(section.backgroundColor || page.primary_color, -40)} 100%)`,
                  }}
                />
                <div className="relative max-w-4xl mx-auto text-center">
                  {section.title && (
                    <h2
                      className="text-3xl sm:text-4xl font-extrabold mb-5"
                      style={{ color: section.textColor || page.secondary_color }}
                    >
                      {section.title}
                    </h2>
                  )}
                  {section.content && (
                    <p
                      className="text-lg sm:text-xl opacity-90 leading-relaxed max-w-2xl mx-auto"
                      style={{ color: section.textColor || page.secondary_color }}
                    >
                      {section.content}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Custom HTML */}
            {section.type === 'custom-html' && (
              <div
                className="py-12 px-4 sm:px-6"
                style={{
                  backgroundColor: section.backgroundColor || '#FFFFFF',
                  color: section.textColor || '#1a1a2e',
                }}
              >
                <div
                  className="max-w-4xl mx-auto prose prose-lg"
                  dangerouslySetInnerHTML={{ __html: section.content || '' }}
                />
              </div>
            )}
          </div>
        ))}

        {/* ═══════════════ PHONE CTA ═══════════════ */}
        {page.phone_number && (
          <div className="relative overflow-hidden py-10">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${page.primary_color} 0%, ${primaryDark} 100%)`,
              }}
            />
            <div className="relative text-center">
              <p className="text-lg mb-3 opacity-80" style={{ color: page.secondary_color }}>
                প্রশ্ন আছে? এখনই কল করুন
              </p>
              <a
                href={`tel:${page.phone_number}`}
                className="inline-flex items-center gap-3 text-3xl sm:text-4xl font-bold hover:opacity-80 transition-opacity"
                style={{ color: page.secondary_color }}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center glass-card">
                  <FaPhone className="text-xl" />
                </div>
                {page.phone_number}
              </a>
            </div>
          </div>
        )}

        {/* ═══════════════ ORDER FORM ═══════════════ */}
        {page.show_order_form && (
          <div ref={orderFormRef} className="py-16 md:py-20 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto">
              {submitted ? (
                <div className="text-center py-16">
                  <div
                    className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center elegant-scale-in"
                    style={{ background: `linear-gradient(135deg, #22c55e, #16a34a)` }}
                  >
                    <FaCheckCircle className="text-white text-5xl" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-3">
                    আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!
                  </h2>
                  <p className="text-gray-500 text-lg">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
                  <p className="text-gray-400 mt-2">আমাদের একজন কাস্টমার প্রতিনিধি আপনাকে কল করে আবার কনফার্ম করবে</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                  {/* Form header */}
                  <div
                    className="px-6 py-5 text-center"
                    style={{
                      background: `linear-gradient(135deg, ${page.primary_color} 0%, ${primaryDark} 100%)`,
                    }}
                  >
                    <h2
                      className="text-xl sm:text-2xl font-extrabold"
                      style={{ color: page.secondary_color }}
                    >
                      ✨ অর্ডার করতে ফর্মটি পূরণ করুন
                    </h2>
                    {page.delivery_note && (
                      <p className="mt-1.5 text-sm opacity-80" style={{ color: page.secondary_color }}>
                        {page.delivery_note}
                      </p>
                    )}
                  </div>

                  <div className="p-6 sm:p-8">
                    {/* Product Selection */}
                    <div className="mb-8">
                      <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: page.primary_color }}
                        >
                          1
                        </span>
                        প্রোডাক্ট নির্বাচন করুন
                      </h3>
                      <div className="space-y-3">
                        {(page.products || []).map((product) => {
                          const orderItem = orderItems.find((i) => i.product.id === product.id);
                          const isSelected = !!orderItem;
                          const isFeatured = !!product.is_featured;
                          const featuredLabel = product.featured_label || '🔥 বিশেষ অফার';
                          return (
                            <div
                              key={product.id}
                              className={`relative rounded-2xl p-4 cursor-pointer transition-all duration-300 ${
                                isFeatured && !isSelected
                                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg ring-2 ring-amber-200 border-2 border-amber-300'
                                  : isSelected
                                    ? 'shadow-lg border-2 ring-2'
                                    : 'border-2 border-gray-100 hover:border-gray-200 hover:shadow-md bg-white'
                              }`}
                              style={
                                isSelected
                                  ? {
                                      borderColor: page.primary_color,
                                      boxShadow: `0 4px 20px ${page.primary_color}20`,
                                      backgroundColor: `${page.primary_color}05`,
                                    }
                                  : {}
                              }
                              onClick={() => toggleProduct(product)}
                            >
                              {isFeatured && (
                                <div className="absolute -top-3 left-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                                  {featuredLabel}
                                </div>
                              )}
                              <div className={`flex items-start gap-4 ${isFeatured ? 'mt-1' : ''}`}>
                                {/* Selection indicator */}
                                <div
                                  className={`flex-shrink-0 w-6 h-6 mt-1 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected ? 'border-transparent' : 'border-gray-300'
                                  }`}
                                  style={isSelected ? { backgroundColor: page.primary_color } : {}}
                                >
                                  {isSelected && <FaCheckCircle className="text-white text-sm" />}
                                </div>

                                {product.image_url && (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className={`object-cover rounded-xl flex-shrink-0 ${
                                      isFeatured ? 'w-20 h-20 ring-2 ring-amber-200' : 'w-16 h-16'
                                    }`}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className={`font-bold text-sm sm:text-base leading-tight ${
                                    isFeatured ? 'text-amber-900' : 'text-gray-800'
                                  }`}>{product.name}</div>
                                  {product.description && (
                                    <div className="text-xs sm:text-sm text-gray-500 mt-0.5 leading-tight">{product.description}</div>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    {product.compare_price && product.compare_price > product.price && (
                                      <span className="text-sm line-through text-red-400 font-medium">
                                        {product.compare_price.toLocaleString()} ৳
                                      </span>
                                    )}
                                    <span
                                      className="text-lg sm:text-xl font-extrabold px-3 py-0.5 rounded-lg text-white"
                                      style={{ backgroundColor: page.primary_color }}
                                    >
                                      {product.price.toLocaleString()} ৳
                                    </span>
                                    {product.compare_price && product.compare_price > product.price && (
                                      <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                        {Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}% OFF
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <div className="flex items-center gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => updateQuantity(product.id, -1)}
                                        className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                      >
                                        <FaMinus className="text-xs" />
                                      </button>
                                      <span className="w-8 text-center font-bold text-lg">{orderItem!.quantity}</span>
                                      <button
                                        onClick={() => updateQuantity(product.id, 1)}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                                        style={{ backgroundColor: page.primary_color }}
                                      >
                                        <FaPlus className="text-xs" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-8">
                      <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: page.primary_color }}
                        >
                          2
                        </span>
                        আপনার তথ্য
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-semibold mb-1.5 ${formTouched && !orderForm.name ? 'text-red-600' : 'text-gray-700'}`}>
                            নাম *
                          </label>
                          <input
                            type="text"
                            value={orderForm.name}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                            className={`w-full border-2 rounded-xl px-4 py-3 focus:ring-2 focus:border-transparent transition-all ${
                              formTouched && !orderForm.name
                                ? 'border-red-400 bg-red-50'
                                : 'border-gray-200 focus:ring-opacity-30'
                            }`}
                            style={{ ...(formTouched && !orderForm.name ? {} : { '--tw-ring-color': page.primary_color } as any) }}
                            placeholder="আপনার নাম লিখুন"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-semibold mb-1.5 ${formTouched && !orderForm.address ? 'text-red-600' : 'text-gray-700'}`}>
                            সম্পূর্ণ ঠিকানা *
                          </label>
                          <textarea
                            value={orderForm.address}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, address: e.target.value }))}
                            className={`w-full border-2 rounded-xl px-4 py-3 focus:ring-2 focus:border-transparent transition-all ${
                              formTouched && !orderForm.address
                                ? 'border-red-400 bg-red-50'
                                : 'border-gray-200 focus:ring-opacity-30'
                            }`}
                            rows={2}
                            placeholder="সম্পূর্ণ ঠিকানা লিখুন"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-semibold mb-1.5 ${formTouched && (!orderForm.phone || !isBdPhoneValid()) ? 'text-red-600' : 'text-gray-700'}`}>
                            মোবাইল নম্বর *
                          </label>
                          {isInternational ? (
                            <InternationalPhoneInput
                              value={orderForm.phone}
                              onChange={(val) => setOrderForm((prev) => ({ ...prev, phone: val }))}
                              required
                              placeholder="Phone Number"
                            />
                          ) : (
                            <PhoneInput
                              value={orderForm.phone}
                              onChange={(val) => setOrderForm((prev) => ({ ...prev, phone: val }))}
                              required
                              placeholder="01XXXXXXXXX"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            অতিরিক্ত নোট (ঐচ্ছিক)
                          </label>
                          <textarea
                            value={orderForm.note}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, note: e.target.value }))}
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-opacity-30 focus:border-transparent transition-all"
                            rows={2}
                            placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div>
                      <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: page.primary_color }}
                        >
                          3
                        </span>
                        অর্ডার সামারি
                      </h3>

                      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                        <div className="space-y-2 border-b border-gray-200 pb-3 mb-3">
                          {orderItems.map((item) => (
                            <div key={item.product.id} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700 font-medium">
                                {item.product.name} × {item.quantity}
                              </span>
                              <span className="font-bold text-gray-800">
                                {(item.product.price * item.quantity).toLocaleString()} ৳
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Delivery Zone */}
                        {!page.free_delivery && (Number(page.delivery_charge) > 0 || Number(page.delivery_charge_outside) > 0) && (
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">ডেলিভারি এলাকা</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setDeliveryZone('inside')}
                                className={`py-3 px-3 rounded-xl text-sm font-medium border-2 transition-all duration-300 ${
                                  deliveryZone === 'inside'
                                    ? 'text-white shadow-md'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                                style={
                                  deliveryZone === 'inside'
                                    ? { backgroundColor: page.primary_color, borderColor: page.primary_color }
                                    : {}
                                }
                              >
                                ঢাকার ভিতরে
                                <div className="text-xs mt-0.5 opacity-80">
                                  {Number(page.delivery_charge) === 0 ? 'ফ্রি' : `${Number(page.delivery_charge).toLocaleString()} ৳`}
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeliveryZone('outside')}
                                className={`py-3 px-3 rounded-xl text-sm font-medium border-2 transition-all duration-300 ${
                                  deliveryZone === 'outside'
                                    ? 'text-white shadow-md'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                                style={
                                  deliveryZone === 'outside'
                                    ? { backgroundColor: page.primary_color, borderColor: page.primary_color }
                                    : {}
                                }
                              >
                                ঢাকার বাইরে
                                <div className="text-xs mt-0.5 opacity-80">
                                  {Number(page.delivery_charge_outside) === 0 ? 'ফ্রি' : `${Number(page.delivery_charge_outside).toLocaleString()} ৳`}
                                </div>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Charges */}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">সাবটোটাল</span>
                            <span className="font-medium text-gray-700">{getSubtotal().toLocaleString()} ৳</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">ডেলিভারি চার্জ</span>
                            {page.free_delivery || getDeliveryCharge() === 0 ? (
                              <span className="font-bold text-green-600">ফ্রি ✨</span>
                            ) : (
                              <span className="font-medium text-gray-700">{getDeliveryCharge().toLocaleString()} ৳</span>
                            )}
                          </div>
                        </div>

                        {/* Total */}
                        <div
                          className="flex justify-between items-center mt-3 pt-3 border-t-2 border-dashed"
                          style={{ borderColor: `${page.primary_color}30` }}
                        >
                          <span className="text-lg font-extrabold text-gray-800">সর্বমোট</span>
                          <span className="text-2xl font-extrabold" style={{ color: page.primary_color }}>
                            {getTotal().toLocaleString()} ৳
                          </span>
                        </div>

                        {page.delivery_note && (
                          <div className="mt-3 text-xs bg-green-50 text-green-700 rounded-xl px-4 py-2.5 flex items-center gap-2 border border-green-100">
                            <FaTruck className="flex-shrink-0" /> {page.delivery_note}
                          </div>
                        )}

                        {page.cash_on_delivery && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                            <div
                              className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                              style={{ borderColor: page.primary_color }}
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: page.primary_color }}
                              />
                            </div>
                            <span className="font-medium">Cash on Delivery</span>
                          </div>
                        )}

                        <div className="text-xs text-gray-400 mt-3">
                          Your personal data will be used to process your order.
                        </div>

                        {/* Submit Button */}
                        <button
                          onClick={handleSubmitOrder}
                          disabled={submitting || orderItems.length === 0}
                          className="w-full mt-5 py-4 rounded-2xl text-base sm:text-lg font-extrabold text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
                          style={{
                            background: `linear-gradient(135deg, ${page.primary_color} 0%, ${primaryDark} 100%)`,
                          }}
                        >
                          <FaShoppingCart className="text-lg" />
                          {submitting ? 'প্রসেসিং...' : `অর্ডার কনফার্ম করুন — ${getTotal().toLocaleString()} ৳`}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ FLOATING BUTTONS ═══════════════ */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          {page.whatsapp_number && (
            <a
              href={`https://wa.me/${page.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300"
            >
              <FaWhatsapp className="text-2xl" />
            </a>
          )}
          {page.phone_number && (
            <a
              href={`tel:${page.phone_number}`}
              className="w-14 h-14 rounded-full text-white flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})`,
              }}
            >
              <FaPhone className="text-xl" />
            </a>
          )}
        </div>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${page.primary_color} 0%, ${adjustColor(page.primary_color, -50)} 100%)`,
            }}
          />
          <div className="relative py-8 text-center">
            <p
              className="text-sm font-medium opacity-70"
              style={{ color: page.secondary_color }}
            >
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
