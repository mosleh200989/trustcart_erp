import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import apiClient from '@/services/api';
import PhoneInput from '@/components/PhoneInput';
import { useToast } from '@/contexts/ToastContext';
import CrossSellSuggestion from '@/components/landing-pages/CrossSellSuggestion';
import HeroVideoEmbed from '@/components/landing-pages/HeroVideoEmbed';
import { getOrderGuardNoteHtml, isOrderGuardBlocked } from '@/utils/orderGuard';
import { TrackingService } from '@/utils/tracking';
import {
  FaPhone,
  FaWhatsapp,
  FaCheckCircle,
  FaRegCheckSquare,
  FaRegSquare,
  FaMinus,
  FaPlus,
  FaLeaf,
  FaShieldAlt,
  FaTruck,
  FaShoppingBasket,
} from 'react-icons/fa';

const html = (value: string) => ({ __html: value });

/**
 * Section ids this template gives special meaning to. Everything else falls
 * through to the generic renderer, in `order`, exactly like the other templates.
 */
const HERO_BADGES_SECTION_ID = 'natural-hero-badges';
const PACKAGES_SECTION_ID = 'natural-packages';

interface LandingPageSection {
  id: string;
  type: 'hero' | 'benefits' | 'images' | 'trust' | 'order-form' | 'cta' | 'custom-html' | 'phone-cta' | 'spacer';
  title?: string;
  content?: string;
  items?: Array<{ icon?: string; text: string }>;
  images?: string[];
  videoUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  backgroundColor?: string;
  textColor?: string;
  paddingY?: number;
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
  allow_quantity_selector?: boolean;
  is_featured?: boolean;
  featured_label?: string;
}

interface LandingPageData {
  id: number;
  title: string;
  slug: string;
  description: string;
  hero_image_url: string;
  hero_background_image_url?: string;
  hero_video_url?: string;
  hero_title: string;
  hero_subtitle: string;
  hero_button_text: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  order_form_bg_color?: string;
  order_form_card_bg_color?: string;
  order_form_title_color?: string;
  order_form_text_color?: string;
  order_form_accent_color?: string;
  order_form_border_color?: string;
  footer_bg_color?: string;
  footer_text_color?: string;
  footer_link_bg_color?: string;
  footer_link_text_color?: string;
  footer_border_color?: string;
  btn_bg_color?: string;
  btn_text_color?: string;
  btn_border_color?: string;
  btn_border_radius?: number;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  sections: LandingPageSection[];
  products: LandingPageProduct[];
  phone_number: string;
  whatsapp_number: string;
  floating_whatsapp_color?: string;
  floating_phone_color?: string;
  show_order_form: boolean;
  cash_on_delivery: boolean;
  free_delivery: boolean;
  delivery_charge: number;
  delivery_charge_outside: number;
  delivery_note: string;
  hero_layout?: string;
  show_hero_price?: boolean;
  hero_subtitle_position?: string;
  cross_sell_product?: {
    name: string;
    description?: string;
    image_url?: string;
    price: number;
    compare_price?: number;
    product_id?: number;
    badge_text?: string;
    suggestion_text?: string;
  } | null;
}

interface OrderItem {
  product: LandingPageProduct;
  quantity: number;
}

interface NaturalTemplateProps {
  page: LandingPageData;
  trafficSource?: string;
}

const money = (value: number) => Number(value || 0).toLocaleString('en-US');

/** Free-trial funnels price the headline product at 0 — show that as "ফ্রি", not "0৳". */
const priceLabel = (value: number) => (Number(value) === 0 ? 'ফ্রি' : `${money(value)}৳`);

