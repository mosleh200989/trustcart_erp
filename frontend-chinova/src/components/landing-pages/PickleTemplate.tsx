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
  FaPepperHot,
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
  qty?: number;
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

interface PickleTemplateProps {
  page: LandingPageData;
  trafficSource?: string;
  isInternational?: boolean;
}

/* ─────────────────────────── Component ─────────────────────────── */

export default function PickleTemplate({
  page,
  trafficSource = 'landing_page',
  isInternational = false,
}: PickleTemplateProps) {
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
              scrollTrigger: { trigger: block, start: 'top 85%', toggleActions: 'play none none none' },
            },
          );
        });

        const benefitCards = sectionsRef.current.querySelectorAll('.gsap-benefit-card');
        if (benefitCards.length) {
          gsap.fromTo(
            benefitCards,
            { opacity: 0, y: 40, scale: 0.95 },
            {
              opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.4)',
              scrollTrigger: { trigger: benefitCards[0], start: 'top 85%', toggleActions: 'play none none none' },
            },
          );
        }

        const trustItems = sectionsRef.current.querySelectorAll('.gsap-trust-item');
        if (trustItems.length) {
          gsap.fromTo(
            trustItems,
            { opacity: 0, x: -30 },
            {
              opacity: 1, x: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out',
              scrollTrigger: { trigger: trustItems[0], start: 'top 85%', toggleActions: 'play none none none' },
            },
          );
        }

        const galleryImages = sectionsRef.current.querySelectorAll('.gsap-gallery-img');
        if (galleryImages.length) {
          gsap.fromTo(
            galleryImages,
            { opacity: 0, scale: 0.9 },
            {
              opacity: 1, scale: 1, duration: 0.7, stagger: 0.12, ease: 'power2.out',
              scrollTrigger: { trigger: galleryImages[0], start: 'top 85%', toggleActions: 'play none none none' },
            },
          );
        }
      }

      if (orderFormRef.current) {
        gsap.fromTo(
          orderFormRef.current,
          { opacity: 0, y: 50 },
          {
            opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: orderFormRef.current, start: 'top 85%', toggleActions: 'play none none none' },
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

  // Auto-detect Dhaka in address and set delivery zone
  useEffect(() => {
    const addr = orderForm.address.toLowerCase();
    if (addr.includes('dhaka') || addr.includes('ঢাকা')) {
      setDeliveryZone('inside');
    } else if (addr.length > 10 && !addr.includes('dhaka') && !addr.includes('ঢাকা')) {
      setDeliveryZone('outside');
    }
  }, [orderForm.address]);

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
          : 'ফোন নম্বর অবশ্যই 0 দিয়ে শুরু হতে হবে এবং 11 ডিজিট হতে হবে',
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
        items: orderItems.map((item) => {
          const productQty = item.product.qty || 1;
          const effectiveQty = item.quantity * productQty;
          const perUnitPrice = item.product.price / productQty;
          return {
            product_id: item.product.product_id || null,
            product_name: item.product.name,
            product_image: item.product.image_url || null,
            quantity: effectiveQty,
            unit_price: perUnitPrice,
            total_price: perUnitPrice * effectiveQty,
          };
        }),
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
          href="https://fonts.googleapis.com/css2?family=Tiro+Bangla:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        .pickle-page {
          font-family: 'Tiro Bangla', serif;
        }
        .pickle-page * {
          font-family: 'Tiro Bangla', serif;
        }
        .pickle-heading {
          font-family: 'Tiro Bangla', serif;
          font-weight: 600;
        }
        .pickle-num {
          font-family: 'Arial', 'Helvetica Neue', sans-serif;
          font-weight: 700;
        }

        /* ── Spicy grain overlay ── */
        .pickle-grain::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0.04;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
        }

        /* ── CTA button hover ripple ── */
        .pickle-btn-ripple {
          position: relative;
          overflow: hidden;
        }
        .pickle-btn-ripple::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.3) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.4s;
        }
        .pickle-btn-ripple:hover::after {
          opacity: 1;
        }

        /* ── Strikethrough handled via Tailwind utilities on the element ── */

        /* ── Spicy hero pattern ── */
        .pickle-hero-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(circle at 20% 80%, rgba(180,60,20,0.06) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(200,80,30,0.05) 0%, transparent 50%);
        }

        /* ── Product card hover ── */
        .pickle-product-card {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pickle-product-card:hover {
          transform: translateY(-2px);
        }

        /* ── Smooth input focus ── */
        .pickle-input {
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .pickle-input:focus {
          outline: none;
        }

        /* ── Discount Badge Bounce Animation ── */
        @keyframes discountBounce {
          0%, 100% {
            transform: translateY(0) scale(1);
            box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.3);
          }
          25% {
            transform: translateY(-4px) scale(1.05);
            box-shadow: 0 2px 8px rgba(22, 163, 74, 0.35);
          }
          50% {
            transform: translateY(0) scale(1);
          }
          75% {
            transform: translateY(-2px) scale(1.03);
            box-shadow: 0 1px 6px rgba(22, 163, 74, 0.25);
          }
        }
        .pickle-discount-badge {
          animation: discountBounce 1.8s ease-in-out infinite !important;
          display: inline-block !important;
          will-change: transform;
        }

        /* ── Featured Glow Animation ── */
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(251, 146, 60, 0.4);
          }
          50% {
            box-shadow: 0 0 35px rgba(251, 146, 60, 0.7);
          }
        }
      `}</style>

      <div className="pickle-page min-h-screen" style={{ backgroundColor: '#FFF5F0' }}>
        {/* ═══════════════════ TOP BAR ═══════════════════ */}
        <div
          className="relative overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${page.primary_color}, ${primaryDark})` }}
        >
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium" style={{ color: page.secondary_color }}>
            <FaShieldAlt className="text-yellow-300 text-xs" />
            <span className="opacity-90">100% ঘরোয়া ও প্রাকৃতিক</span>
            <span className="opacity-40">|</span>
            <FaTruck className="text-yellow-300 text-xs" />
            <span className="opacity-90">{page.free_delivery ? 'সম্পূর্ণ ফ্রি ডেলিভেরি' : 'দ্রুত ডেলিভেরি'}</span>
            <span className="opacity-40 hidden sm:inline">|</span>
            <span className="opacity-90 hidden sm:inline">
              <FaPepperHot className="text-yellow-300 text-xs inline mr-1" />
              ঐতিহ্যবাহী রেসিপি
            </span>
          </div>
        </div>

        {/* ═══════════════════ HERO ═══════════════════ */}
        <div ref={heroRef} className="relative overflow-hidden pickle-grain" style={{ minHeight: '80vh' }}>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg, #FFF5F0 0%, #FFE8DE 35%, ${page.primary_color}12 70%, #FFF0E8 100%)`,
            }}
          />
          <div className="pickle-hero-pattern" />

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
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border"
                  style={{
                    backgroundColor: `${page.primary_color}10`,
                    borderColor: `${page.primary_color}25`,
                    color: page.primary_color,
                  }}
                >
                  <FaPepperHot className="text-xs" />
                  ঘরোয়া রেসিপিতে তৈরি
                </div>

                <h1
                  className="pickle-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold mb-6 leading-[1.15] whitespace-pre-line"
                  style={{ color: '#3D1308' }}
                >
                  {page.hero_title || page.title}
                </h1>

                {page.hero_subtitle && (
                  <p className="text-base sm:text-lg md:text-xl mb-8 leading-relaxed text-[#6B3A2A] whitespace-pre-line max-w-lg mx-auto md:mx-0"
                    dangerouslySetInnerHTML={{ __html: page.hero_subtitle }}
                  />
                )}

                {/* Price badge */}
                {page.products?.[0] && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-8">
                    {page.products[0].compare_price && page.products[0].compare_price > page.products[0].price && (
                      <span className="pickle-num text-2xl sm:text-2xl text-gray-800 relative inline-block">
                        ৳{page.products[0].compare_price.toLocaleString()}
                        <span className="absolute left-[-4px] right-[-4px] top-1/2 h-[3px] bg-red-600 rounded-sm pointer-events-none" style={{ transform: 'translateY(-50%) rotate(-12deg)' }} />
                      </span>
                    )}
                    <div
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-sm border"
                      style={{
                        backgroundColor: `${page.primary_color}10`,
                        borderColor: `${page.primary_color}20`,
                      }}
                    >
                      <span className="text-sm text-[#8B5E3C] leading-none">মাত্র</span>
                      <span className="pickle-num text-3xl sm:text-4xl leading-none" style={{ color: page.primary_color }}>
                        ৳{page.products[0].price.toLocaleString()}
                      </span>
                    </div>
                    {page.products[0].compare_price && page.products[0].compare_price > page.products[0].price && (
                      <span
                        className="text-lg sm:text-xl font-bold text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-md"
                        style={{ animation: 'discountBounce 1.8s ease-in-out infinite', display: 'inline-block', willChange: 'transform' }}
                      >
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
                    className="pickle-btn-ripple inline-flex items-center gap-3 px-10 py-4 rounded-full text-lg sm:text-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.03] transition-all duration-300"
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
                        boxShadow: '0 25px 60px -12px rgba(0,0,0,0.15), 0 8px 24px -4px rgba(0,0,0,0.08)',
                      }}
                    />
                    {page.free_delivery && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                        <div
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold shadow-lg border border-white/50"
                          style={{
                            background: 'linear-gradient(135deg, #FF6B35, #E85D26)',
                            color: '#FFFFFF',
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

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-200/50 to-transparent" />
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
                    backgroundColor: section.backgroundColor || '#FFF8F5',
                    color: section.textColor || '#3D1308',
                  }}
                >
                  <div className="max-w-5xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-14">
                        <h2 className="pickle-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                          {section.title}
                        </h2>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(section.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="gsap-benefit-card group bg-white rounded-2xl p-6 border border-red-100/60 hover:border-red-200 transition-all duration-400 hover:shadow-[0_8px_30px_-6px_rgba(180,60,20,0.12)]"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110"
                              style={{ backgroundColor: `${page.primary_color}12` }}
                            >
                              {item.icon || '🌶️'}
                            </div>
                            <span className="text-base font-medium leading-relaxed pt-2 text-[#4A2010]">
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
                    backgroundColor: section.backgroundColor || '#FFF0E8',
                    color: section.textColor || '#3D1308',
                  }}
                >
                  <div className="max-w-4xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-14">
                        <h2 className="pickle-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                          {section.title}
                        </h2>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(section.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="gsap-trust-item flex items-center gap-4 p-4 rounded-xl bg-white border border-red-100/50 hover:shadow-md transition-all duration-300"
                        >
                          <div
                            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${page.primary_color}10` }}
                          >
                            <FaCheckCircle style={{ color: page.primary_color }} className="text-sm" />
                          </div>
                          <span className="text-base font-medium text-[#4A2010]">{item.text}</span>
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
                  style={{ backgroundColor: section.backgroundColor || '#FFF8F5' }}
                >
                  <div className="max-w-5xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-14">
                        <h2
                          className="pickle-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-3"
                          style={{ color: section.textColor || '#3D1308' }}
                        >
                          {section.title}
                        </h2>
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
                <div className="gsap-reveal relative overflow-hidden py-16 md:py-20 px-4 sm:px-6 pickle-grain">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${section.backgroundColor || page.primary_color} 0%, ${adjustColor(section.backgroundColor || page.primary_color, -40)} 100%)`,
                    }}
                  />
                  <div className="relative max-w-3xl mx-auto text-center">
                    {section.title && (
                      <h2
                        className="pickle-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
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
                        className="pickle-btn-ripple inline-flex items-center gap-2 px-10 py-4 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-[1.04] transition-all duration-300"
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
                <div className="gsap-reveal relative overflow-hidden py-16 md:py-20 px-4 sm:px-6 pickle-grain">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(160deg, ${section.backgroundColor || page.primary_color} 0%, ${adjustColor(section.backgroundColor || page.primary_color, -50)} 100%)`,
                    }}
                  />
                  <div className="relative max-w-4xl mx-auto text-center">
                    {section.title && (
                      <h2
                        className="pickle-heading text-3xl sm:text-4xl font-bold mb-5"
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
                    backgroundColor: section.backgroundColor || '#FFF8F5',
                    color: section.textColor || '#3D1308',
                  }}
                >
                  <div
                    className="max-w-4xl mx-auto prose prose-lg prose-red"
                    dangerouslySetInnerHTML={{ __html: section.content || '' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ═══════════════════ PHONE CTA ═══════════════════ */}
        {page.phone_number && (
          <div className="relative overflow-hidden py-10 pickle-grain">
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
                <span className="pickle-num">{page.phone_number}</span>
              </a>
            </div>
          </div>
        )}

        {/* ═══════════════════ ORDER FORM ═══════════════════ */}
        {page.show_order_form && (
          <div
            ref={orderFormRef}
            className="py-16 md:py-24 px-4 sm:px-6"
            style={{ backgroundColor: '#FFF0E8' }}
          >
            <div className="max-w-xl mx-auto">
              {submitted ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
                    <FaCheckCircle className="text-white text-4xl" />
                  </div>
                  <h2 className="pickle-heading text-2xl sm:text-3xl font-bold text-[#3D1308] mb-3">
                    আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!
                  </h2>
                  <p className="text-[#8B5E3C] text-lg">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
                  <p className="text-[#A9897A] mt-2 text-sm">
                    আমাদের একজন কাস্টমার প্রতিনিধি আপনাকে কল করে আবার কনফার্ম করবে
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(100,40,15,0.2),0_0_0_1px_rgba(100,40,15,0.05)] overflow-hidden border-[4px] border-white relative z-10 transition-all duration-500 hover:shadow-[0_40px_100px_-20px_rgba(100,40,15,0.25)]">
                  {/* Header */}
                  <div
                    className="px-6 py-6 text-center pickle-grain relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})`,
                    }}
                  >
                    <h2
                      className="pickle-heading text-2xl sm:text-3xl font-extrabold relative z-10 drop-shadow-md"
                      style={{ color: page.secondary_color }}
                    >
                      অর্ডার করুন
                    </h2>
                    {/* {page.delivery_note && (
                      <p className="mt-1 text-sm opacity-80 relative z-10" style={{ color: page.secondary_color }}>
                        {page.delivery_note}
                      </p>
                    )} */}
                  </div>

                  <div className="p-4 sm:p-6 md:p-8">
                    {/* ── Step 1: Products ── */}
                    <div className="mb-8">
                      <h3 className="font-bold text-[#3D1308] mb-4 text-base flex items-center gap-2.5">
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

                          // The Featured offer style:
                          const featuredCardStyle = isFeatured && !isSelected ? `
                            bg-gradient-to-r from-amber-50 to-orange-50 
                            border-2 border-dashed border-orange-400
                            shadow-[0_0_25px_rgba(251,146,60,0.3)]
                            hover:scale-[1.01] hover:shadow-[0_0_35px_rgba(251,146,60,0.4)]
                            animate-[pulseGlow_3s_ease-in-out_infinite]
                          ` : '';

                          return (
                            <div
                              key={product.id}
                              className={`pickle-product-card relative rounded-[1.25rem] p-4 sm:p-5 cursor-pointer transition-all duration-400 ${
                                isSelected
                                  ? 'z-10 transform scale-[1.02]'
                                  : isFeatured
                                    ? featuredCardStyle
                                    : 'bg-gray-50/40 hover:bg-white border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md'
                              }`}
                              style={{
                                backgroundColor: isSelected ? `${page.primary_color}0F` : undefined,
                                border: isSelected ? `2.5px solid ${page.primary_color}` : isFeatured && !isSelected ? undefined : '1px solid #f3f4f6',
                                boxShadow: isSelected ? `0 20px 40px -10px ${page.primary_color}40, inset 0 0 20px ${page.primary_color}10` : undefined,
                              }}
                              onClick={() => toggleProduct(product)}
                            >
                              {isSelected && (
                                <div
                                  className="absolute left-[-2px] bottom-[-2px] top-[-2px] w-2 rounded-l-[1.2rem]"
                                  style={{ background: `linear-gradient(to bottom, ${page.primary_color}, ${primaryDark})` }}
                                />
                              )}
                              {isSelected && (
                                <div 
                                  className="absolute top-[-2px] right-[-2px] rounded-tr-[1.2rem] rounded-bl-2xl flex items-center gap-1.5 text-white text-[10px] sm:text-[11px] font-bold px-3 sm:px-4 py-1.5 shadow-sm z-10"
                                  style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})` }}
                                >
                                  <FaCheckCircle className="text-[10px]" /> নির্বাচিত
                                </div>
                              )}
                              {isFeatured && !isSelected && (
                                <div className="absolute -top-3 left-6 animate-bounce text-white text-[11px] font-extrabold px-5 py-1.5 rounded-full shadow-[0_4px_15px_rgba(234,88,12,0.5)] border-2 border-white/60 z-20"
                                  style={{ background: 'linear-gradient(135deg, #FF6B35, #ff9b26)' }}>
                                  {featuredLabel}
                                </div>
                              )}
                              <div className={`${isFeatured && !isSelected ? 'mt-3 mb-1' : ''}`}>
                                <div className="flex items-start gap-3 sm:gap-4">
                                  {product.image_url && (
                                    <img
                                      src={product.image_url}
                                      alt={product.name}
                                      className={`object-cover rounded-xl flex-shrink-0 transition-all duration-400 ${
                                        isSelected
                                          ? 'w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] shadow-md ring-2 ring-white'
                                          : 'w-16 h-16 sm:w-[76px] sm:h-[76px] border border-gray-100'
                                      }`}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-[15px] sm:text-base text-[#3D1308] leading-snug">
                                      {product.name}
                                    </div>
                                    {product.description && (
                                      <div className="text-xs sm:text-[13px] text-[#8B5E3C]/80 mt-1 leading-snug">
                                        {product.description}
                                      </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mt-2">
                                      {product.compare_price && product.compare_price > product.price && (
                                        <span className="text-[17px] sm:text-lg text-gray-800 font-semibold relative inline-block">
                                          {product.compare_price.toLocaleString()} ৳
                                          <span className="absolute left-[-3px] right-[-3px] top-1/2 h-[2.5px] bg-red-600 rounded-sm pointer-events-none" style={{ transform: 'translateY(-50%) rotate(-12deg)' }} />
                                        </span>
                                      )}
                                      <span
                                        className="pickle-num text-lg sm:text-xl font-extrabold px-2.5 py-0.5 rounded-full text-white"
                                        style={{ backgroundColor: page.primary_color }}
                                      >
                                        ৳{product.price.toLocaleString()}
                                      </span>
                                      {product.compare_price && product.compare_price > product.price && (
                                        <span
                                          className="text-[17px] sm:text-lg font-bold text-green-600 bg-green-50 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full"
                                          style={{ animation: 'discountBounce 1.8s ease-in-out infinite', display: 'inline-block', willChange: 'transform' }}
                                        >
                                          {Math.round(
                                            ((product.compare_price - product.price) / product.compare_price) * 100,
                                          )}
                                          % OFF
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div
                                    className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-100"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => updateQuantity(product.id, -1)}
                                      className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors active:scale-95"
                                    >
                                      <FaMinus className="text-xs text-gray-600" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-lg pickle-num">
                                      {orderItem!.quantity}
                                    </span>
                                    <button
                                      onClick={() => updateQuantity(product.id, 1)}
                                      className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-all active:scale-95"
                                      style={{ backgroundColor: page.primary_color }}
                                    >
                                      <FaPlus className="text-xs" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Step 2: Info ── */}
                    <div className="mb-8">
                      <h3 className="font-bold text-[#3D1308] mb-4 text-base flex items-center gap-2.5">
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
                            className={`block text-sm font-semibold mb-1.5 ${formTouched && !orderForm.name ? 'text-red-600' : 'text-[#6B3A2A]'}`}
                          >
                            নাম *
                          </label>
                          <input
                            type="text"
                            value={orderForm.name}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                            className={`pickle-input w-full border rounded-xl px-4 py-3 ${
                              formTouched && !orderForm.name
                                ? 'border-red-300 bg-red-50/50'
                                : 'border-red-200/60 bg-red-50/20 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(180,60,20,0.1)]'
                            }`}
                            placeholder="আপনার নাম লিখুন"
                          />
                        </div>
                        <div>
                          <label
                            className={`block text-sm font-semibold mb-1.5 ${formTouched && !orderForm.address ? 'text-red-600' : 'text-[#6B3A2A]'}`}
                          >
                            সম্পূর্ণ ঠিকানা *
                          </label>
                          <textarea
                            value={orderForm.address}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, address: e.target.value }))}
                            className={`pickle-input w-full border rounded-xl px-4 py-3 ${
                              formTouched && !orderForm.address
                                ? 'border-red-300 bg-red-50/50'
                                : 'border-red-200/60 bg-red-50/20 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(180,60,20,0.1)]'
                            }`}
                            rows={2}
                            placeholder="সম্পূর্ণ ঠিকানা লিখুন"
                          />
                        </div>
                        <div>
                          <label
                            className={`block text-sm font-semibold mb-1.5 ${formTouched && (!orderForm.phone || !isBdPhoneValid()) ? 'text-red-600' : 'text-[#6B3A2A]'}`}
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
                          <label className="block text-sm font-semibold text-[#6B3A2A] mb-1.5">
                            অতিরিক্ত নোট (ঐচ্ছিক)
                          </label>
                          <textarea
                            value={orderForm.note}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, note: e.target.value }))}
                            className="pickle-input w-full border border-red-200/60 bg-red-50/20 rounded-xl px-4 py-3 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(180,60,20,0.1)]"
                            rows={2}
                            placeholder="কোনো বিশেষ নির্দেশনা..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Step 3: Summary ── */}
                    <div>
                      <h3 className="font-bold text-[#3D1308] mb-4 text-base flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})` }}
                        >
                          3
                        </span>
                        অর্ডার সামারি
                      </h3>
                      <div className="rounded-2xl border border-red-100/60 bg-gradient-to-b from-red-50/40 to-white p-3 sm:p-5">
                        <div className="space-y-1.5 sm:space-y-2 border-b border-red-100 pb-3 mb-3">
                          {orderItems.map((item) => (
                            <div key={item.product.id} className="flex justify-between items-start gap-3 text-xs sm:text-sm">
                              <span className="text-[#6B3A2A] flex-1 min-w-0">
                                {item.product.name} × {item.quantity}
                              </span>
                              <span className="font-semibold text-[#3D1308] pickle-num whitespace-nowrap">
                                {(item.product.price * item.quantity).toLocaleString()} ৳
                              </span>
                            </div>
                          ))}
                        </div>

                        {!page.free_delivery &&
                          (Number(page.delivery_charge) > 0 || Number(page.delivery_charge_outside) > 0) && (
                            <div className="mb-4">
                              <label className="block text-sm font-semibold text-[#6B3A2A] mb-2">
                                ডেলিভারি এলাকা
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {(['inside', 'outside'] as const).map((zone) => (
                                  <button
                                    key={zone}
                                    type="button"
                                    onClick={() => setDeliveryZone(zone)}
                                    className={`py-2 sm:py-3 px-3 rounded-xl text-xs sm:text-sm font-medium border transition-all duration-300 ${
                                      deliveryZone === zone
                                        ? 'text-white shadow-sm border-transparent'
                                        : 'border-red-200/60 bg-white text-[#6B3A2A] hover:border-red-300'
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

                        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#8B5E3C]">সাবটোটাল</span>
                            <span className="font-medium text-[#6B3A2A] pickle-num">
                              {getSubtotal().toLocaleString()} ৳
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#8B5E3C]">ডেলিভারি চার্জ</span>
                            {page.free_delivery || getDeliveryCharge() === 0 ? (
                              <span className="font-semibold text-green-600">ফ্রি ✦</span>
                            ) : (
                              <span className="font-medium text-[#6B3A2A] pickle-num">
                                {getDeliveryCharge().toLocaleString()} ৳
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className="flex justify-between items-center mt-4 pt-4 border-t-2 border-dashed"
                          style={{ borderColor: `${page.primary_color}25` }}
                        >
                          <span className="text-sm sm:text-base font-bold text-[#3D1308]">সর্বমোট</span>
                          <span className="pickle-num text-xl sm:text-2xl font-bold" style={{ color: page.primary_color }}>
                            {getTotal().toLocaleString()} ৳
                          </span>
                        </div>

                        {page.delivery_note && (
                          <div className="mt-3 text-xs text-green-700 bg-green-50 rounded-xl px-4 py-2.5 flex items-center gap-2 border border-green-100">
                            <FaTruck className="flex-shrink-0 text-green-500" /> {page.delivery_note}
                          </div>
                        )}

                        {page.cash_on_delivery && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-[#6B3A2A]">
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

                        <p className="text-[10px] text-[#A9897A] mt-3">
                          Your personal data will be used to process your order.
                        </p>

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
                          className="pickle-btn-ripple w-full mt-4 sm:mt-5 py-3 sm:py-4 rounded-2xl text-sm sm:text-base font-bold text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center gap-2"
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
        <div style={{ backgroundColor: '#3D1308' }}>
          <div className="py-10 text-center space-y-4">
            <div>
              <p className="text-sm sm:text-base font-medium text-red-100/80 mb-2">
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
            <p className="text-xs font-medium text-red-200/40">
              © {new Date().getFullYear()} TrustCart. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
