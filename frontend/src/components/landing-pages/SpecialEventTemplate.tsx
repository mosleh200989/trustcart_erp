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
  FaFire,
  FaTrophy,
  FaVideo,
  FaClock,
  FaUsers,
  FaGift,
  FaExclamationTriangle,
  FaArrowRight,
  FaPlayCircle,
} from 'react-icons/fa';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/* ─────────────────────────── Interfaces ─────────────────────────── */

interface LandingPageSection {
  id: string;
  type: 'hero' | 'benefits' | 'images' | 'trust' | 'order-form' | 'cta' | 'custom-html' | 'event-rules' | 'event-prizes' | 'event-how-to' | 'event-countdown';
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
  end_date?: string;
}

interface OrderItem {
  product: LandingPageProduct;
  quantity: number;
}

interface SpecialEventTemplateProps {
  page: LandingPageData;
  trafficSource?: string;
  isInternational?: boolean;
}

/* ─────────────────────────── Countdown Hook ─────────────────────── */
function useCountdown(endDate?: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!endDate) return;
    const target = new Date(endDate).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return timeLeft;
}

/* ─────────────────────────── Component ─────────────────────────── */

export default function SpecialEventTemplate({
  page,
  trafficSource = 'landing_page',
  isInternational = false,
}: SpecialEventTemplateProps) {
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

  const countdown = useCountdown(page.end_date);

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
              opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
              scrollTrigger: { trigger: block, start: 'top 85%', toggleActions: 'play none none none' },
            },
          );
        });
        const cards = sectionsRef.current.querySelectorAll('.gsap-event-card');
        if (cards.length) {
          gsap.fromTo(
            cards,
            { opacity: 0, y: 40, scale: 0.95 },
            {
              opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.4)',
              scrollTrigger: { trigger: cards[0], start: 'top 85%', toggleActions: 'play none none none' },
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
        .event-page {
          font-family: 'Tiro Bangla', serif;
        }
        .event-page * {
          font-family: 'Tiro Bangla', serif;
        }
        .event-heading {
          font-family: 'Tiro Bangla', serif;
          font-weight: 700;
        }
        .event-num {
          font-family: 'Arial', 'Helvetica Neue', sans-serif;
          font-weight: 700;
        }

        /* Fire grain overlay */
        .event-grain::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0.04;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
        }

        /* CTA button hover ripple */
        .event-btn-ripple {
          position: relative;
          overflow: hidden;
        }
        .event-btn-ripple::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.3) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.4s;
        }
        .event-btn-ripple:hover::after {
          opacity: 1;
        }

        /* Fire hero pattern */
        .event-hero-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(circle at 20% 80%, rgba(220,38,38,0.08) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(245,158,11,0.06) 0%, transparent 50%),
                            radial-gradient(circle at 50% 50%, rgba(239,68,68,0.04) 0%, transparent 60%);
        }

        /* Countdown card */
        .event-countdown-card {
          background: rgba(0,0,0,0.3);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
        }

        /* Flame animation */
        @keyframes flameFlicker {
          0%, 100% { transform: scaleY(1) scaleX(1); opacity: 1; }
          25% { transform: scaleY(1.08) scaleX(0.95); opacity: 0.9; }
          50% { transform: scaleY(0.95) scaleX(1.05); opacity: 1; }
          75% { transform: scaleY(1.05) scaleX(0.98); opacity: 0.95; }
        }
        .event-flame {
          animation: flameFlicker 2s ease-in-out infinite;
        }

        /* Pulse glow for challenge badge */
        @keyframes challengePulse {
          0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 40px rgba(239,68,68,0.7), 0 0 60px rgba(245,158,11,0.3); }
        }
        .event-challenge-pulse {
          animation: challengePulse 2s ease-in-out infinite;
        }

        /* Shake animation for urgency */
        @keyframes urgentShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }

        /* Product card hover */
        .event-product-card {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .event-product-card:hover {
          transform: translateY(-2px);
        }

        /* Input focus */
        .event-input {
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .event-input:focus {
          outline: none;
        }

        /* Step number glow */
        @keyframes stepGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 20px rgba(239,68,68,0.6); }
        }
        .event-step-num {
          animation: stepGlow 2.5s ease-in-out infinite;
        }
      `}</style>

      <div className="event-page min-h-screen" style={{ backgroundColor: page.background_color || '#0F0A05' }}>
        {/* ═══════════════════ TOP BAR ═══════════════════ */}
        <div
          className="relative overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${page.primary_color}, ${primaryDark})` }}
        >
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium" style={{ color: page.secondary_color }}>
            <FaFire className="text-yellow-300 text-xs event-flame" />
            <span className="opacity-90">বিশেষ ইভেন্ট চলছে!</span>
            <span className="opacity-40">|</span>
            <FaTrophy className="text-yellow-300 text-xs" />
            <span className="opacity-90">চ্যালেঞ্জ জিতুন, পুরস্কার নিন!</span>
            <span className="opacity-40 hidden sm:inline">|</span>
            <span className="opacity-90 hidden sm:inline">
              <FaGift className="text-yellow-300 text-xs inline mr-1" />
              সীমিত সময়ের অফার
            </span>
          </div>
        </div>

        {/* ═══════════════════ HERO ═══════════════════ */}
        <div ref={heroRef} className="relative overflow-hidden event-grain" style={{ minHeight: '85vh' }}>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg, #1A0A00 0%, #2D0A00 30%, ${page.primary_color}25 60%, #1A0A00 100%)`,
            }}
          />
          <div className="event-hero-pattern" />

          {/* Decorative fire elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-[0.08]"
              style={{ background: `radial-gradient(circle, ${page.primary_color}, transparent)` }}
            />
            <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-[0.06]"
              style={{ background: `radial-gradient(circle, #F59E0B, transparent)` }}
            />
            <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-[0.05]"
              style={{ background: `radial-gradient(circle, #EF4444, transparent)` }}
            />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="flex flex-col-reverse md:flex-row items-center gap-12 md:gap-16 lg:gap-20">
              {/* Hero Text */}
              <div ref={heroTextRef} className="w-full md:w-1/2 text-center md:text-left">
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border event-challenge-pulse"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.15)',
                    borderColor: 'rgba(239,68,68,0.3)',
                    color: '#FCA5A5',
                  }}
                >
                  <FaFire className="text-xs event-flame" />
                  স্পেশাল চ্যালেঞ্জ ইভেন্ট
                </div>

                <h1
                  className="event-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.6rem] font-extrabold mb-6 leading-[1.15] whitespace-pre-line"
                  style={{ color: page.secondary_color || '#FFFFFF' }}
                >
                  {page.hero_title || page.title}
                </h1>

                {page.hero_subtitle && (
                  <p className="text-base sm:text-lg md:text-xl mb-8 leading-relaxed whitespace-pre-line max-w-lg mx-auto md:mx-0"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                    dangerouslySetInnerHTML={{ __html: page.hero_subtitle }}
                  />
                )}

                {/* Countdown Timer */}
                {page.end_date && (
                  <div className="mb-8">
                    <p className="text-sm font-semibold mb-3" style={{ color: '#FCA5A5' }}>
                      ⏰ ইভেন্ট শেষ হতে বাকি:
                    </p>
                    <div className="flex gap-3 justify-center md:justify-start">
                      {[
                        { val: countdown.days, label: 'দিন' },
                        { val: countdown.hours, label: 'ঘণ্টা' },
                        { val: countdown.minutes, label: 'মিনিট' },
                        { val: countdown.seconds, label: 'সেকেন্ড' },
                      ].map((item, i) => (
                        <div key={i} className="event-countdown-card rounded-xl px-4 py-3 text-center min-w-[65px]">
                          <div className="event-num text-2xl sm:text-3xl font-bold text-white">
                            {String(item.val).padStart(2, '0')}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price badge */}
                {page.products?.[0] && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-8">
                    {page.products[0].compare_price && page.products[0].compare_price > page.products[0].price && (
                      <span className="event-num text-2xl text-gray-400 relative inline-block">
                        ৳{page.products[0].compare_price.toLocaleString()}
                        <span className="absolute left-[-4px] right-[-4px] top-1/2 h-[3px] bg-red-500 rounded-sm pointer-events-none" style={{ transform: 'translateY(-50%) rotate(-12deg)' }} />
                      </span>
                    )}
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-sm border border-red-500/30 bg-red-500/10">
                      <span className="text-sm text-red-300 leading-none">মাত্র</span>
                      <span className="event-num text-3xl sm:text-4xl leading-none text-white">
                        ৳{page.products[0].price.toLocaleString()}
                      </span>
                    </div>
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
                    className="event-btn-ripple inline-flex items-center gap-3 px-10 py-4 rounded-full text-lg sm:text-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.03] transition-all duration-300"
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
                      className="absolute inset-4 rounded-[2rem] blur-[80px] opacity-30"
                      style={{ backgroundColor: page.primary_color }}
                    />
                    <div
                      className="absolute inset-8 rounded-[2rem] blur-[40px] opacity-20"
                      style={{ backgroundColor: '#F59E0B' }}
                    />
                    <img
                      ref={heroImageRef}
                      src={page.hero_image_url}
                      alt={page.title}
                      className="relative w-full rounded-[2rem] shadow-2xl"
                      style={{
                        border: '3px solid rgba(239,68,68,0.3)',
                        boxShadow: '0 25px 60px -12px rgba(239,68,68,0.3), 0 8px 24px -4px rgba(0,0,0,0.4)',
                      }}
                    />
                    {/* Challenge badge */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
                      <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold shadow-lg border border-white/20 event-challenge-pulse"
                        style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)', color: '#FFFFFF' }}
                      >
                        <FaFire className="event-flame" /> চ্যালেঞ্জ গ্রহণ করুন!
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
        </div>

        {/* ═══════════════════ SECTIONS ═══════════════════ */}
        <div ref={sectionsRef}>
          {visibleSections.map((section) => (
            <div key={section.id}>

              {/* ─── Event Rules ─── */}
              {section.type === 'event-rules' && (
                <div
                  className="gsap-reveal py-16 md:py-24 px-4 sm:px-6"
                  style={{
                    backgroundColor: section.backgroundColor || '#1A0A00',
                    color: section.textColor || '#FFFFFF',
                  }}
                >
                  <div className="max-w-4xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-4 bg-red-500/10 border border-red-500/20 text-red-400">
                          <FaExclamationTriangle /> নিয়মাবলী
                        </div>
                        <h2 className="event-heading text-2xl sm:text-3xl md:text-4xl font-bold">
                          {section.title}
                        </h2>
                      </div>
                    )}
                    <div className="space-y-4">
                      {(section.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="gsap-event-card group flex items-start gap-4 p-5 rounded-2xl border border-red-500/10 bg-gradient-to-r from-red-500/5 to-transparent hover:from-red-500/10 transition-all duration-400"
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-red-600 to-orange-600 shadow-lg event-step-num">
                            {item.icon || `${idx + 1}`}
                          </div>
                          <span className="text-base sm:text-lg font-medium leading-relaxed pt-1.5" style={{ color: section.textColor || 'rgba(255,255,255,0.9)' }}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Event Prizes ─── */}
              {section.type === 'event-prizes' && (
                <div
                  className="gsap-reveal py-16 md:py-24 px-4 sm:px-6"
                  style={{
                    backgroundColor: section.backgroundColor || '#150800',
                    color: section.textColor || '#FFFFFF',
                  }}
                >
                  <div className="max-w-5xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                          <FaTrophy /> পুরস্কার
                        </div>
                        <h2 className="event-heading text-2xl sm:text-3xl md:text-4xl font-bold">
                          {section.title}
                        </h2>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(section.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="gsap-event-card group relative overflow-hidden rounded-2xl p-6 border border-yellow-500/15 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 hover:from-yellow-500/10 hover:to-orange-500/10 transition-all duration-400 hover:shadow-[0_8px_30px_-6px_rgba(245,158,11,0.2)]"
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-[3rem] opacity-10"
                            style={{ background: `linear-gradient(135deg, ${page.primary_color}, #F59E0B)` }}
                          />
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 shadow-inner transition-transform duration-300 group-hover:scale-110">
                              {item.icon || '🏆'}
                            </div>
                            <span className="text-base font-medium leading-relaxed pt-2" style={{ color: section.textColor || 'rgba(255,255,255,0.9)' }}>
                              {item.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Event How-To (Steps) ─── */}
              {section.type === 'event-how-to' && (
                <div
                  className="gsap-reveal py-16 md:py-24 px-4 sm:px-6"
                  style={{
                    backgroundColor: section.backgroundColor || '#120700',
                    color: section.textColor || '#FFFFFF',
                  }}
                >
                  <div className="max-w-4xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <FaPlayCircle /> কিভাবে অংশ নেবেন
                        </div>
                        <h2 className="event-heading text-2xl sm:text-3xl md:text-4xl font-bold">
                          {section.title}
                        </h2>
                      </div>
                    )}
                    <div className="relative">
                      {/* Connecting line */}
                      <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-red-500/30 via-orange-500/30 to-yellow-500/30 hidden md:block" />
                      <div className="space-y-6">
                        {(section.items || []).map((item, idx) => (
                          <div
                            key={idx}
                            className="gsap-event-card flex items-start gap-5 relative"
                          >
                            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold bg-gradient-to-br from-red-600 via-orange-600 to-yellow-600 shadow-lg z-10 event-step-num">
                              {item.icon || `${idx + 1}`}
                            </div>
                            <div className="flex-1 p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all duration-300">
                              <span className="text-base sm:text-lg font-medium leading-relaxed" style={{ color: section.textColor || 'rgba(255,255,255,0.9)' }}>
                                {item.text}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Event Countdown (standalone) ─── */}
              {section.type === 'event-countdown' && (
                <div
                  className="gsap-reveal relative overflow-hidden py-16 md:py-20 px-4 sm:px-6 event-grain"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${section.backgroundColor || page.primary_color} 0%, ${adjustColor(section.backgroundColor || page.primary_color, -40)} 100%)`,
                    }}
                  />
                  <div className="relative max-w-3xl mx-auto text-center">
                    {section.title && (
                      <h2 className="event-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-6" style={{ color: section.textColor || page.secondary_color }}>
                        {section.title}
                      </h2>
                    )}
                    {section.content && (
                      <p className="text-lg mb-8 opacity-90" style={{ color: section.textColor || page.secondary_color }}>
                        {section.content}
                      </p>
                    )}
                    {page.end_date && (
                      <div className="flex gap-4 justify-center mb-8">
                        {[
                          { val: countdown.days, label: 'দিন' },
                          { val: countdown.hours, label: 'ঘণ্টা' },
                          { val: countdown.minutes, label: 'মিনিট' },
                          { val: countdown.seconds, label: 'সেকেন্ড' },
                        ].map((item, i) => (
                          <div key={i} className="bg-black/30 backdrop-blur-sm rounded-2xl px-5 py-4 text-center min-w-[80px] border border-white/10">
                            <div className="event-num text-3xl sm:text-4xl font-bold text-white">
                              {String(item.val).padStart(2, '0')}
                            </div>
                            <div className="text-xs text-white/60 mt-1">{item.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {section.buttonText && (
                      <button
                        onClick={scrollToOrderForm}
                        className="event-btn-ripple inline-flex items-center gap-2 px-10 py-4 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-[1.04] transition-all duration-300"
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

              {/* ─── Benefits ─── */}
              {section.type === 'benefits' && (
                <div
                  className="gsap-reveal py-16 md:py-24 px-4 sm:px-6"
                  style={{
                    backgroundColor: section.backgroundColor || '#1A0A00',
                    color: section.textColor || '#FFFFFF',
                  }}
                >
                  <div className="max-w-5xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-14">
                        <h2 className="event-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                          {section.title}
                        </h2>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(section.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="gsap-event-card group rounded-2xl p-6 border border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all duration-400 hover:shadow-[0_8px_30px_-6px_rgba(239,68,68,0.15)]"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110 bg-red-500/10"
                            >
                              {item.icon || '🌶️'}
                            </div>
                            <span className="text-base font-medium leading-relaxed pt-2" style={{ color: section.textColor || 'rgba(255,255,255,0.9)' }}>
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
                    backgroundColor: section.backgroundColor || '#150800',
                    color: section.textColor || '#FFFFFF',
                  }}
                >
                  <div className="max-w-4xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-14">
                        <h2 className="event-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                          {section.title}
                        </h2>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(section.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="gsap-event-card flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all duration-300"
                        >
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-green-500/10">
                            <FaCheckCircle className="text-green-400 text-sm" />
                          </div>
                          <span className="text-base font-medium" style={{ color: section.textColor || 'rgba(255,255,255,0.9)' }}>{item.text}</span>
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
                  style={{ backgroundColor: section.backgroundColor || '#1A0A00' }}
                >
                  <div className="max-w-5xl mx-auto">
                    {section.title && (
                      <div className="text-center mb-14">
                        <h2 className="event-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-3"
                          style={{ color: section.textColor || '#FFFFFF' }}
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
                        <div key={idx} className="gsap-event-card group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-500">
                          <img
                            src={img}
                            alt={`${page.title} - ${idx + 1}`}
                            className="w-full rounded-2xl transform group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── CTA ─── */}
              {section.type === 'cta' && (
                <div className="gsap-reveal relative overflow-hidden py-16 md:py-20 px-4 sm:px-6 event-grain">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${section.backgroundColor || page.primary_color} 0%, ${adjustColor(section.backgroundColor || page.primary_color, -40)} 100%)`,
                    }}
                  />
                  <div className="relative max-w-3xl mx-auto text-center">
                    {section.title && (
                      <h2 className="event-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
                        style={{ color: section.textColor || page.secondary_color }}
                      >
                        {section.title}
                      </h2>
                    )}
                    {section.content && (
                      <p className="text-lg sm:text-xl mb-8 opacity-90 leading-relaxed"
                        style={{ color: section.textColor || page.secondary_color }}
                      >
                        {section.content}
                      </p>
                    )}
                    {section.buttonText && (
                      <button
                        onClick={scrollToOrderForm}
                        className="event-btn-ripple inline-flex items-center gap-2 px-10 py-4 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-[1.04] transition-all duration-300"
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
                <div className="gsap-reveal relative overflow-hidden py-16 md:py-20 px-4 sm:px-6 event-grain">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(160deg, ${section.backgroundColor || page.primary_color} 0%, ${adjustColor(section.backgroundColor || page.primary_color, -50)} 100%)`,
                    }}
                  />
                  <div className="relative max-w-4xl mx-auto text-center">
                    {section.title && (
                      <h2 className="event-heading text-3xl sm:text-4xl font-bold mb-5"
                        style={{ color: section.textColor || page.secondary_color }}
                      >
                        {section.title}
                      </h2>
                    )}
                    {section.content && (
                      <p className="text-lg sm:text-xl opacity-90 leading-relaxed max-w-2xl mx-auto"
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
                    backgroundColor: section.backgroundColor || '#1A0A00',
                    color: section.textColor || '#FFFFFF',
                  }}
                >
                  <div
                    className="max-w-4xl mx-auto prose prose-lg prose-invert"
                    dangerouslySetInnerHTML={{ __html: section.content || '' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ═══════════════════ PHONE CTA ═══════════════════ */}
        {page.phone_number && (
          <div className="relative overflow-hidden py-10 event-grain">
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
                <div className="w-12 h-12 rounded-full flex items-center justify-center border border-white/20"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                >
                  <FaPhone className="text-lg" />
                </div>
                <span className="event-num">{page.phone_number}</span>
              </a>
            </div>
          </div>
        )}

        {/* ═══════════════════ ORDER FORM ═══════════════════ */}
        {page.show_order_form && (
          <div
            ref={orderFormRef}
            className="py-16 md:py-24 px-4 sm:px-6"
            style={{ backgroundColor: '#150800' }}
          >
            <div className="max-w-xl mx-auto">
              {submitted ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
                    <FaCheckCircle className="text-white text-4xl" />
                  </div>
                  <h2 className="event-heading text-2xl sm:text-3xl font-bold text-white mb-3">
                    আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!
                  </h2>
                  <p className="text-gray-400 text-lg">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
                  <p className="text-gray-500 mt-2 text-sm">
                    চ্যালেঞ্জে অংশ নিতে প্রোডাক্ট ডেলিভেরি নেওয়ার পর নিয়ম অনুযায়ী ভিডিও পাঠান
                  </p>
                </div>
              ) : (
                <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(239,68,68,0.2),0_0_0_1px_rgba(239,68,68,0.1)] overflow-hidden border border-red-500/10 relative z-10">
                  {/* Header */}
                  <div
                    className="px-6 py-6 text-center event-grain relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})`,
                    }}
                  >
                    <h2 className="event-heading text-2xl sm:text-3xl font-extrabold relative z-10 drop-shadow-md"
                      style={{ color: page.secondary_color }}
                    >
                      এখনই অর্ডার করুন
                    </h2>
                    <p className="mt-1 text-sm opacity-80 relative z-10" style={{ color: page.secondary_color }}>
                      চ্যালেঞ্জে অংশ নিতে এই পিকেল অর্ডার করুন
                    </p>
                  </div>

                  <div className="p-4 sm:p-6 md:p-8">
                    {/* ── Step 1: Products ── */}
                    <div className="mb-8">
                      <h3 className="font-bold text-white mb-4 text-base flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-red-600 to-orange-600 event-step-num">
                          1
                        </span>
                        প্রোডাক্ট নির্বাচন করুন
                      </h3>
                      <div className="space-y-3">
                        {(page.products || []).map((product) => {
                          const orderItem = orderItems.find((i) => i.product.id === product.id);
                          const isSelected = !!orderItem;
                          const isFeatured = !!product.is_featured;
                          const featuredLabel = product.featured_label || '🔥 চ্যালেঞ্জ স্পেশাল';

                          return (
                            <div
                              key={product.id}
                              className={`event-product-card relative rounded-[1.25rem] p-4 sm:p-5 cursor-pointer transition-all duration-400 ${
                                isSelected
                                  ? 'z-10 transform scale-[1.02]'
                                  : isFeatured
                                    ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-dashed border-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.2)]'
                                    : 'bg-white/5 hover:bg-white/[0.08] border border-white/10'
                              }`}
                              style={{
                                backgroundColor: isSelected ? 'rgba(239,68,68,0.1)' : undefined,
                                border: isSelected ? `2.5px solid ${page.primary_color}` : undefined,
                                boxShadow: isSelected ? `0 20px 40px -10px rgba(239,68,68,0.3)` : undefined,
                              }}
                              onClick={() => toggleProduct(product)}
                            >
                              {isSelected && (
                                <div className="absolute left-[-2px] bottom-[-2px] top-[-2px] w-2 rounded-l-[1.2rem]"
                                  style={{ background: `linear-gradient(to bottom, ${page.primary_color}, ${primaryDark})` }}
                                />
                              )}
                              {isSelected && (
                                <div className="absolute top-[-2px] right-[-2px] rounded-tr-[1.2rem] rounded-bl-2xl flex items-center gap-1.5 text-white text-[10px] sm:text-[11px] font-bold px-3 sm:px-4 py-1.5 shadow-sm z-10"
                                  style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})` }}
                                >
                                  <FaCheckCircle className="text-[10px]" /> নির্বাচিত
                                </div>
                              )}
                              {isFeatured && !isSelected && (
                                <div className="absolute -top-3 left-6 animate-bounce text-white text-[11px] font-extrabold px-5 py-1.5 rounded-full shadow-lg border-2 border-white/30 z-20"
                                  style={{ background: 'linear-gradient(135deg, #DC2626, #F59E0B)' }}>
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
                                          ? 'w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] shadow-md ring-2 ring-red-500/30'
                                          : 'w-16 h-16 sm:w-[76px] sm:h-[76px] border border-white/10'
                                      }`}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-[15px] sm:text-base text-white leading-snug">
                                      {product.name}
                                    </div>
                                    {product.description && (
                                      <div className="text-xs sm:text-[13px] text-gray-400 mt-1 leading-snug">
                                        {product.description}
                                      </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mt-2">
                                      {product.compare_price && product.compare_price > product.price && (
                                        <span className="text-[17px] sm:text-lg text-gray-500 font-semibold relative inline-block">
                                          {product.compare_price.toLocaleString()} ৳
                                          <span className="absolute left-[-3px] right-[-3px] top-1/2 h-[2.5px] bg-red-500 rounded-sm pointer-events-none" style={{ transform: 'translateY(-50%) rotate(-12deg)' }} />
                                        </span>
                                      )}
                                      <span className="event-num text-lg sm:text-xl font-extrabold px-2.5 py-0.5 rounded-full text-white"
                                        style={{ backgroundColor: page.primary_color }}
                                      >
                                        ৳{product.price.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/10"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button onClick={() => updateQuantity(product.id, -1)}
                                      className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors active:scale-95"
                                    >
                                      <FaMinus className="text-xs text-white" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-lg event-num text-white">
                                      {orderItem!.quantity}
                                    </span>
                                    <button onClick={() => updateQuantity(product.id, 1)}
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
                      <h3 className="font-bold text-white mb-4 text-base flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-red-600 to-orange-600 event-step-num">
                          2
                        </span>
                        আপনার তথ্য
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-semibold mb-1.5 ${formTouched && !orderForm.name ? 'text-red-400' : 'text-gray-300'}`}>
                            নাম *
                          </label>
                          <input
                            type="text"
                            value={orderForm.name}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                            className={`event-input w-full border rounded-xl px-4 py-3 bg-white/5 text-white placeholder-gray-500 ${
                              formTouched && !orderForm.name
                                ? 'border-red-500/50 bg-red-500/5'
                                : 'border-white/10 focus:border-red-500/50 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                            }`}
                            placeholder="আপনার নাম লিখুন"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-semibold mb-1.5 ${formTouched && !orderForm.address ? 'text-red-400' : 'text-gray-300'}`}>
                            সম্পূর্ণ ঠিকানা *
                          </label>
                          <textarea
                            value={orderForm.address}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, address: e.target.value }))}
                            className={`event-input w-full border rounded-xl px-4 py-3 bg-white/5 text-white placeholder-gray-500 ${
                              formTouched && !orderForm.address
                                ? 'border-red-500/50 bg-red-500/5'
                                : 'border-white/10 focus:border-red-500/50 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                            }`}
                            rows={2}
                            placeholder="বাড়ি নং, রাস্তা, এলাকা, জেলা"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-semibold mb-1.5 ${formTouched && !isBdPhoneValid() ? 'text-red-400' : 'text-gray-300'}`}>
                            ফোন নম্বর *
                          </label>
                          {isInternational ? (
                            <InternationalPhoneInput
                              value={orderForm.phone}
                              onChange={(val: string) => setOrderForm((prev) => ({ ...prev, phone: val }))}
                            />
                          ) : (
                            <PhoneInput
                              value={orderForm.phone}
                              onChange={(val: string) => setOrderForm((prev) => ({ ...prev, phone: val }))}
                              className={`event-input w-full border rounded-xl px-4 py-3 bg-white/5 text-white placeholder-gray-500 ${
                                formTouched && !isBdPhoneValid()
                                  ? 'border-red-500/50 bg-red-500/5'
                                  : 'border-white/10 focus:border-red-500/50 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                              }`}
                              placeholder="01XXXXXXXXX"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-1.5 text-gray-300">মন্তব্য (ঐচ্ছিক)</label>
                          <textarea
                            value={orderForm.note}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, note: e.target.value }))}
                            className="event-input w-full border border-white/10 rounded-xl px-4 py-3 bg-white/5 text-white placeholder-gray-500 focus:border-red-500/50 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
                            rows={2}
                            placeholder="বিশেষ কোনো নির্দেশনা..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Step 3: Delivery & Summary ── */}
                    <div className="mb-8">
                      <h3 className="font-bold text-white mb-4 text-base flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-red-600 to-orange-600 event-step-num">
                          3
                        </span>
                        ডেলিভেরি ও সামারি
                      </h3>

                      {!page.free_delivery && (
                        <div className="flex gap-3 mb-5">
                          {['inside', 'outside'].map((zone) => (
                            <button
                              key={zone}
                              onClick={() => setDeliveryZone(zone as 'inside' | 'outside')}
                              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border ${
                                deliveryZone === zone
                                  ? 'text-white border-red-500/50 bg-red-500/20'
                                  : 'text-gray-400 border-white/10 bg-white/5 hover:bg-white/[0.08]'
                              }`}
                            >
                              {zone === 'inside' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 space-y-3">
                        {orderItems.map((item) => (
                          <div key={item.product.id} className="flex justify-between text-sm text-gray-300">
                            <span>{item.product.name} × {item.quantity}</span>
                            <span className="event-num">৳{(item.product.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm text-gray-400 border-t border-white/10 pt-3">
                          <span>ডেলিভেরি চার্জ</span>
                          <span className="event-num">
                            {page.free_delivery ? (
                              <span className="text-green-400 font-bold">ফ্রি!</span>
                            ) : (
                              `৳${getDeliveryCharge().toLocaleString()}`
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-3 text-white">
                          <span>সর্বমোট</span>
                          <span className="event-num" style={{ color: '#FCA5A5' }}>
                            ৳{getTotal().toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {page.delivery_note && (
                        <p className="text-xs text-gray-500 mt-2 flex items-start gap-1.5">
                          <FaTruck className="mt-0.5 flex-shrink-0" /> {page.delivery_note}
                        </p>
                      )}
                    </div>

                    {/* ── Submit ── */}
                    <button
                      onClick={handleSubmitOrder}
                      disabled={submitting}
                      className="event-btn-ripple w-full py-4 rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      style={{
                        background: `linear-gradient(135deg, ${page.primary_color}, ${primaryDark})`,
                        color: page.secondary_color,
                      }}
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <FaShoppingCart />
                          অর্ডার কনফার্ম করুন
                          {page.cash_on_delivery && <span className="text-xs opacity-80">(ক্যাশ অন ডেলিভেরি)</span>}
                        </>
                      )}
                    </button>

                    {page.cash_on_delivery && (
                      <p className="text-center text-xs text-gray-500 mt-3 flex items-center justify-center gap-1.5">
                        <FaShieldAlt /> প্রোডাক্ট হাতে পেয়ে পেমেন্ট করুন
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════ WHATSAPP FLOATING ═══════════════════ */}
        {page.whatsapp_number && (
          <a
            href={`https://wa.me/${page.whatsapp_number.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
          >
            <FaWhatsapp className="text-white text-2xl" />
          </a>
        )}

        {/* ═══════════════════ FOOTER ═══════════════════ */}
        <div className="py-8 px-4 text-center border-t border-white/5" style={{ backgroundColor: '#0A0500' }}>
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} TrustCart — সকল অধিকার সংরক্ষিত
          </p>
        </div>
      </div>
    </>
  );
}