/** Mix a hex colour towards white by `amount` (0..1) so cards can sit on the page tint. */
const tint = (hex: string, amount: number) => {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return hex;
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = mix(parseInt(clean.slice(0, 2), 16));
  const g = mix(parseInt(clean.slice(2, 4), 16));
  const b = mix(parseInt(clean.slice(4, 6), 16));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

export default function NaturalTemplate({ page, trafficSource = 'landing_page' }: NaturalTemplateProps) {
  const orderFormRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // ─── Theme ───
  const primaryColor = page.primary_color || '#18562B';
  const secondaryColor = page.secondary_color || '#15AD70';
  const bgColor = page.background_color || '#FFFDF7';
  const heroBackgroundImage = page.hero_background_image_url?.trim();
  const heroVideoUrl = page.hero_video_url?.trim();

  const orderFormBgColor = page.order_form_bg_color || tint(primaryColor, 0.93);
  const orderFormCardBgColor = page.order_form_card_bg_color || '#FFFFFF';
  const orderFormTitleColor = page.order_form_title_color || '#14301E';
  const orderFormTextColor = page.order_form_text_color || '#3F4A44';
  const orderFormAccentColor = page.order_form_accent_color || secondaryColor;
  const orderFormBorderColor = page.order_form_border_color || '#DCE6DD';

  const footerBgColor = page.footer_bg_color || '#14301E';
  const footerTextColor = page.footer_text_color || '#D9E4DC';
  const footerLinkBgColor = page.footer_link_bg_color || secondaryColor;
  const footerLinkTextColor = page.footer_link_text_color || '#FFFFFF';
  const footerBorderColor = page.footer_border_color || '#1E4630';

  const btnStyle = useMemo(
    () => ({
      backgroundColor: page.btn_bg_color || primaryColor,
      color: page.btn_text_color || '#FFFFFF',
      borderColor: page.btn_border_color || 'transparent',
      borderWidth: page.btn_border_color && page.btn_border_color !== 'transparent' ? 2 : 0,
      borderStyle: 'solid' as const,
      borderRadius: `${page.btn_border_radius ?? 8}px`,
    }),
    [page.btn_bg_color, page.btn_text_color, page.btn_border_color, page.btn_border_radius, primaryColor],
  );

  // ─── Order state ───
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [deliveryZone, setDeliveryZone] = useState<'inside' | 'outside'>('outside');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [orderGuardNoteHtml, setOrderGuardNoteHtml] = useState('');
  const [crossSellChecked, setCrossSellChecked] = useState(false);

  // ─── Incomplete order tracking ───
  const sessionIdRef = useRef<string>('');
  const trackingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    sessionIdRef.current = `lp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  const trackIncompleteOrder = useCallback(
    (stage: string) => {
      if (!page || submitted) return;
      if (!orderForm.name && !orderForm.phone && !orderForm.address) return;

      if (trackingTimerRef.current) clearTimeout(trackingTimerRef.current);

      trackingTimerRef.current = setTimeout(() => {
        const subtotal = orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
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
            cartData: orderItems.map((item) => ({
              product_id: item.product.product_id || null,
              name: item.product.name,
              price: item.product.price,
              quantity: item.quantity,
              image_url: item.product.image_url || null,
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

  // Auto-detect Dhaka in the address so the delivery charge matches reality.
  useEffect(() => {
    const addr = orderForm.address.toLowerCase();
    if (addr.includes('dhaka') || addr.includes('ঢাকা')) {
      setDeliveryZone('inside');
    } else if (addr.length > 10) {
      setDeliveryZone('outside');
    }
  }, [orderForm.address]);

  // Preselect the default package.
  useEffect(() => {
    if (page.products?.length) {
      const defaultProduct = page.products.find((p) => p.is_default) || page.products[0];
      setOrderItems([{ product: defaultProduct, quantity: 1 }]);
    }
  }, [page]);

  // ─── Cart helpers (multi-select, like the reference checkout) ───
  const scrollToOrderForm = () => orderFormRef.current?.scrollIntoView({ behavior: 'smooth' });

  const isSelected = (productId: string) => orderItems.some((item) => item.product.id === productId);

  const toggleProduct = (product: LandingPageProduct) => {
    setOrderItems((prev) => {
      const exists = prev.some((item) => item.product.id === product.id);
      if (!exists) return [...prev, { product, quantity: 1 }];
      // Never let the cart empty out — the last selected package stays put.
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.product.id !== product.id);
    });
  };

  /** Package-card CTA: make sure the package is in the cart, then jump to the form. */
  const selectPackageAndScroll = (product: LandingPageProduct) => {
    setOrderItems((prev) =>
      prev.some((item) => item.product.id === product.id) ? prev : [...prev, { product, quantity: 1 }],
    );
    setTimeout(scrollToOrderForm, 60);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.product.allow_quantity_selector !== false
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const getSubtotal = () => {
    let subtotal = orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    if (crossSellChecked && page.cross_sell_product) subtotal += page.cross_sell_product.price;
    return subtotal;
  };

  const getDeliveryCharge = () => {
    if (page.free_delivery) return 0;
    return deliveryZone === 'inside'
      ? Number(page.delivery_charge || 0)
      : Number(page.delivery_charge_outside || 0);
  };

  const getTotal = () => getSubtotal() + getDeliveryCharge();

  const isPhoneValid = () => {
    const digits = (orderForm.phone || '').replace(/^\+?88/, '').replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('0');
  };

  const handleSubmitOrder = async () => {
    setOrderGuardNoteHtml('');
    setFormTouched(true);

    if (!orderForm.name || !orderForm.phone || !orderForm.address) {
      toast.warning('অনুগ্রহ করে নাম, মোবাইল নাম্বার ও ঠিকানা পূরণ করুন');
      return;
    }
    if (!isPhoneValid()) {
      toast.warning('মোবাইল নাম্বার ০ দিয়ে শুরু হতে হবে এবং ১১ ডিজিটের হতে হবে');
      return;
    }
    if (orderItems.length === 0) {
      toast.warning('অনুগ্রহ করে অন্তত একটি প্যাকেজ নির্বাচন করুন');
      return;
    }

    try {
      setSubmitting(true);
      const subtotal = getSubtotal();
      const deliveryCharge = getDeliveryCharge();

      const orderPayload = {
        customer_name: orderForm.name,
        customer_phone: orderForm.phone,
        shipping_address: orderForm.address,
        notes: orderForm.note || '',
        payment_method: 'cash',
        items: [
          ...orderItems.map((item) => {
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
          ...(crossSellChecked && page.cross_sell_product
            ? [
                {
                  product_id: page.cross_sell_product.product_id || null,
                  product_name: page.cross_sell_product.name,
                  product_image: page.cross_sell_product.image_url || null,
                  quantity: 1,
                  unit_price: page.cross_sell_product.price,
                  total_price: page.cross_sell_product.price,
                },
              ]
            : []),
        ],
        subtotal,
        delivery_charge: deliveryCharge,
        total_amount: subtotal + deliveryCharge,
        status: 'processing',
        order_source: 'landing_page',
        traffic_source: trafficSource,
        referrer_url: window.location.href,
        utm_source: page.slug,
        utm_medium: 'landing_page',
        utm_campaign: page.title,
        ...TrackingService.collectMetaAttribution(),
      };

      const res = await apiClient.post('/sales', orderPayload);
      const savedOrderId = res.data?.id || res.data?.data?.id;

      apiClient.post(`/landing-pages/${page.id}/increment-order`).catch(() => {});

      if (savedOrderId && sessionIdRef.current && page.id) {
        apiClient
          .post('/lead-management/incomplete-order/converted', {
            sessionId: sessionIdRef.current,
            landingPageId: page.id,
            landingPageSlug: page.slug,
            orderId: savedOrderId,
          })
          .catch(() => {});
      }

      if (savedOrderId) {
        window.location.href = `/thank-you?orderId=${savedOrderId}&landing_page=${encodeURIComponent(page.slug)}`;
        return;
      }
      setSubmitted(true);
      toast.success('আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে! ধন্যবাদ।');
    } catch (err: any) {
      console.error('Order submission error:', err);
      if (isOrderGuardBlocked(err)) {
        setOrderGuardNoteHtml(getOrderGuardNoteHtml(err));
        return;
      }
      const status = err?.response?.status;
      const savedId = err?.response?.data?.id || err?.response?.data?.data?.id;
      if (savedId) {
        apiClient.post(`/landing-pages/${page?.id}/increment-order`).catch(() => {});
        if (sessionIdRef.current && page?.id) {
          apiClient
            .post('/lead-management/incomplete-order/converted', {
              sessionId: sessionIdRef.current,
              landingPageId: page.id,
              landingPageSlug: page.slug,
              orderId: savedId,
            })
            .catch(() => {});
        }
        window.location.href = `/thank-you?orderId=${savedId}&landing_page=${encodeURIComponent(page.slug)}`;
        return;
      }
      if (status && status >= 500) {
        setSubmitted(true);
        toast.success('আপনার অর্ডারটি গ্রহণ করা হয়েছে! শীঘ্রই আমরা যোগাযোগ করবো।');
      } else {
        toast.error('অর্ডার জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Section partitioning ───
  const visibleSections = (page.sections || [])
    .filter((s) => s.is_visible)
    .sort((a, b) => a.order - b.order);

  const heroBadgeSection = visibleSections.find((s) => s.id === HERO_BADGES_SECTION_ID);
  const packagesSection = visibleSections.find((s) => s.id === PACKAGES_SECTION_ID);
  const bodySections = visibleSections.filter(
    (s) => s.id !== HERO_BADGES_SECTION_ID && s.id !== PACKAGES_SECTION_ID,
  );

  const packages = page.products || [];
  const showPackages = packages.length > 0;
  const packagesTitle = packagesSection?.title || 'আমাদের প্যাকেজ সমূহ';
  const packagesSubtitle = packagesSection?.content || 'আপনার পছন্দমতো প্যাকেজ বেছে নিন';

  const whatsappHref = page.whatsapp_number
    ? `https://wa.me/${page.whatsapp_number.replace(/\D/g, '')}`
    : '';

  const showZoneSelector =
    !page.free_delivery &&
    (Number(page.delivery_charge) > 0 || Number(page.delivery_charge_outside) > 0) &&
    Number(page.delivery_charge) !== Number(page.delivery_charge_outside);

  const nameInvalid = formTouched && !orderForm.name;
  const addressInvalid = formTouched && !orderForm.address;

  // 'banner' hero: the artwork already carries the headline, sub-headline and
  // trust badges, so the hero renders the image full width with the CTA
  // directly beneath it and suppresses the duplicate text.
  const isBannerHero = page.hero_layout === 'banner';

  const inputClass =
    'w-full rounded-lg px-4 py-3 outline-none transition-all border focus:ring-2 focus:ring-offset-0';
  const inputStyle = {
    backgroundColor: '#FFFFFF',
    borderColor: orderFormBorderColor,
    color: orderFormTitleColor,
    ['--tw-ring-color' as any]: `${orderFormAccentColor}55`,
  } as React.CSSProperties;

  return (
    <>
      <Head>
        <title>{page.meta_title || page.title}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        <meta property="og:title" content={page.meta_title || page.title} />
        <meta property="og:description" content={page.meta_description || page.description} />
        {page.og_image_url && <meta property="og:image" content={page.og_image_url} />}
        <meta name="theme-color" content={primaryColor} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        .natural-landing,
        .natural-landing * {
          font-family: 'Hind Siliguri', system-ui, sans-serif;
        }
        .natural-landing .rich-copy p {
          margin-bottom: 0.85rem;
        }
        .natural-landing .rich-copy ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin-bottom: 0.85rem;
        }
        .natural-landing .rich-copy strong {
          font-weight: 700;
        }
        @keyframes naturalFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        .natural-float {
          animation: naturalFloat 4s ease-in-out infinite;
        }
      `}</style>

      <div className="natural-landing min-h-screen" style={{ backgroundColor: bgColor, color: '#22312A' }}>
        {/* ═══════════ HERO ═══════════ */}
        <header
          className={`relative overflow-hidden ${
            isBannerHero ? 'pb-9' : 'px-4 pt-8 pb-12 sm:pt-12 sm:pb-16'
          }`}
          style={{
            backgroundImage: `linear-gradient(180deg, ${tint(primaryColor, 0.78)} 0%, ${tint(primaryColor, 0.96)} 100%)`,
          }}
        >
          {heroBackgroundImage && (
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url(${JSON.stringify(heroBackgroundImage)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}

          <div className={`relative z-10 mx-auto text-center ${isBannerHero ? 'max-w-6xl' : 'max-w-4xl'}`}>
            {page.hero_image_url && page.hero_layout !== 'title-first' && (
              <div className={isBannerHero ? 'mb-7' : 'mb-6 flex justify-center'}>
                <img
                  src={page.hero_image_url}
                  alt={page.hero_title ? page.hero_title.replace(/<[^>]*>/g, ' ') : page.title}
                  className={
                    isBannerHero
                      ? 'w-full object-contain'
                      : 'natural-float w-full max-w-md rounded-2xl object-cover shadow-lg'
                  }
                  style={isBannerHero ? undefined : { boxShadow: `0 18px 45px -25px ${primaryColor}` }}
                />
              </div>
            )}

            {/* A banner carries its own headline — rendering one here would duplicate it. */}
            {!isBannerHero && (
              <h1
                className="text-[28px] font-bold leading-snug sm:text-4xl md:text-[42px]"
                style={{ color: primaryColor }}
                dangerouslySetInnerHTML={html(page.hero_title || page.title)}
              />
            )}

            {!isBannerHero && page.hero_subtitle && (
              <p
                className="mx-auto mt-4 max-w-2xl text-base font-medium leading-relaxed sm:text-lg"
                style={{ color: '#38493F' }}
                dangerouslySetInnerHTML={html(page.hero_subtitle)}
              />
            )}

            {heroVideoUrl && (
              <HeroVideoEmbed
                url={heroVideoUrl}
                title={`${page.title} video`}
                accentColor={primaryColor}
                className="mx-auto mt-7 max-w-2xl"
              />
            )}

            {page.hero_image_url && page.hero_layout === 'title-first' && (
              <div className="mt-7 flex justify-center">
                <img
                  src={page.hero_image_url}
                  alt={page.title}
                  className="natural-float w-full max-w-md rounded-2xl object-cover shadow-lg"
                  style={{ boxShadow: `0 18px 45px -25px ${primaryColor}` }}
                />
              </div>
            )}

            {/* Inline trust pills */}
            {!!heroBadgeSection?.items?.length && (
              <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                {heroBadgeSection.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-lg font-bold" style={{ color: primaryColor }}>
                    <span className="text-base leading-none" aria-hidden="true">
                      {item.icon || '◉'}
                    </span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            )}

            {page.hero_button_text && (
              <div className={isBannerHero ? 'px-4' : 'mt-8'}>
                <button
                  type="button"
                  onClick={scrollToOrderForm}
                  className="inline-flex items-center gap-2 px-10 py-3 text-lg font-semibold shadow-md transition-transform hover:-translate-y-0.5"
                  style={btnStyle}
                >
                  <FaShoppingBasket />
                  {page.hero_button_text}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ═══════════ PACKAGES ═══════════ */}
        {showPackages && (
          <section
            className="px-4 py-12 sm:py-14"
            style={{ backgroundColor: packagesSection?.backgroundColor || tint(secondaryColor, 0.9) }}
          >
            <div className="mx-auto max-w-5xl">
              <div className="mb-9 text-center">
                <h2
                  className="inline-block rounded-lg px-6 py-2 text-2xl font-bold sm:text-3xl"
                  style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}
                  dangerouslySetInnerHTML={html(packagesTitle)}
                />
                {packagesSubtitle && (
                  <p
                    className="mt-4 text-lg font-medium"
                    style={{ color: packagesSection?.textColor || '#38493F' }}
                    dangerouslySetInnerHTML={html(packagesSubtitle)}
                  />
                )}
              </div>

              <div
                className={`grid gap-6 ${
                  packages.length === 1
                    ? 'mx-auto max-w-md grid-cols-1'
                    : packages.length % 3 === 0
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {packages.map((product) => {
                  const discount =
                    product.compare_price && product.compare_price > product.price
                      ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
                      : 0;
                  return (
                    <article
                      key={product.id}
                      className="relative flex flex-col overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                      style={{
                        borderColor: product.is_featured ? primaryColor : orderFormBorderColor,
                        borderWidth: product.is_featured ? 2 : 1,
                      }}
                    >
                      {product.is_featured && (
                        <span
                          className="absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold text-white shadow"
                          style={{ backgroundColor: secondaryColor }}
                        >
                          {product.featured_label || '🔥 জনপ্রিয়'}
                        </span>
                      )}

                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="mb-4 h-52 w-full rounded-lg object-cover"
                          loading="lazy"
                        />
                      )}

                      <h3 className="text-xl font-bold" style={{ color: primaryColor }}>
                        {product.name}
                      </h3>

                      {product.description && (
                        <p className="mt-1.5 text-base leading-relaxed" style={{ color: '#4A5A50' }}>
                          {product.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                          {priceLabel(product.price)}
                        </span>
                        {discount > 0 && (
                          <>
                            <span className="text-base font-medium text-gray-400 line-through">
                              {money(product.compare_price!)}৳
                            </span>
                            <span
                              className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                              style={{ backgroundColor: '#D64545' }}
                            >
                              {discount}% ছাড়
                            </span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => selectPackageAndScroll(product)}
                        className="mt-5 w-full py-3 text-lg font-semibold transition-transform hover:-translate-y-0.5"
                        style={btnStyle}
                      >
                        অর্ডার করুন
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════ BODY SECTIONS ═══════════ */}
        {bodySections.map((section) => {
          if (section.type === 'spacer') {
            return (
              <div
                key={section.id}
                style={{
                  height: `${section.paddingY ?? 40}px`,
                  backgroundColor: section.backgroundColor || 'transparent',
                }}
              />
            );
          }

          if (section.type === 'phone-cta') {
            if (!page.phone_number) return null;
            return (
              <section
                key={section.id}
                className="px-4 py-8 text-center"
                style={{ backgroundColor: section.backgroundColor || primaryColor }}
              >
                {section.title && (
                  <p
                    className="mb-2 text-lg font-medium"
                    style={{ color: section.textColor || '#DDEBE1' }}
                    dangerouslySetInnerHTML={html(section.title)}
                  />
                )}
                <a
                  href={`tel:${page.phone_number}`}
                  className="inline-flex items-center gap-3 text-2xl font-bold hover:opacity-80 sm:text-3xl"
                  style={{ color: section.textColor || '#FFFFFF' }}
                >
                  <FaPhone />
                  {page.phone_number}
                </a>
              </section>
            );
          }

          const sectionBg = section.backgroundColor || 'transparent';
          const sectionText = section.textColor || '#22312A';

          return (
            <section
              key={section.id}
              className="px-4"
              style={{
                backgroundColor: sectionBg,
                color: sectionText,
                paddingTop: `${section.paddingY ?? 48}px`,
                paddingBottom: `${section.paddingY ?? 48}px`,
              }}
            >
              {/* Infographic artwork carries its own text, so it needs the wider container to stay legible. */}
              <div className={`mx-auto ${section.type === 'images' ? 'max-w-5xl' : 'max-w-4xl'}`}>
                {section.title && section.type !== 'cta' && (
                  <h2
                    className="mb-7 text-center text-2xl font-bold leading-snug sm:text-3xl md:text-[38px]"
                    style={{ color: sectionText === '#22312A' ? primaryColor : sectionText }}
                    dangerouslySetInnerHTML={html(section.title)}
                  />
                )}

                {section.type === 'hero' && section.content && (
                  <div
                    className="rich-copy mx-auto max-w-3xl text-center text-lg leading-relaxed"
                    dangerouslySetInnerHTML={html(section.content)}
                  />
                )}

                {section.type === 'custom-html' && section.content && (
                  <div className="rich-copy text-lg leading-relaxed" dangerouslySetInnerHTML={html(section.content)} />
                )}

                {section.type === 'benefits' && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(section.items || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-xl border bg-white p-5 shadow-sm"
                        style={{ borderColor: orderFormBorderColor }}
                      >
                        <span className="mt-0.5 text-2xl leading-none" aria-hidden="true">
                          {item.icon || '🌿'}
                        </span>
                        <p className="text-base font-medium leading-relaxed sm:text-lg" style={{ color: '#33443A' }}>
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {section.type === 'trust' && (
                  <ul className="mx-auto max-w-3xl space-y-4">
                    {(section.items || []).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <FaCheckCircle className="mt-1.5 flex-shrink-0 text-xl" style={{ color: secondaryColor }} />
                        <span className="text-lg font-semibold leading-relaxed" style={{ color: '#26362D' }}>
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.type === 'images' && !!(section.images || []).length && (
                  <div
                    className={`grid gap-4 ${
                      (section.images || []).length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                    }`}
                  >
                    {(section.images || []).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${page.title} ${idx + 1}`}
                        className="w-full rounded-xl object-cover shadow-sm"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}

                {section.type === 'cta' && (
                  <div
                    className="rounded-2xl border px-6 py-10 text-center shadow-sm"
                    style={{ backgroundColor: '#FFFFFF', borderColor: orderFormBorderColor }}
                  >
                    {section.title && (
                      <h2
                        className="text-2xl font-bold sm:text-3xl"
                        style={{ color: primaryColor }}
                        dangerouslySetInnerHTML={html(section.title)}
                      />
                    )}
                    {section.content && (
                      <div
                        className="rich-copy mx-auto mt-3 max-w-2xl text-lg leading-relaxed"
                        style={{ color: '#4A5A50' }}
                        dangerouslySetInnerHTML={html(section.content)}
                      />
                    )}
                  </div>
                )}

                {section.buttonText && (
                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      onClick={scrollToOrderForm}
                      className="inline-flex items-center gap-2 px-10 py-3 text-lg font-semibold shadow-md transition-transform hover:-translate-y-0.5"
                      style={{
                        ...btnStyle,
                        backgroundColor: section.buttonColor || btnStyle.backgroundColor,
                        color: section.buttonTextColor || btnStyle.color,
                      }}
                    >
                      <FaShoppingBasket />
                      {section.buttonText}
                    </button>
                  </div>
                )}
              </div>
            </section>
          );
        })}

        {/* ═══════════ CROSS-SELL ═══════════ */}
        {page.cross_sell_product?.name && (
          <CrossSellSuggestion
            product={page.cross_sell_product}
            isChecked={crossSellChecked}
            onToggle={setCrossSellChecked}
            theme="light"
            accentColor={secondaryColor}
          />
        )}

        {/* ═══════════ ORDER FORM ═══════════ */}
        {page.show_order_form && (
          <section
            ref={orderFormRef}
            id="order"
            className="px-4 py-12 sm:py-14"
            style={{ backgroundColor: orderFormBgColor, color: orderFormTextColor }}
          >
            <div className="mx-auto max-w-5xl">
              {/* Form header bar */}
              <div
                className="flex items-center gap-4 rounded-t-2xl px-6 py-5"
                style={{ backgroundColor: secondaryColor }}
              >
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl text-white">
                  <FaShoppingBasket />
                </span>
                <div className="text-white">
                  <h2 className="text-xl font-bold sm:text-2xl">অর্ডার ফর্ম</h2>
                  <p className="text-sm opacity-90 sm:text-base">
                    নিচের ফর্মটি পূরণ করে আপনার অর্ডার নিশ্চিত করুন
                  </p>
                </div>
              </div>

              <div
                className="rounded-b-2xl border border-t-0 p-5 shadow-sm sm:p-8"
                style={{ backgroundColor: orderFormCardBgColor, borderColor: orderFormBorderColor }}
              >
                {submitted ? (
                  <div className="py-12 text-center">
                    <FaCheckCircle className="mx-auto mb-4 text-6xl" style={{ color: secondaryColor }} />
                    <h3 className="mb-2 text-2xl font-bold" style={{ color: orderFormTitleColor }}>
                      আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!
                    </h3>
                    <p style={{ color: orderFormTextColor }}>আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                    {/* ─── Left: products + delivery info ─── */}
                    <div className="space-y-7 lg:col-span-3">
                      <div>
                        <h3
                          className="mb-4 border-b pb-2 text-lg font-bold"
                          style={{ color: orderFormTitleColor, borderColor: orderFormBorderColor }}
                        >
                          আপনার প্রোডাক্ট
                        </h3>
                        <div className="space-y-3">
                          {packages.map((product) => {
                            const item = orderItems.find((i) => i.product.id === product.id);
                            const selected = !!item;
                            return (
                              <div
                                key={product.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleProduct(product)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleProduct(product);
                                  }
                                }}
                                className="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all sm:gap-4 sm:p-4"
                                style={{
                                  borderColor: selected ? secondaryColor : orderFormBorderColor,
                                  backgroundColor: selected ? tint(secondaryColor, 0.92) : '#FFFFFF',
                                }}
                              >
                                <span className="flex-shrink-0 text-xl" style={{ color: secondaryColor }}>
                                  {selected ? <FaRegCheckSquare /> : <FaRegSquare />}
                                </span>

                                {product.image_url && (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="h-16 w-16 flex-shrink-0 rounded-lg object-cover sm:h-[72px] sm:w-[72px]"
                                    loading="lazy"
                                  />
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold leading-tight" style={{ color: orderFormTitleColor }}>
                                    {product.name}
                                  </div>
                                  {product.description && (
                                    <div className="mt-0.5 text-sm leading-tight" style={{ color: orderFormTextColor }}>
                                      {product.description}
                                    </div>
                                  )}

                                  {selected && product.allow_quantity_selector !== false && (
                                    <div
                                      className="mt-2 flex items-center gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        aria-label="পরিমাণ কমান"
                                        onClick={() => updateQuantity(product.id, -1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-md border text-sm"
                                        style={{ borderColor: orderFormBorderColor, color: orderFormTitleColor }}
                                      >
                                        <FaMinus />
                                      </button>
                                      <span
                                        className="w-8 text-center text-lg font-bold"
                                        style={{ color: orderFormTitleColor }}
                                      >
                                        {item!.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        aria-label="পরিমাণ বাড়ান"
                                        onClick={() => updateQuantity(product.id, 1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-md border text-sm"
                                        style={{ borderColor: orderFormBorderColor, color: orderFormTitleColor }}
                                      >
                                        <FaPlus />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-shrink-0 text-right">
                                  {!!product.compare_price && product.compare_price > product.price && (
                                    <div className="text-xs text-gray-400 line-through">
                                      {money(product.compare_price)}৳
                                    </div>
                                  )}
                                  <div className="text-lg font-bold" style={{ color: orderFormAccentColor }}>
                                    {priceLabel(product.price)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h3
                          className="mb-4 border-b pb-2 text-lg font-bold"
                          style={{ color: orderFormTitleColor, borderColor: orderFormBorderColor }}
                        >
                          ডেলিভারি সংক্রান্ত তথ্য
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="mb-1 block text-sm font-medium" style={{ color: orderFormTextColor }}>
                              আপনার নাম লিখুন <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={orderForm.name}
                              onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                              className={inputClass}
                              style={{ ...inputStyle, borderColor: nameInvalid ? '#DC2626' : orderFormBorderColor }}
                              placeholder="আপনার সম্পূর্ণ নাম"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium" style={{ color: orderFormTextColor }}>
                              মোবাইল নাম্বার লিখুন <span className="text-red-500">*</span>
                            </label>
                            <PhoneInput
                              value={orderForm.phone}
                              onChange={(val) => setOrderForm((prev) => ({ ...prev, phone: val }))}
                              required
                              placeholder="01XXXXXXXXX"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium" style={{ color: orderFormTextColor }}>
                              আপনার ঠিকানা লিখুন <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              rows={3}
                              value={orderForm.address}
                              onChange={(e) => setOrderForm((prev) => ({ ...prev, address: e.target.value }))}
                              className={inputClass}
                              style={{ ...inputStyle, borderColor: addressInvalid ? '#DC2626' : orderFormBorderColor }}
                              placeholder="বাসা নং, রোড নং, এলাকা, থানা, জেলা"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium" style={{ color: orderFormTextColor }}>
                              অতিরিক্ত নোট (ঐচ্ছিক)
                            </label>
                            <textarea
                              rows={2}
                              value={orderForm.note}
                              onChange={(e) => setOrderForm((prev) => ({ ...prev, note: e.target.value }))}
                              className={inputClass}
                              style={inputStyle}
                              placeholder="ডেলিভারি সংক্রান্ত কোনো নির্দেশনা থাকলে লিখুন"
                            />
                          </div>

                          {showZoneSelector && (
                            <div>
                              <span
                                className="mb-2 block text-sm font-medium"
                                style={{ color: orderFormTextColor }}
                              >
                                ডেলিভারি এলাকা
                              </span>
                              <div className="flex gap-3">
                                {(
                                  [
                                    ['inside', 'ঢাকার ভিতরে', Number(page.delivery_charge || 0)],
                                    ['outside', 'ঢাকার বাইরে', Number(page.delivery_charge_outside || 0)],
                                  ] as Array<['inside' | 'outside', string, number]>
                                ).map(([zone, label, charge]) => (
                                  <button
                                    key={zone}
                                    type="button"
                                    onClick={() => setDeliveryZone(zone)}
                                    className="flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all"
                                    style={
                                      deliveryZone === zone
                                        ? {
                                            borderColor: secondaryColor,
                                            backgroundColor: tint(secondaryColor, 0.9),
                                            color: primaryColor,
                                          }
                                        : { borderColor: orderFormBorderColor, color: orderFormTextColor }
                                    }
                                  >
                                    {label}
                                    <span className="mt-0.5 block text-xs">
                                      {charge === 0 ? (
                                        <span className="font-semibold" style={{ color: secondaryColor }}>
                                          ফ্রি
                                        </span>
                                      ) : (
                                        `${money(charge)}৳`
                                      )}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ─── Right: order review ─── */}
                    <div className="lg:col-span-2">
                      <div
                        className="rounded-xl border p-5 lg:sticky lg:top-6"
                        style={{ borderColor: orderFormBorderColor, backgroundColor: tint(secondaryColor, 0.96) }}
                      >
                        <h3
                          className="mb-4 border-b pb-3 text-lg font-bold"
                          style={{ color: orderFormTitleColor, borderColor: orderFormBorderColor }}
                        >
                          অর্ডারের বিস্তারিত তথ্য
                        </h3>

                        <table className="w-full text-sm">
                          <thead>
                            <tr
                              className="border-b text-left"
                              style={{ borderColor: orderFormBorderColor, color: orderFormTextColor }}
                            >
                              <th className="pb-2 font-medium">পণ্য</th>
                              <th className="pb-2 text-right font-medium">মূল্য</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderItems.map((item) => (
                              <tr key={item.product.id} className="align-top">
                                <td className="py-2 pr-2" style={{ color: orderFormTitleColor }}>
                                  {item.product.name}
                                  {item.quantity > 1 && <strong className="ml-1">× {item.quantity}</strong>}
                                </td>
                                <td
                                  className="py-2 text-right font-semibold"
                                  style={{ color: orderFormTitleColor }}
                                >
                                  {priceLabel(item.product.price * item.quantity)}
                                </td>
                              </tr>
                            ))}
                            {crossSellChecked && page.cross_sell_product && (
                              <tr className="align-top">
                                <td className="py-2 pr-2" style={{ color: secondaryColor }}>
                                  🎁 {page.cross_sell_product.name}
                                </td>
                                <td className="py-2 text-right font-semibold" style={{ color: secondaryColor }}>
                                  {money(page.cross_sell_product.price)}৳
                                </td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot style={{ color: orderFormTextColor }}>
                            <tr className="border-t" style={{ borderColor: orderFormBorderColor }}>
                              <th className="py-2 text-left font-medium">সাবটোটাল</th>
                              <td className="py-2 text-right">{priceLabel(getSubtotal())}</td>
                            </tr>
                            <tr>
                              <th className="py-2 text-left font-medium">ডেলিভারি চার্জ</th>
                              <td className="py-2 text-right">
                                {getDeliveryCharge() === 0 ? 'ফ্রি' : `${money(getDeliveryCharge())}৳`}
                              </td>
                            </tr>
                            <tr className="border-t" style={{ borderColor: orderFormBorderColor }}>
                              <th className="pt-3 text-left text-base font-bold" style={{ color: orderFormTitleColor }}>
                                সর্বমোট
                              </th>
                              <td
                                className="pt-3 text-right text-lg font-bold"
                                style={{ color: orderFormAccentColor }}
                              >
                                {money(getTotal())}৳
                              </td>
                            </tr>
                          </tfoot>
                        </table>

                        {page.cash_on_delivery && (
                          <div
                            className="mt-4 rounded-lg border px-4 py-3"
                            style={{ borderColor: orderFormBorderColor, backgroundColor: '#FFFFFF' }}
                          >
                            <div className="font-semibold" style={{ color: orderFormTitleColor }}>
                              ক্যাশ অন ডেলিভারি
                            </div>
                            <p className="mt-0.5 text-sm" style={{ color: orderFormTextColor }}>
                              পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।
                            </p>
                          </div>
                        )}

                        {page.delivery_note && (
                          <p className="mt-3 text-sm" style={{ color: orderFormTextColor }}>
                            {page.delivery_note}
                          </p>
                        )}

                        {orderGuardNoteHtml && (
                          <div
                            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                            dangerouslySetInnerHTML={html(orderGuardNoteHtml)}
                          />
                        )}

                        <button
                          type="button"
                          onClick={handleSubmitOrder}
                          disabled={submitting}
                          className="mt-5 flex w-full items-center justify-center gap-2 py-4 text-lg font-bold shadow-md transition-all disabled:opacity-60"
                          style={btnStyle}
                        >
                          {submitting ? (
                            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <FaCheckCircle />
                              <span>অর্ডার কনফার্ম করুন — {money(getTotal())}৳</span>
                            </>
                          )}
                        </button>

                        <div
                          className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-medium"
                          style={{ color: orderFormTextColor }}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <FaTruck style={{ color: secondaryColor }} />
                            দ্রুত ডেলিভারি
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <FaShieldAlt style={{ color: secondaryColor }} />
                            ১০০% নিরাপদ
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <FaLeaf style={{ color: secondaryColor }} />
                            খাঁটি পণ্য
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════ FOOTER ═══════════ */}
        <footer
          className="border-t px-4 py-8 text-center"
          style={{ backgroundColor: footerBgColor, color: footerTextColor, borderColor: footerBorderColor }}
        >
          <p className="text-sm">
            Copyright {new Date().getFullYear()} {page.title}. All rights reserved.
          </p>
          {(whatsappHref || page.phone_number) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {page.phone_number && (
                <a
                  href={`tel:${page.phone_number}`}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold"
                  style={{ backgroundColor: footerLinkBgColor, color: footerLinkTextColor }}
                >
                  <FaPhone /> {page.phone_number}
                </a>
              )}
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold"
                  style={{ backgroundColor: footerLinkBgColor, color: footerLinkTextColor }}
                >
                  <FaWhatsapp /> WhatsApp
                </a>
              )}
            </div>
          )}
        </footer>

        {/* ═══════════ FLOATING CONTACT ═══════════ */}
        <div className="fixed bottom-5 right-4 z-50 flex flex-col gap-3">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="flex h-12 w-12 items-center justify-center rounded-full text-xl text-white shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: page.floating_whatsapp_color || '#25D366' }}
            >
              <FaWhatsapp />
            </a>
          )}
          {page.phone_number && (
            <a
              href={`tel:${page.phone_number}`}
              aria-label="Call"
              className="flex h-12 w-12 items-center justify-center rounded-full text-xl text-white shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: page.floating_phone_color || primaryColor }}
            >
              <FaPhone />
            </a>
          )}
        </div>
      </div>
    </>
  );
}
