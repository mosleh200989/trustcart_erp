import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import apiClient from '@/services/api';
import PhoneInput from '@/components/PhoneInput';
import InternationalPhoneInput from '@/components/InternationalPhoneInput';
import { useToast } from '@/contexts/ToastContext';
import CrossSellSuggestion from '@/components/landing-pages/CrossSellSuggestion';
import { getOrderGuardNoteHtml, isOrderGuardBlocked } from '@/utils/orderGuard';
import { TrackingService } from '@/utils/tracking';
import {
  FaPhone,
  FaShoppingCart,
  FaMinus,
  FaPlus,
  FaCheckCircle,
  FaClock,
} from 'react-icons/fa';

const html = (value: string) => ({ __html: value });

interface LandingPageSection {
  id: string;
  type: 'hero' | 'benefits' | 'images' | 'trust' | 'order-form' | 'cta' | 'custom-html' | 'phone-cta' | 'spacer';
  title?: string;
  content?: string;
  items?: Array<{ icon?: string; text: string }>;
  images?: string[];
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

interface FreeOfferTemplateProps {
  page: LandingPageData;
  trafficSource?: string;
  isInternational?: boolean;
}

export default function FreeOfferTemplate({ page, trafficSource = 'landing_page', isInternational = false }: FreeOfferTemplateProps) {
  const orderFormRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Dynamic theme colors from page data
  const bgColor = page.background_color || '#0B0C10';
  const primaryColor = page.primary_color || '#DC2626';
  const secondaryColor = page.secondary_color || '#F5D76E';
  const heroBackgroundImage = page.hero_background_image_url?.trim();
  // Derive a card background (slightly lighter than main bg)
  const cardBg = (() => {
    const hex = bgColor.replace('#', '');
    const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + 15);
    const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + 15);
    const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + 15);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  })();
  const cardBg2 = (() => {
    const hex = bgColor.replace('#', '');
    const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + 25);
    const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + 25);
    const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + 25);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  })();
  const orderFormBgColor = page.order_form_bg_color || bgColor;
  const orderFormCardBgColor = page.order_form_card_bg_color || cardBg;
  const orderFormTitleColor = page.order_form_title_color || '#ffffff';
  const orderFormTextColor = page.order_form_text_color || '#d1d5db';
  const orderFormAccentColor = page.order_form_accent_color || secondaryColor;
  const orderFormBorderColor = page.order_form_border_color || '#374151';
  const footerBgColor = page.footer_bg_color || '#000000';
  const footerTextColor = page.footer_text_color || '#6b7280';
  const footerBorderColor = page.footer_border_color || '#111827';

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
  const [orderGuardNoteHtml, setOrderGuardNoteHtml] = useState('');
  const [formTouched, setFormTouched] = useState(false);
  const [crossSellChecked, setCrossSellChecked] = useState(false);
  
  // Urgency Timer State (15 mins countdown)
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  // Incomplete order tracking
  const sessionIdRef = useRef<string>('');
  const trackingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    sessionIdRef.current = `lp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
        item.product.id === productId && item.product.allow_quantity_selector !== false
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const toggleProduct = (product: LandingPageProduct) => {
    setOrderItems([{ product, quantity: 1 }]);
  };

  const getSubtotal = () => {
    let sub = orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    if (crossSellChecked && page.cross_sell_product) {
      sub += page.cross_sell_product.price;
    }
    return sub;
  };

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
    setOrderGuardNoteHtml('');
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
          ...(crossSellChecked && page.cross_sell_product ? [{
            product_id: page.cross_sell_product.product_id || null,
            product_name: page.cross_sell_product.name,
            product_image: page.cross_sell_product.image_url || null,
            quantity: 1,
            unit_price: page.cross_sell_product.price,
            total_price: page.cross_sell_product.price,
          }] : []),
        ],
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
        ...TrackingService.collectMetaAttribution(),
      };
      const res = await apiClient.post('/sales', orderPayload);
      const savedOrderId = res.data?.id || res.data?.data?.id;

      apiClient.post(`/landing-pages/${page.id}/increment-order`).catch(() => {});

      if (savedOrderId && sessionIdRef.current && page.id) {
        apiClient.post('/lead-management/incomplete-order/converted', {
          sessionId: sessionIdRef.current,
          landingPageId: page.id,
          landingPageSlug: page.slug,
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
      if (isOrderGuardBlocked(err)) {
        setOrderGuardNoteHtml(getOrderGuardNoteHtml(err));
        return;
      }
      const status = err?.response?.status;
      const savedId = err?.response?.data?.id || err?.response?.data?.data?.id;
      if (savedId) {
        apiClient.post(`/landing-pages/${page?.id}/increment-order`).catch(() => {});
        if (sessionIdRef.current && page?.id) {
          apiClient.post('/lead-management/incomplete-order/converted', {
            sessionId: sessionIdRef.current,
            landingPageId: page.id,
            landingPageSlug: page.slug,
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

  return (
    <>
      <Head>
        <title>{page.title}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        {page.og_image_url && <meta property="og:image" content={page.og_image_url} />}
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.meta_description || page.description} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        .free-offer-landing * {
          font-family: 'Hind Siliguri', sans-serif;
        }
        @keyframes pulseAlert {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .urgent-pulse {
          animation: pulseAlert 2s infinite;
        }
        .gold-gradient-text {
          background: linear-gradient(to right, ${secondaryColor}, ${secondaryColor}CC, ${secondaryColor});
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .dark-glass {
          background: ${bgColor}D9;
          backdrop-filter: blur(10px);
          border: 1px solid ${secondaryColor}26;
        }
      `}</style>

      <div className="min-h-screen free-offer-landing" style={{ backgroundColor: bgColor, color: '#E2E2E2' }}>
        
        {/* Sticky Urgency Bar Removed */}

        {/* ═══════════════ HERO SECTION ═══════════════ */}
        <div
          className="relative overflow-hidden pt-12 pb-16 px-4"
          style={heroBackgroundImage ? {
            backgroundImage: `url(${JSON.stringify(heroBackgroundImage)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          } : undefined}
        >
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            {/* Title-first layout (default for FreeOffer) or image-first */}
            {page.hero_layout === 'image-first' ? (
              <>
                {/* Image first */}
                {page.hero_image_url && (
                  <div className="mb-8 sm:mb-10 relative block -mx-4 sm:mx-0 sm:inline-block">
                    <div className="absolute inset-0 rounded-none sm:rounded-2xl blur-xl opacity-20" style={{ backgroundColor: secondaryColor }}></div>
                    <img
                      src={page.hero_image_url}
                      alt={page.title}
                      className="relative w-full max-w-none sm:max-w-lg sm:mx-auto rounded-none sm:rounded-2xl" style={{ boxShadow: `0 0 40px ${secondaryColor}26`, border: `1px solid ${secondaryColor}4D` }}
                    />
                  </div>
                )}

                <h1
                  className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 leading-tight"
                  dangerouslySetInnerHTML={{ __html: page.hero_title || page.title }}
                />
                
                {page.hero_subtitle && (
                  <p
                    className="text-lg sm:text-xl md:text-2xl mb-8 leading-relaxed font-medium"
                    style={{ color: secondaryColor }}
                    dangerouslySetInnerHTML={{ __html: page.hero_subtitle }}
                  />
                )}
              </>
            ) : (
              <>
                {/* Title first (default) */}
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 leading-tight"
                  dangerouslySetInnerHTML={{ __html: page.hero_title || page.title }}
                />
                
                {/* Subtitle ABOVE image (default) */}
                {page.hero_subtitle && page.hero_subtitle_position !== 'below-image' && (
                  <p
                    className="text-lg sm:text-xl md:text-2xl mb-8 leading-relaxed font-medium"
                    style={{ color: secondaryColor }}
                    dangerouslySetInnerHTML={{ __html: page.hero_subtitle }}
                  />
                )}

                {page.hero_image_url && (
                  <div className="mb-8 sm:mb-10 relative block -mx-4 sm:mx-0 sm:inline-block">
                    <div className="absolute inset-0 rounded-none sm:rounded-2xl blur-xl opacity-20" style={{ backgroundColor: secondaryColor }}></div>
                    <img
                      src={page.hero_image_url}
                      alt={page.title}
                      className="relative w-full max-w-none sm:max-w-lg sm:mx-auto rounded-none sm:rounded-2xl" style={{ boxShadow: `0 0 40px ${secondaryColor}26`, border: `1px solid ${secondaryColor}4D` }}
                    />
                  </div>
                )}

                {/* Subtitle BELOW image */}
                {page.hero_subtitle && page.hero_subtitle_position === 'below-image' && (
                  <p
                    className="text-lg sm:text-xl md:text-2xl mb-8 leading-relaxed font-medium"
                    style={{ color: secondaryColor }}
                    dangerouslySetInnerHTML={{ __html: page.hero_subtitle }}
                  />
                )}
              </>
            )}

            {page.hero_button_text && (
              <button
                onClick={scrollToOrderForm}
                className="group relative inline-flex items-center justify-center gap-3 px-8 sm:px-12 py-4 text-xl md:text-2xl font-extrabold transform hover:-translate-y-1 transition-all duration-300"
                style={{
                  backgroundColor: page.btn_bg_color || primaryColor,
                  color: page.btn_text_color || '#ffffff',
                  borderColor: page.btn_border_color || 'transparent',
                  borderWidth: page.btn_border_color && page.btn_border_color !== 'transparent' ? 2 : 0,
                  borderStyle: 'solid',
                  borderRadius: (page.btn_border_radius ?? 16) + 'px',
                }}
              >
                <FaShoppingCart />
                {page.hero_button_text}
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════ DYNAMIC SECTIONS ═══════════════ */}
        {visibleSections.map((section, sIdx) => (
          <div key={section.id} className="py-8 px-4 border-t border-gray-800">
            <div className="max-w-4xl mx-auto">
              
              {section.type === 'hero' && (
                <div className="text-center p-8 rounded-2xl border border-gray-800 shadow-2xl mb-8" style={{ backgroundColor: section.backgroundColor && section.backgroundColor !== 'transparent' ? section.backgroundColor : cardBg }}>
                  {section.title && (
                    <h2 className="text-2xl md:text-4xl font-extrabold mb-4 text-white" dangerouslySetInnerHTML={html(section.title)} />
                  )}
                  {section.content && (
                    <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto leading-relaxed">
                      {section.content}
                    </p>
                  )}
                  {section.buttonText && (
                    <button
                      onClick={scrollToOrderForm}
                      className="px-10 py-4 rounded-full text-xl font-bold shadow-lg transition-all"
                      style={{
                        backgroundColor: page.btn_bg_color || primaryColor,
                        color: page.btn_text_color || '#FFFFFF',
                        borderColor: page.btn_border_color || 'transparent',
                        borderWidth: page.btn_border_color && page.btn_border_color !== 'transparent' ? 1 : 0,
                        borderStyle: 'solid',
                        borderRadius: (page.btn_border_radius ?? 16) + 'px',
                      }}
                    >
                      {section.buttonText}
                    </button>
                  )}
                </div>
              )}

              {section.type === 'images' && (() => {
                const images = section.images || [];
                const hasSingleImage = images.length === 1;

                return (
                  <div className="mb-4 sm:mb-6">
                    {section.title && (
                      <h2 className="text-2xl md:text-3xl font-bold mb-5 text-center" style={{ color: section.textColor || secondaryColor }} dangerouslySetInnerHTML={html(section.title)} />
                    )}
                    <div className={hasSingleImage ? '-mx-4 md:mx-0 flex justify-center' : '-mx-4 md:mx-0 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'}>
                      {images.map((img, idx) => (
                        <div
                          key={idx}
                          className={`relative rounded-none md:rounded-2xl overflow-hidden border-y md:border border-gray-700 shadow-xl group ${
                            hasSingleImage ? 'w-full md:max-w-lg' : ''
                          }`}
                        >
                          <img src={img} alt={`${page.title} image ${idx + 1}`} className="w-full h-auto object-cover transform group-hover:scale-105 transition-all duration-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {section.type === 'benefits' && (
                <div>
                  {section.title && (
                    <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-white" dangerouslySetInnerHTML={html(section.title)} />
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(section.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-5 rounded-xl dark-glass">
                        <div className="text-2xl mt-1 text-yellow-400 drop-shadow-md">
                          {item.icon || '✅'}
                        </div>
                        <p className="text-base sm:text-lg leading-relaxed text-gray-200 font-medium">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                  {section.buttonText && (
                    <div className="text-center mt-10">
                      <button
                        onClick={scrollToOrderForm}
                        className="px-8 py-3 rounded-full text-lg font-bold shadow-lg transition-all"
                        style={{
                          backgroundColor: page.btn_bg_color || primaryColor,
                          color: page.btn_text_color || '#FFFFFF',
                          borderColor: page.btn_border_color || 'transparent',
                          borderWidth: page.btn_border_color && page.btn_border_color !== 'transparent' ? 1 : 0,
                          borderStyle: 'solid',
                          borderRadius: (page.btn_border_radius ?? 16) + 'px',
                        }}
                      >
                        {section.buttonText}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {section.type === 'trust' && (
                <div className="p-8 rounded-2xl border border-gray-800 shadow-2xl" style={{ backgroundColor: section.backgroundColor && section.backgroundColor !== 'transparent' ? section.backgroundColor : cardBg }}>
                  {section.title && (
                    <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center" style={{ color: section.textColor || secondaryColor }} dangerouslySetInnerHTML={html(section.title)} />
                  )}
                  <div className="space-y-4">
                    {(section.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <FaCheckCircle className="text-green-500 text-xl flex-shrink-0" />
                        <span className="text-lg text-gray-300">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section.type === 'cta' && (
                <div className="text-center p-10 rounded-2xl border border-gray-800" style={{ backgroundColor: section.backgroundColor && section.backgroundColor !== 'transparent' ? section.backgroundColor : cardBg }}>
                  {section.title && (
                    <h2 className="text-2xl md:text-4xl font-extrabold mb-4 gold-gradient-text" dangerouslySetInnerHTML={html(section.title)} />
                  )}
                  {section.content && (
                    <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">{section.content}</p>
                  )}
                  {section.buttonText && (
                    <button
                      onClick={scrollToOrderForm}
                      className="px-10 py-4 rounded-full text-xl font-bold transition-all"
                      style={{
                        backgroundColor: page.btn_bg_color || primaryColor,
                        color: page.btn_text_color || '#FFFFFF',
                        borderColor: page.btn_border_color || 'transparent',
                        borderWidth: page.btn_border_color && page.btn_border_color !== 'transparent' ? 1 : 0,
                        borderStyle: 'solid',
                        borderRadius: (page.btn_border_radius ?? 16) + 'px',
                        boxShadow: `0 0 20px ${page.btn_bg_color || primaryColor}80`,
                      }}
                    >
                      {section.buttonText}
                    </button>
                  )}
                </div>
              )}

              {/* Spacer */}
              {section.type === 'spacer' && (
                <div
                  style={{
                    height: `${section.paddingY ?? 40}px`,
                    backgroundColor: section.backgroundColor || 'transparent',
                  }}
                />
              )}

              {/* Phone / WhatsApp CTA */}
              {section.type === 'phone-cta' && page.phone_number && (
                <div
                  className="py-6 text-center"
                  style={{ backgroundColor: section.backgroundColor || cardBg }}
                >
                  {section.title && (
                    <p className="text-lg font-bold mb-2 opacity-80" style={{ color: section.textColor || secondaryColor }} dangerouslySetInnerHTML={html(section.title)} />
                  )}
                  <a
                    href={`tel:${page.phone_number}`}
                    className="inline-flex items-center gap-3 text-2xl sm:text-3xl font-bold hover:opacity-80 transition-opacity"
                    style={{ color: section.textColor || secondaryColor }}
                  >
                    <FaPhone className="text-xl" />
                    {page.phone_number}
                  </a>
                </div>
              )}

            </div>
          </div>
        ))}

        {/* ═══════════════ CROSS-SELL SUGGESTION ═══════════════ */}
        {page.cross_sell_product && page.cross_sell_product.name && (
          <CrossSellSuggestion
            product={page.cross_sell_product}
            isChecked={crossSellChecked}
            onToggle={setCrossSellChecked}
            theme="dark"
            accentColor={secondaryColor}
          />
        )}

        {/* ═══════════════ ORDER FORM SECTION ═══════════════ */}
        {page.show_order_form && (
          <div ref={orderFormRef} className="py-10 sm:py-12 px-4 border-t" style={{ backgroundColor: orderFormBgColor, borderColor: orderFormBorderColor, color: orderFormTextColor }}>
            <div className="max-w-4xl mx-auto p-6 sm:p-10 rounded-2xl shadow-2xl border" style={{ backgroundColor: orderFormCardBgColor, borderColor: orderFormBorderColor, color: orderFormTextColor }}>
              
              {submitted ? (
                <div className="text-center py-12">
                  <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!</h2>
                  <p className="text-gray-400">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: orderFormTitleColor }}>
                      বিলিং এবং শিপিং তথ্য
                    </h2>
                    <p className="text-gray-400">অর্ডার কনফার্ম করতে নিচের ফর্মটি সঠিক তথ্য দিয়ে পূরণ করুন</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* Left: Form Fields */}
                    <div className="md:col-span-3 space-y-6">
                      
                      {/* Product Selection */}
                      <div className="p-5 rounded-xl border" style={{ backgroundColor: orderFormCardBgColor, borderColor: orderFormBorderColor }}>
                        <h3 className="font-semibold mb-4 text-lg border-b pb-2" style={{ color: orderFormTitleColor, borderColor: orderFormBorderColor }}>প্রোডাক্ট নির্বাচন করুন</h3>
                        <div className="space-y-3">
                          {(page.products || []).map((product) => {
                            const orderItem = orderItems.find((i) => i.product.id === product.id);
                            const isSelected = !!orderItem;
                            const isFeatured = !!product.is_featured;
                            const featuredLabel = product.featured_label || '🔥 বিশেষ অফার';
                            return (
                              <div
                                key={product.id}
                                className={`relative border-2 rounded-xl p-3 sm:p-4 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-green-500'
                                    : isFeatured
                                      ? 'shadow-lg'
                                      : 'border-gray-700 hover:border-gray-500'
                                }`}
                                style={{
                                  backgroundColor: isSelected ? '#102416' : isFeatured ? cardBg2 : bgColor,
                                  borderColor: isSelected ? undefined : isFeatured ? secondaryColor : undefined,
                                }}
                                onClick={() => toggleProduct(product)}
                              >
                                {/* Featured badge */}
                                {isFeatured && (
                                  <div className="absolute -top-3 left-4 text-black text-xs font-bold px-3 py-1 rounded-full shadow-md" style={{ background: `linear-gradient(to right, ${secondaryColor}CC, ${secondaryColor})` }}>
                                    {featuredLabel}
                                  </div>
                                )}
                                <div className={`flex items-start gap-3 sm:gap-4 ${isFeatured ? 'mt-1' : ''}`}>
                                  {product.image_url && (
                                    <img
                                      src={product.image_url}
                                      alt={product.name}
                                      className={`object-cover rounded-lg flex-shrink-0 ${
                                        isFeatured ? 'w-16 h-16 sm:w-20 sm:h-20 ring-2 ring-yellow-500/50' : 'w-14 h-14 sm:w-16 sm:h-16'
                                      }`}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-semibold text-sm sm:text-base leading-tight ${
                                      isFeatured ? '' : 'text-gray-200'
                                    }`} style={isFeatured ? { color: secondaryColor } : undefined}>{product.name}</div>
                                    {product.description && (
                                      <div className="text-xs sm:text-sm text-gray-400 mt-0.5 leading-tight">{product.description}</div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
                                      {product.compare_price && product.compare_price > product.price && (
                                        <span className="text-xs sm:text-sm line-through font-medium text-gray-500">
                                          {product.compare_price.toLocaleString()} ৳
                                        </span>
                                      )}
                                      <span className="text-base sm:text-xl font-extrabold px-2 py-0.5 rounded text-white bg-green-600/20 border border-green-500/30">
                                        {product.price.toLocaleString()} ৳
                                      </span>
                                      {product.compare_price && product.compare_price > product.price && (
                                        <span className="text-[10px] sm:text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 sm:px-2 py-0.5 rounded-full">
                                          {Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}% OFF
                                        </span>
                                      )}
                                    </div>
                                    {isSelected && product.allow_quantity_selector !== false && (
                                      <div className="flex items-center gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => updateQuantity(product.id, -1)}
                                          className="w-8 h-8 rounded-full bg-gray-800 text-gray-300 flex items-center justify-center hover:bg-gray-700 transition-colors border border-gray-600"
                                        >
                                          <FaMinus className="text-xs" />
                                        </button>
                                        <span className="w-8 text-center font-bold text-white text-lg">{orderItem!.quantity}</span>
                                        <button
                                          onClick={() => updateQuantity(product.id, 1)}
                                          className="w-8 h-8 rounded-full bg-gray-800 text-gray-300 flex items-center justify-center hover:bg-gray-700 transition-colors border border-gray-600"
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

                      {/* Customer Info Form */}
                      <div className="p-5 rounded-xl border space-y-4" style={{ backgroundColor: orderFormCardBgColor, borderColor: orderFormBorderColor }}>
                        <h3 className="font-semibold mb-2 text-lg border-b pb-2" style={{ color: orderFormTitleColor, borderColor: orderFormBorderColor }}>ডেলিভারি ঠিকানা</h3>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">আপনার নাম *</label>
                          <input
                            type="text"
                            value={orderForm.name}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 outline-none transition-all"
                            style={{ backgroundColor: cardBg2, '--tw-ring-color': secondaryColor } as any}
                            placeholder="আপনার সম্পূর্ণ নাম"
                          />
                        </div>
                      
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">ফোন নাম্বার *</label>
                          <div className="phone-dark-theme">
                            <PhoneInput
                              value={orderForm.phone}
                              onChange={(val) => setOrderForm((prev) => ({ ...prev, phone: val }))}
                              required
                              placeholder="01XXXXXXXXX"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">সম্পূর্ণ ঠিকানা *</label>
                          <textarea
                            value={orderForm.address}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, address: e.target.value }))}
                            className="w-full border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 outline-none transition-all"
                            style={{ backgroundColor: cardBg2, '--tw-ring-color': secondaryColor } as any}
                            rows={3}
                            placeholder="বাসা নং, রোড নং, এলাকা, থানা, জেলা"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Order Summary */}
                    <div className="md:col-span-2">
                      <div className="rounded-xl p-5 border sticky top-24" style={{ backgroundColor: orderFormCardBgColor, borderColor: orderFormBorderColor }}>
                        <h3 className="font-bold text-lg border-b pb-3 mb-4" style={{ color: orderFormTitleColor, borderColor: orderFormBorderColor }}>আপনার অর্ডার</h3>
                        
                        <div className="mb-4">
                          {orderItems.map((item) => (
                            <div key={item.product.id} className="flex justify-between items-center text-sm mb-3 text-gray-300">
                              <span className="font-medium pr-2">
                                {item.product.name} {item.quantity > 1 ? `× ${item.quantity}` : ''}
                              </span>
                              <span className="font-bold text-white whitespace-nowrap">
                                ৳ {(item.product.price * item.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                          {crossSellChecked && page.cross_sell_product && (
                            <div className="flex justify-between items-center text-sm mb-3 text-green-400">
                              <span className="font-medium pr-2 flex items-center gap-1">
                                🎁 {page.cross_sell_product.name}
                              </span>
                              <span className="font-bold whitespace-nowrap">
                                ৳ {page.cross_sell_product.price.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Delivery Zone Selector — only when charges differ */}
                        {!page.free_delivery && (Number(page.delivery_charge) > 0 || Number(page.delivery_charge_outside) > 0) && Number(page.delivery_charge) !== Number(page.delivery_charge_outside) && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">ডেলিভারি এলাকা নির্বাচন করুন</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setDeliveryZone('inside')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                                  deliveryZone === 'inside'
                                    ? ''
                                    : 'text-gray-400 hover:border-gray-500'
                                }`}
                                style={deliveryZone === 'inside'
                                  ? { borderColor: secondaryColor, backgroundColor: `${secondaryColor}1A`, color: secondaryColor }
                                  : { borderColor: '#374151', backgroundColor: bgColor }
                                }
                              >
                                ঢাকার ভিতরে
                                <div className="text-xs mt-0.5">
                                  {Number(page.delivery_charge) === 0 ? (
                                    <span className="text-green-500 font-semibold">ফ্রি</span>
                                  ) : (
                                    <span>{Number(page.delivery_charge).toLocaleString()} ৳</span>
                                  )}
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeliveryZone('outside')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                                  deliveryZone === 'outside'
                                    ? ''
                                    : 'text-gray-400 hover:border-gray-500'
                                }`}
                                style={deliveryZone === 'outside'
                                  ? { borderColor: secondaryColor, backgroundColor: `${secondaryColor}1A`, color: secondaryColor }
                                  : { borderColor: '#374151', backgroundColor: bgColor }
                                }
                              >
                                ঢাকার বাইরে
                                <div className="text-xs mt-0.5">
                                  {Number(page.delivery_charge_outside) === 0 ? (
                                    <span className="text-green-500 font-semibold">ফ্রি</span>
                                  ) : (
                                    <span>{Number(page.delivery_charge_outside).toLocaleString()} ৳</span>
                                  )}
                                </div>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="border-t border-gray-700 pt-3 mt-2 space-y-2">
                          <div className="flex justify-between text-sm text-gray-400">
                            <span>সাবটোটাল</span>
                            <span>৳ {getSubtotal()}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-400">
                            <span>ডেলিভারি চার্জ</span>
                            <span>৳ {getDeliveryCharge()}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold pt-2 border-t" style={{ color: orderFormAccentColor, borderColor: orderFormBorderColor }}>
                            <span>সর্বমোট</span>
                            <span>৳ {getTotal()}</span>
                          </div>
                        </div>

                        {orderGuardNoteHtml && (
                          <div
                            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                            dangerouslySetInnerHTML={{ __html: orderGuardNoteHtml }}
                          />
                        )}

                        <button
                          onClick={handleSubmitOrder}
                          disabled={submitting}
                          className="w-full mt-6 py-4 font-bold text-lg shadow-lg disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                          style={{
                            backgroundColor: page.btn_bg_color || '#16a34a',
                            color: page.btn_text_color || '#ffffff',
                            borderColor: page.btn_border_color || 'transparent',
                            borderWidth: page.btn_border_color && page.btn_border_color !== 'transparent' ? 2 : 0,
                            borderStyle: 'solid',
                            borderRadius: (page.btn_border_radius ?? 16) + 'px',
                          }}
                        >
                          {submitting ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <span className="flex items-center justify-center gap-2 flex-wrap">
                              <FaCheckCircle className="flex-shrink-0" />
                              <span>অর্ডার কনফার্ম করুন</span>
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 text-center text-sm text-gray-500 flex justify-center items-center gap-2">
                    <FaCheckCircle className="text-gray-400" /> পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন (Cash on Delivery)
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="py-6 text-center text-sm border-t" style={{ backgroundColor: footerBgColor, color: footerTextColor, borderColor: footerBorderColor }}>
          &copy; {new Date().getFullYear()} TrustCart. All rights reserved.
        </div>
      </div>
    </>
  );
}
