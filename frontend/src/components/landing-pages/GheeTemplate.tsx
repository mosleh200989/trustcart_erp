import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import apiClient from '@/services/api';
import PhoneInput from '@/components/PhoneInput';
import InternationalPhoneInput from '@/components/InternationalPhoneInput';
import { useToast } from '@/contexts/ToastContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
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
  FaLeaf,
  FaAward,
  FaHeart,
} from 'react-icons/fa';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/* ─────────────────────────── Interfaces ─────────────────────────── */

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

interface GheeTemplateProps {
  page: LandingPageData;
  trafficSource?: string;
  isInternational?: boolean;
}

/* ─────────────────────────── Component ─────────────────────────── */

export default function GheeTemplate({
  page,
  trafficSource = 'landing_page',
  isInternational = false,
}: GheeTemplateProps) {
  const router = useRouter();
  const orderFormRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroImageRef = useRef<HTMLImageElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [deliveryZone, setDeliveryZone] = useState<'inside' | 'outside'>('outside');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

  // Incomplete-order tracking
  const sessionIdRef = useRef<string>('');
  const trackingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    sessionIdRef.current = `lp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  /* ── GSAP Animations ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ctx = gsap.context(() => {
      // Hero entrance
      if (heroImageRef.current) {
        gsap.fromTo(
          heroImageRef.current,
          { opacity: 0, scale: 0.85, y: 40 },
          { opacity: 1, scale: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.2 },
        );
      }
      if (heroTextRef.current) {
        const children = heroTextRef.current.children;
        gsap.fromTo(
          children,
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 0.9, stagger: 0.15, ease: 'power3.out', delay: 0.4 },
        );
      }

      // Scroll-triggered sections
      if (sectionsRef.current) {
        const blocks = sectionsRef.current.querySelectorAll('.gsap-reveal');
        blocks.forEach((block) => {
          gsap.fromTo(
            block,
            { opacity: 0, y: 60 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: block,
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
            },
          );
        });

        // Stagger benefit cards
        const benefitCards = sectionsRef.current.querySelectorAll('.gsap-benefit-card');
        if (benefitCards.length) {
          gsap.fromTo(
            benefitCards,
            { opacity: 0, y: 40, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.6,
              stagger: 0.1,
              ease: 'back.out(1.4)',
              scrollTrigger: {
                trigger: benefitCards[0],
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
            },
          );
        }

        // Trust items slide in
        const trustItems = sectionsRef.current.querySelectorAll('.gsap-trust-item');
        if (trustItems.length) {
          gsap.fromTo(
            trustItems,
            { opacity: 0, x: -30 },
            {
              opacity: 1,
              x: 0,
              duration: 0.5,
              stagger: 0.08,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: trustItems[0],
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
            },
          );
        }

        // Gallery images
        const galleryImages = sectionsRef.current.querySelectorAll('.gsap-gallery-img');
        if (galleryImages.length) {
          gsap.fromTo(
            galleryImages,
            { opacity: 0, scale: 0.9 },
            {
              opacity: 1,
              scale: 1,
              duration: 0.7,
              stagger: 0.12,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: galleryImages[0],
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
            },
          );
        }
      }

      // Order form reveal
      if (orderFormRef.current) {
        gsap.fromTo(
          orderFormRef.current,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: orderFormRef.current,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          },
        );
      }
    });

    return () => ctx.revert();
  }, [page]);

  /* ── Incomplete order tracking ── */
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
    const stage =
      orderForm.name && orderForm.phone && orderForm.address
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

  /* ── Init default product ── */
  useEffect(() => {
    if (page.products?.length > 0) {
      const def = page.products.find((p) => p.is_default) || page.products[0];
      setOrderItems([{ product: def, quantity: 1 }]);
    }
  }, [page]);

  /* ── Helpers ── */
  const scrollToOrderForm = () => orderFormRef.current?.scrollIntoView({ behavior: 'smooth' });

  const updateQuantity = (productId: string, delta: number) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item,
      ),
    );
  };

  const toggleProduct = (product: LandingPageProduct) => {
    setOrderItems([{ product, quantity: 1 }]);
  };

  const getSubtotal = () => orderItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const getDeliveryCharge = () => {
    if (page.free_delivery) return 0;
    return deliveryZone === 'inside' ? Number(page.delivery_charge || 0) : Number(page.delivery_charge_outside || 0);
  };
  const getTotal = () => getSubtotal() + getDeliveryCharge();

  const isBdPhoneValid = () => {
    if (!orderForm.phone) return false;
    if (isInternational) return orderForm.phone.replace(/\D/g, '').length >= 7;
    const digits = orderForm.phone.replace(/^\+?88/, '').replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('0');
  };

  const adjustColor = (hex: string, amount: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  const primaryDark = adjustColor(page.primary_color, -30);

  /* ── Order submit ── */
  const handleSubmitOrder = async () => {
    setFormTouched(true);
    if (!orderForm.name || !orderForm.phone || !orderForm.address) {
      toast.warning('অনুগ্রহ করে সব তথ্য পূরণ করুন');
      return;
    }
    if (!isBdPhoneValid()) {
      toast.warning(
        isInternational
          ? 'Please enter a valid phone number'
          : 'ফোন নম্বর অবশ্যই 0 দিয়ে শুরু হতে হবে এবং ১১ ডিজিট হতে হবে',
      );
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
        status: 'processing',
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
        apiClient
          .post('/lead-management/incomplete-order/converted', {
            sessionId: sessionIdRef.current,
            landingPageId: page.id,
            orderId: savedOrderId,
          })
          .catch(() => {});
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
          apiClient
            .post('/lead-management/incomplete-order/converted', {
              sessionId: sessionIdRef.current,
              landingPageId: page.id,
              orderId: savedId,
            })
            .catch(() => {});
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

  /* ════════════════════════════ RENDER ════════════════════════════ */
  return (
    <>
      <Head>
        <title>{page.meta_title || page.title}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        {page.og_image_url && <meta property="og:image" content={page.og_image_url} />}
        <meta property="og:title" content={page.meta_title || page.title} />
        <meta property="og:description" content={page.meta_description || page.description} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        .ghee-page {
          font-family: 'Hind Siliguri', sans-serif;
        }
        .ghee-page * {
          font-family: 'Hind Siliguri', sans-serif;
        }
        .ghee-heading {
          font-family: 'Hind Siliguri', sans-serif;
        }
        .ghee-num {
          font-family: 'Arial', 'Helvetica Neue', sans-serif;
          font-weight: 700;
        }

        /* ── Warm grain overlay for premium feel ── */
        .ghee-grain::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0.04;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
        }

        /* ── Decorative divider ── */
        .ghee-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
          margin: 0 auto 2rem;
          max-width: 220px;
        }
        .ghee-divider::before,
        .ghee-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, currentColor, transparent);
          opacity: 0.3;
        }

        /* ── CTA button hover ripple ── */
        .ghee-btn-ripple {
          position: relative;
          overflow: hidden;
        }
        .ghee-btn-ripple::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.3) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.4s;
        }
        .ghee-btn-ripple:hover::after {
          opacity: 1;
        }

        /* ── Strikethrough ── */
        .ghee-strike {
          position: relative;
          text-decoration: line-through;
          text-decoration-color: #ef4444;
          text-decoration-thickness: 3px;
          color: #9ca3af;
        }

        /* ── Parallax grain on hero ── */
        .ghee-hero-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(circle at 20% 80%, rgba(255,215,0,0.08) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(255,215,0,0.06) 0%, transparent 50%);
        }

        /* ── Product card hover ── */
        .ghee-product-card {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ghee-product-card:hover {
          transform: translateY(-2px);
        }

        /* ── Smooth input focus ── */
        .ghee-input {
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .ghee-input:focus {
          outline: none;
        }
      `}</style>

      <div className="ghee-page min-h-screen" style={{ backgroundColor: '#FFF9F0' }}>
        {/* ═══════════════════ TOP BAR ═══════════════════ */}
        <div
          className="relative overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${page.primary_color}, ${primaryDark})` }}
        >
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium" style={{ color: page.secondary_color }}>
            <FaShieldAlt className="text-yellow-300 text-xs" />
            <span className="opacity-90">100% খাঁটি ও প্রাকৃতিক</span>
            <span className="opacity-40">|</span>
            <FaTruck className="text-yellow-300 text-xs" />
            <span className="opacity-90">{page.free_delivery ? 'সম্পূর্ণ ফ্রি ডেলিভেরি' : 'দ্রুত ডেলিভেরি'}</span>
            <span className="opacity-40 hidden sm:inline">|</span>
            <span className="opacity-90 hidden sm:inline">
              <FaStar className="text-yellow-300 text-xs inline mr-1" />
              বিশ্বস্ত মানের নিশ্চয়তা
            </span>
          </div>
        </div>

        {/* ═══════════════════ HERO ═══════════════════ */}
        <div ref={heroRef} className="relative overflow-hidden ghee-grain" style={{ minHeight: '80vh' }}>
          {/* Warm ambient background */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg, #FFFBF2 0%, #FFF3E0 35%, ${page.primary_color}12 70%, #FFF8ED 100%)`,
            }}
          />
          <div className="ghee-hero-pattern" />

          {/* Subtle decorative shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-[0.06]"
              style={{ background: `radial-gradient(circle, ${page.primary_color}, transparent)` }}
            />
            <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-[0.04]"
              style={{ background: `radial-gradient(circle, ${page.primary_color}, transparent)` }}
            />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="flex flex-col-reverse md:flex-row items-center gap-12 md:gap-16 lg:gap-20">
              {/* Hero Text */}
              <div ref={heroTextRef} className="w-full md:w-1/2 text-center md:text-left">
                {/* Tagline */}
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border"
                  style={{
                    backgroundColor: `${page.primary_color}10`,
                    borderColor: `${page.primary_color}25`,
                    color: page.primary_color,
                  }}
                >
                  <FaLeaf className="text-xs" />
                  সম্পূর্ণ প্রাকৃতিক ও খাঁটি
                </div>

                <h1
                  className="ghee-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold mb-6 leading-[1.15] whitespace-pre-line"
                  style={{ color: '#2D1B07' }}
                >
                  {page.hero_title || page.title}
                </h1>

                {page.hero_subtitle && (
                  <p className="text-base sm:text-lg md:text-xl mb-8 leading-relaxed text-[#5D4E37] whitespace-pre-line max-w-lg mx-auto md:mx-0">
                    {page.hero_subtitle}
                  </p>
                )}

                {/* Price badge */}
                {page.products?.[0] && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-8">
                    {page.products[0].compare_price && page.products[0].compare_price > page.products[0].price && (
                      <span className="ghee-strike ghee-num text-xl sm:text-2xl">
                        ৳{page.products[0].compare_price.toLocaleString()}
                      </span>
                    )}
                    <div
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-sm border"
                      style={{
                        backgroundColor: `${page.primary_color}10`,
                        borderColor: `${page.primary_color}20`,
                      }}
                    >
                      <span className="text-sm text-[#8B7355] leading-none">মাত্র</span>
                      <span className="ghee-num text-3xl sm:text-4xl leading-none" style={{ color: page.primary_color }}>
                        ৳{page.products[0].price.toLocaleString()}
                      </span>
                    </div>
                    {page.products[0].compare_price && page.products[0].compare_price > page.products[0].price && (
                      <span className="text-xs sm:text-sm font-bold text-white px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 shadow-md">
                        {Math.round(
                          ((page.products[0].compare_price - page.products[0].price) /
                            page.products[0].compare_price) *
                            100,
                        )}
                        % ছাড়
                      </span>
                    )}
                  </div>
                )}

                {page.hero_button_text && (
                  <button
                    onClick={scrollToOrderForm}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty('--x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                      e.currentTarget.style.setProperty('--y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                    }}
                    className="ghee-btn-ripple inline-flex items-center gap-3 px-10 py-4 rounded-full text-lg sm:text-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.03] transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})`,
                      color: page.secondary_color,
                    }}
                  >
                    <FaShoppingCart className="text-base" />
                    {page.hero_button_text}
                  </button>
                )}
              </div>

              {/* Hero Image */}
              {page.hero_image_url && (
                <div className="w-full md:w-1/2 flex justify-center">
                  <div className="relative w-full max-w-md">
                    {/* Soft golden glow */}
                    <div
                      className="absolute inset-8 rounded-[2rem] blur-[60px] opacity-20"
                      style={{ backgroundColor: page.primary_color }}
                    />
                    <img
                      ref={heroImageRef}
                      src={page.hero_image_url}
                      alt={page.title}
                      className="relative w-full rounded-[2rem] shadow-2xl"
                      style={{
                        border: '4px solid rgba(255,255,255,0.8)',
                        boxShadow: '0 25px 60px -12px rgba(0,0,0,0.12), 0 8px 24px -4px rgba(0,0,0,0.06)',
                      }}
                    />
                    {page.free_delivery && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                        <div
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold shadow-lg border border-white/50"
                          style={{
                            background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
                            color: '#422006',
                          }}
                        >
                          <FaTruck /> ফ্রি ডেলিভেরি
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Elegant bottom divider */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />
        </div>

        {/* ═══════════════════ SECTIONS ═══════════════════ */}
        <div ref={sectionsRef}>
          {visibleSections.map((section) => (
            <div key={section.id}>
              {/* ─── Benefits ─── */}
              {section.type === 'benefits' && (
                <div
                  className="gsap-reveal py-16 md:py-24 px-4 sm:px-6"
                  style={{
                    backgroundColor: section.backgroundColor || '#FFFCF5',
                    color: section.textColor || '#2D1B07',
                  }}
                >
                  <div className="max-w-5xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-14">
                        <h2 className="ghee-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                          {section.title}
                        </h2>
                        <div className="ghee-divider" style={{ color: page.primary_color }}>
                          <FaLeaf className="text-sm opacity-60" />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(section.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="gsap-benefit-card group bg-white rounded-2xl p-6 border border-amber-100/60 hover:border-amber-200 transition-all duration-400 hover:shadow-[0_8px_30px_-6px_rgba(217,169,78,0.15)]"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110"
                              style={{ backgroundColor: `${page.primary_color}12` }}
                            >
                              {item.icon || '✦'}
                            </div>
                            <span className="text-base font-medium leading-relaxed pt-2 text-[#3D2E1C]">
                              {item.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Trust ─── */}
              {section.type === 'trust' && (
                <div
                  className="gsap-reveal py-16 md:py-24 px-4 sm:px-6"
                  style={{
                    backgroundColor: section.backgroundColor || '#FFF8ED',
                    color: section.textColor || '#2D1B07',
                  }}
                >
                  <div className="max-w-4xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-14">
                        <h2 className="ghee-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                          {section.title}
                        </h2>
                        <div className="ghee-divider" style={{ color: page.primary_color }}>
                          <FaShieldAlt className="text-sm opacity-60" />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(section.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="gsap-trust-item flex items-center gap-4 p-4 rounded-xl bg-white border border-amber-100/50 hover:shadow-md transition-all duration-300"
                        >
                          <div
                            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${page.primary_color}10` }}
                          >
                            <FaCheckCircle style={{ color: page.primary_color }} className="text-sm" />
                          </div>
                          <span className="text-base font-medium text-[#3D2E1C]">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Images ─── */}
              {section.type === 'images' && (
                <div
                  className="gsap-reveal py-16 md:py-24 px-4 sm:px-6"
                  style={{ backgroundColor: section.backgroundColor || '#FFFCF5' }}
                >
                  <div className="max-w-5xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-14">
                        <h2
                          className="ghee-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-3"
                          style={{ color: section.textColor || '#2D1B07' }}
                        >
                          {section.title}
                        </h2>
                        <div className="ghee-divider" style={{ color: page.primary_color }}>
                          <span className="text-sm opacity-60">✦</span>
                        </div>
                      </div>
                    )}
                    <div
                      className={`grid gap-5 ${
                        (section.images || []).length === 1
                          ? 'grid-cols-1 max-w-2xl mx-auto'
                          : (section.images || []).length === 3
                            ? 'grid-cols-1 sm:grid-cols-3'
                            : 'grid-cols-1 sm:grid-cols-2'
                      }`}
                    >
                      {(section.images || []).map((img, idx) => (
                        <div
                          key={idx}
                          className="gsap-gallery-img group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-500"
                        >
                          <img
                            src={img}
                            alt={`${page.title} - ${idx + 1}`}
                            className="w-full rounded-2xl transform group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── CTA ─── */}
              {section.type === 'cta' && (
                <div className="gsap-reveal relative overflow-hidden py-16 md:py-20 px-4 sm:px-6 ghee-grain">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${section.backgroundColor || page.primary_color} 0%, ${adjustColor(section.backgroundColor || page.primary_color, -40)} 100%)`,
                    }}
                  />
                  <div className="relative max-w-3xl mx-auto text-center">
                    {section.title && (
                      <h2
                        className="ghee-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
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
                        className="ghee-btn-ripple inline-flex items-center gap-2 px-10 py-4 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-[1.04] transition-all duration-300"
                        style={{
                          background: `linear-gradient(135deg, ${section.textColor || page.secondary_color}, ${adjustColor(section.textColor || page.secondary_color, -15)})`,
                          color: section.backgroundColor || page.primary_color,
                        }}
                      >
                        {section.buttonText}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Hero (mid-page) ─── */}
              {section.type === 'hero' && (
                <div className="gsap-reveal relative overflow-hidden py-16 md:py-20 px-4 sm:px-6 ghee-grain">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(160deg, ${section.backgroundColor || page.primary_color} 0%, ${adjustColor(section.backgroundColor || page.primary_color, -50)} 100%)`,
                    }}
                  />
                  <div className="relative max-w-4xl mx-auto text-center">
                    {section.title && (
                      <h2
                        className="ghee-heading text-3xl sm:text-4xl font-bold mb-5"
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

              {/* ─── Custom HTML ─── */}
              {section.type === 'custom-html' && (
                <div
                  className="gsap-reveal py-12 px-4 sm:px-6"
                  style={{
                    backgroundColor: section.backgroundColor || '#FFFCF5',
                    color: section.textColor || '#2D1B07',
                  }}
                >
                  <div
                    className="max-w-4xl mx-auto prose prose-lg prose-amber"
                    dangerouslySetInnerHTML={{ __html: section.content || '' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ═══════════════════ PHONE CTA ═══════════════════ */}
        {page.phone_number && (
          <div className="relative overflow-hidden py-10 ghee-grain">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${page.primary_color} 0%, ${primaryDark} 100%)`,
              }}
            />
            <div className="relative text-center">
              <p className="text-base mb-3 opacity-80" style={{ color: page.secondary_color }}>
                প্রশ্ন আছে? এখনই কল করুন
              </p>
              <a
                href={`tel:${page.phone_number}`}
                className="inline-flex items-center gap-3 text-2xl sm:text-3xl font-bold hover:opacity-80 transition-opacity"
                style={{ color: page.secondary_color }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center border border-white/20"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                >
                  <FaPhone className="text-lg" />
                </div>
                <span className="ghee-num">{page.phone_number}</span>
              </a>
            </div>
          </div>
        )}

        {/* ═══════════════════ ORDER FORM ═══════════════════ */}
        {page.show_order_form && (
          <div
            ref={orderFormRef}
            className="py-16 md:py-24 px-4 sm:px-6"
            style={{ backgroundColor: '#FFF8ED' }}
          >
            <div className="max-w-xl mx-auto">
              {submitted ? (
                /* ── Success State ── */
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
                    <FaCheckCircle className="text-white text-4xl" />
                  </div>
                  <h2 className="ghee-heading text-2xl sm:text-3xl font-bold text-[#2D1B07] mb-3">
                    আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!
                  </h2>
                  <p className="text-[#8B7355] text-lg">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
                  <p className="text-[#A99B85] mt-2 text-sm">
                    আমাদের একজন কাস্টমার প্রতিনিধি আপনাকে কল করে আবার কনফার্ম করবে
                  </p>
                </div>
              ) : (
                /* ── Order Form ── */
                <div className="bg-white rounded-3xl shadow-[0_8px_40px_-8px_rgba(139,115,85,0.12)] overflow-hidden border border-amber-100/60">
                  {/* Header */}
                  <div
                    className="px-6 py-5 text-center ghee-grain relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})`,
                    }}
                  >
                    <h2
                      className="ghee-heading text-xl sm:text-2xl font-bold relative z-10"
                      style={{ color: page.secondary_color }}
                    >
                      অর্ডার করুন
                    </h2>
                    {page.delivery_note && (
                      <p className="mt-1 text-sm opacity-80 relative z-10" style={{ color: page.secondary_color }}>
                        {page.delivery_note}
                      </p>
                    )}
                  </div>

                  <div className="p-6 sm:p-8">
                    {/* ── Step 1: Products ── */}
                    <div className="mb-8">
                      <h3 className="font-bold text-[#2D1B07] mb-4 text-base flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})` }}
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
                              className={`ghee-product-card relative rounded-2xl p-3 sm:p-4 cursor-pointer ${
                                isFeatured && !isSelected
                                  ? 'bg-gradient-to-r from-amber-50/50 to-orange-50/50 ring-1 ring-amber-100 border border-amber-100'
                                  : isSelected
                                    ? 'ring-2 border-[3px] shadow-lg shadow-amber-200/40'
                                    : 'border border-gray-100 hover:border-amber-200/60 bg-gray-50/30'
                              }`}
                              style={
                                isSelected
                                  ? {
                                      borderColor: page.primary_color,
                                      backgroundColor: `${page.primary_color}15`,
                                    }
                                  : {}
                              }
                              onClick={() => toggleProduct(product)}
                            >
                              {isSelected && (
                                <div
                                  className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full"
                                  style={{ backgroundColor: page.primary_color }}
                                />
                              )}
                              {isFeatured && (
                                <div className="absolute -top-2.5 left-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow">
                                  {featuredLabel}
                                </div>
                              )}
                              <div className={`flex items-center gap-3 sm:gap-4 ${isFeatured ? 'mt-1' : ''}`}>
                                <div
                                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                    isSelected ? 'border-transparent scale-110' : 'border-gray-300'
                                  }`}
                                  style={isSelected ? { backgroundColor: page.primary_color } : {}}
                                >
                                  {isSelected && <FaCheckCircle className="text-white text-[10px]" />}
                                </div>
                                {product.image_url && (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className={`object-cover rounded-xl flex-shrink-0 transition-shadow duration-300 ${
                                      isSelected
                                        ? 'w-16 h-16 sm:w-18 sm:h-18 shadow-md'
                                        : 'w-14 h-14 sm:w-16 sm:h-16'
                                    }`}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm sm:text-base text-[#2D1B07] leading-tight">
                                    {product.name}
                                  </div>
                                  {product.description && (
                                    <div className="text-xs text-[#8B7355] mt-0.5 leading-tight">
                                      {product.description}
                                    </div>
                                  )}
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
                                    {product.compare_price && product.compare_price > product.price && (
                                      <span className="text-xs line-through text-red-400 font-medium">
                                        {product.compare_price.toLocaleString()} ৳
                                      </span>
                                    )}
                                    <span
                                      className="ghee-num text-base sm:text-lg font-bold"
                                      style={{ color: page.primary_color }}
                                    >
                                      {product.price.toLocaleString()} ৳
                                    </span>
                                    {product.compare_price && product.compare_price > product.price && (
                                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                        {Math.round(
                                          ((product.compare_price - product.price) / product.compare_price) * 100,
                                        )}
                                        % OFF
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <div
                                      className="flex items-center gap-3 mt-2.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        onClick={() => updateQuantity(product.id, -1)}
                                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors active:scale-95"
                                      >
                                        <FaMinus className="text-xs text-gray-600" />
                                      </button>
                                      <span className="w-6 text-center font-bold text-base ghee-num">
                                        {orderItem!.quantity}
                                      </span>
                                      <button
                                        onClick={() => updateQuantity(product.id, 1)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-all active:scale-95"
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

                    {/* ── Step 2: Info ── */}
                    <div className="mb-8">
                      <h3 className="font-bold text-[#2D1B07] mb-4 text-base flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})` }}
                        >
                          2
                        </span>
                        আপনার তথ্য
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label
                            className={`block text-sm font-semibold mb-1.5 ${formTouched && !orderForm.name ? 'text-red-600' : 'text-[#5D4E37]'}`}
                          >
                            নাম *
                          </label>
                          <input
                            type="text"
                            value={orderForm.name}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                            className={`ghee-input w-full border rounded-xl px-4 py-3 ${
                              formTouched && !orderForm.name
                                ? 'border-red-300 bg-red-50/50'
                                : 'border-amber-200/60 bg-amber-50/20 focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(217,169,78,0.1)]'
                            }`}
                            placeholder="আপনার নাম লিখুন"
                          />
                        </div>
                        <div>
                          <label
                            className={`block text-sm font-semibold mb-1.5 ${formTouched && !orderForm.address ? 'text-red-600' : 'text-[#5D4E37]'}`}
                          >
                            সম্পূর্ণ ঠিকানা *
                          </label>
                          <textarea
                            value={orderForm.address}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, address: e.target.value }))}
                            className={`ghee-input w-full border rounded-xl px-4 py-3 ${
                              formTouched && !orderForm.address
                                ? 'border-red-300 bg-red-50/50'
                                : 'border-amber-200/60 bg-amber-50/20 focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(217,169,78,0.1)]'
                            }`}
                            rows={2}
                            placeholder="সম্পূর্ণ ঠিকানা লিখুন"
                          />
                        </div>
                        <div>
                          <label
                            className={`block text-sm font-semibold mb-1.5 ${formTouched && (!orderForm.phone || !isBdPhoneValid()) ? 'text-red-600' : 'text-[#5D4E37]'}`}
                          >
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
                          <label className="block text-sm font-semibold text-[#5D4E37] mb-1.5">
                            অতিরিক্ত নোট (ঐচ্ছিক)
                          </label>
                          <textarea
                            value={orderForm.note}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, note: e.target.value }))}
                            className="ghee-input w-full border border-amber-200/60 bg-amber-50/20 rounded-xl px-4 py-3 focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(217,169,78,0.1)]"
                            rows={2}
                            placeholder="কোনো বিশেষ নির্দেশনা..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Step 3: Summary ── */}
                    <div>
                      <h3 className="font-bold text-[#2D1B07] mb-4 text-base flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})` }}
                        >
                          3
                        </span>
                        অর্ডার সামারি
                      </h3>
                      <div className="rounded-2xl border border-amber-100/60 bg-gradient-to-b from-amber-50/40 to-white p-5">
                        {/* Items */}
                        <div className="space-y-2 border-b border-amber-100 pb-3 mb-3">
                          {orderItems.map((item) => (
                            <div key={item.product.id} className="flex justify-between text-sm">
                              <span className="text-[#5D4E37]">
                                {item.product.name} × {item.quantity}
                              </span>
                              <span className="font-semibold text-[#2D1B07] ghee-num">
                                {(item.product.price * item.quantity).toLocaleString()} ৳
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Delivery zone */}
                        {!page.free_delivery &&
                          (Number(page.delivery_charge) > 0 || Number(page.delivery_charge_outside) > 0) && (
                            <div className="mb-4">
                              <label className="block text-sm font-semibold text-[#5D4E37] mb-2">
                                ডেলিভারি এলাকা
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {(['inside', 'outside'] as const).map((zone) => (
                                  <button
                                    key={zone}
                                    type="button"
                                    onClick={() => setDeliveryZone(zone)}
                                    className={`py-3 px-3 rounded-xl text-sm font-medium border transition-all duration-300 ${
                                      deliveryZone === zone
                                        ? 'text-white shadow-sm border-transparent'
                                        : 'border-amber-200/60 bg-white text-[#5D4E37] hover:border-amber-300'
                                    }`}
                                    style={
                                      deliveryZone === zone
                                        ? { background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})` }
                                        : {}
                                    }
                                  >
                                    {zone === 'inside' ? 'ঢাকার ভিতরে' : 'ঢাকার বাইরে'}
                                    <div className="text-xs mt-0.5 opacity-80">
                                      {zone === 'inside'
                                        ? Number(page.delivery_charge) === 0
                                          ? 'ফ্রি'
                                          : `${Number(page.delivery_charge).toLocaleString()} ৳`
                                        : Number(page.delivery_charge_outside) === 0
                                          ? 'ফ্রি'
                                          : `${Number(page.delivery_charge_outside).toLocaleString()} ৳`}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Totals */}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#8B7355]">সাবটোটাল</span>
                            <span className="font-medium text-[#5D4E37] ghee-num">
                              {getSubtotal().toLocaleString()} ৳
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#8B7355]">ডেলিভারি চার্জ</span>
                            {page.free_delivery || getDeliveryCharge() === 0 ? (
                              <span className="font-semibold text-green-600">ফ্রি ✦</span>
                            ) : (
                              <span className="font-medium text-[#5D4E37] ghee-num">
                                {getDeliveryCharge().toLocaleString()} ৳
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className="flex justify-between items-center mt-4 pt-4 border-t-2 border-dashed"
                          style={{ borderColor: `${page.primary_color}25` }}
                        >
                          <span className="text-base font-bold text-[#2D1B07]">সর্বমোট</span>
                          <span className="ghee-num text-2xl font-bold" style={{ color: page.primary_color }}>
                            {getTotal().toLocaleString()} ৳
                          </span>
                        </div>

                        {page.delivery_note && (
                          <div className="mt-3 text-xs text-green-700 bg-green-50 rounded-xl px-4 py-2.5 flex items-center gap-2 border border-green-100">
                            <FaTruck className="flex-shrink-0 text-green-500" /> {page.delivery_note}
                          </div>
                        )}

                        {page.cash_on_delivery && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-[#5D4E37]">
                            <div
                              className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                              style={{ borderColor: page.primary_color }}
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: page.primary_color }}
                              />
                            </div>
                            <span className="font-medium">Cash on Delivery</span>
                          </div>
                        )}

                        <p className="text-[10px] text-[#A99B85] mt-3">
                          Your personal data will be used to process your order.
                        </p>

                        {/* Submit */}
                        <button
                          onClick={handleSubmitOrder}
                          disabled={submitting || orderItems.length === 0}
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            e.currentTarget.style.setProperty(
                              '--x',
                              `${((e.clientX - rect.left) / rect.width) * 100}%`,
                            );
                            e.currentTarget.style.setProperty(
                              '--y',
                              `${((e.clientY - rect.top) / rect.height) * 100}%`,
                            );
                          }}
                          className="ghee-btn-ripple w-full mt-5 py-4 rounded-2xl text-sm sm:text-base font-bold text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center gap-2"
                          style={{
                            background: `linear-gradient(135deg, ${page.primary_color} 0%, ${primaryDark} 100%)`,
                          }}
                        >
                          <FaShoppingCart className="text-sm flex-shrink-0" />
                          <span>
                            {submitting
                              ? 'প্রসেসিং...'
                              : `অর্ডার কনফার্ম করুন — ${getTotal().toLocaleString()} ৳`}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════ FLOATING BUTTONS ═══════════════════ */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          {page.whatsapp_number && (
            <a
              href={`https://wa.me/${page.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-br from-green-400 to-green-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
              style={{ width: 52, height: 52 }}
            >
              <FaWhatsapp className="text-2xl" />
            </a>
          )}
          {page.phone_number && (
            <a
              href={`tel:${page.phone_number}`}
              className="rounded-full text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
              style={{
                width: 52,
                height: 52,
                background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})`,
              }}
            >
              <FaPhone className="text-lg" />
            </a>
          )}
        </div>

        {/* ═══════════════════ FOOTER ═══════════════════ */}
        <div style={{ backgroundColor: '#2D1B07' }}>
          <div className="py-10 text-center space-y-4">
            <div>
              <p className="text-sm sm:text-base font-medium text-amber-100/80 mb-2">
                আমাদের আরো প্রোডাক্ট পেতে ভিজিট করুন
              </p>
              <a
                href="https://trustcart.com.bd"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-opacity duration-300"
                style={{
                  backgroundColor: page.primary_color,
                  color: page.secondary_color,
                }}
              >
                trustcart.com.bd →
              </a>
            </div>
            <p className="text-xs font-medium text-amber-200/40">
              © {new Date().getFullYear()} TrustCart. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
