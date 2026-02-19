import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import apiClient from '@/services/api';
import InternationalPhoneInput from '@/components/InternationalPhoneInput';
import { useToast } from '@/contexts/ToastContext';
import { FaPhone, FaWhatsapp, FaShoppingCart, FaMinus, FaPlus, FaCheckCircle, FaTruck } from 'react-icons/fa';

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

/**
 * International / Foreign Landing Page
 * Same as the regular landing page (/lp/[slug]) but with an international phone input
 * that does NOT have the +88 (Bangladesh) prefix.
 * Route: /lp/intl/[slug]
 */
export default function LandingPageInternational() {
  const router = useRouter();
  const slug = router.query.slug || router.query.landing_page_intl || router.query.landing_page || router.query.cartflows_step;
  const orderFormRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const [page, setPage] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  // Incomplete order tracking
  const sessionIdRef = useRef<string>('');
  const trackingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTrackedRef = useRef(false);

  // Generate a unique session ID for this visit
  useEffect(() => {
    sessionIdRef.current = `lp_intl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  // Debounced tracker: fires 2s after the user stops typing / changing form fields
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
            source: 'landing_page_intl',
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
    [page, orderForm, orderItems, deliveryZone, submitted],
  );

  // Trigger tracking whenever form fields change
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

  // Track when products change
  useEffect(() => {
    if (!page || submitted || !hasTrackedRef.current) return;
    trackIncompleteOrder('product_changed');
  }, [orderItems]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiClient
      .get(`/landing-pages/public/slug/${slug}`)
      .then((res) => {
        const data = res.data;
        setPage(data);
        if (data.products?.length > 0) {
          const defaultProduct = data.products.find((p: LandingPageProduct) => p.is_default) || data.products[0];
          setOrderItems([{ product: defaultProduct, quantity: 1 }]);
        }
      })
      .catch((err) => {
        if (err.response?.status === 404 || !err.response?.data) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

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

  const getSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const getDeliveryCharge = () => {
    if (!page) return 0;
    if (page.free_delivery) return 0;
    return deliveryZone === 'inside'
      ? Number(page.delivery_charge || 0)
      : Number(page.delivery_charge_outside || 0);
  };

  const getTotal = () => {
    return getSubtotal() + getDeliveryCharge();
  };

  const handleSubmitOrder = async () => {
    if (!orderForm.name || !orderForm.phone || !orderForm.address) {
      toast.warning('Please fill in all required fields');
      return;
    }
    if (orderItems.length === 0) {
      toast.warning('Please select a product');
      return;
    }

    try {
      setSubmitting(true);
      if (page) {
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
          traffic_source: 'landing_page_intl',
          referrer_url: window.location.href,
          utm_source: page.slug,
          utm_medium: 'landing_page_intl',
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
          toast.success('Your order has been placed successfully! Thank you.');
        }
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
        toast.success('Your order has been received! We will contact you shortly.');
      } else {
        toast.error('There was a problem submitting your order. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-400 mb-4">404</h1>
          <p className="text-gray-500">This landing page does not exist or is no longer active.</p>
        </div>
      </div>
    );
  }

  const visibleSections = (page.sections || [])
    .filter((s) => s.is_visible)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      <Head>
        <title>{page.meta_title || page.title}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        {page.og_image_url && <meta property="og:image" content={page.og_image_url} />}
        <meta property="og:title" content={page.meta_title || page.title} />
        <meta property="og:description" content={page.meta_description || page.description} />
      </Head>

      <div className="min-h-screen" style={{ backgroundColor: page.background_color }}>
        {/* ─── Hero Section ─── */}
        <div
          className="relative overflow-hidden"
          style={{ backgroundColor: page.primary_color }}
        >
          <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {page.hero_image_url && (
                <div className="w-full md:w-1/2">
                  <img
                    src={page.hero_image_url}
                    alt={page.title}
                    className="w-full max-w-md mx-auto rounded-2xl shadow-2xl"
                  />
                </div>
              )}
              <div className="w-full md:w-1/2 text-center md:text-left">
                <h1
                  className="text-3xl md:text-4xl font-bold mb-4"
                  style={{ color: page.secondary_color }}
                >
                  {page.hero_title || page.title}
                </h1>
                {page.hero_subtitle && (
                  <p
                    className="text-lg mb-6 opacity-90"
                    style={{ color: page.secondary_color }}
                  >
                    {page.hero_subtitle}
                  </p>
                )}

                {page.free_delivery && (
                  <div className="flex justify-center md:justify-start mb-6">
                    <div className="inline-flex items-center gap-3 bg-yellow-400 text-gray-900 px-6 py-3 rounded-full shadow-lg animate-pulse">
                      <FaTruck className="text-2xl" />
                      <span className="font-extrabold text-lg tracking-wide">
                        🚚 Free Home Delivery!
                      </span>
                    </div>
                  </div>
                )}

                {page.hero_button_text && (
                  <div className="flex justify-center md:justify-start">
                    <button
                      onClick={scrollToOrderForm}
                      className="px-10 py-3.5 rounded-full text-2xl md:text-3xl font-extrabold shadow-2xl hover:shadow-xl transform hover:scale-105 transition-all ring-4 ring-white/30"
                      style={{
                        backgroundColor: '#FFD700',
                        color: '#1a1a2e',
                      }}
                    >
                      🛒 {page.hero_button_text}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Dynamic Sections ─── */}
        {visibleSections.map((section) => (
          <div key={section.id}>
            {/* Benefits Section */}
            {section.type === 'benefits' && (
              <div
                className="py-12 px-4"
                style={{
                  backgroundColor: section.backgroundColor || '#FFFFFF',
                  color: section.textColor || '#1a1a2e',
                }}
              >
                <div className="max-w-4xl mx-auto">
                  {section.title && (
                    <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                      {section.title}
                    </h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(section.items || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-4 rounded-xl bg-white/80 shadow-sm"
                      >
                        <span className="text-2xl flex-shrink-0">{item.icon || '✅'}</span>
                        <span className="text-base">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Trust / Why Choose Us */}
            {section.type === 'trust' && (
              <div
                className="py-12 px-4"
                style={{
                  backgroundColor: section.backgroundColor || '#f8f9fa',
                  color: section.textColor || '#1a1a2e',
                }}
              >
                <div className="max-w-4xl mx-auto">
                  {section.title && (
                    <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                      {section.title}
                    </h2>
                  )}
                  <div className="space-y-3">
                    {(section.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-lg">
                        <FaCheckCircle className="text-green-500 flex-shrink-0" />
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Image Gallery */}
            {section.type === 'images' && (
              <div
                className="py-12 px-4"
                style={{ backgroundColor: section.backgroundColor || '#FFFFFF' }}
              >
                <div className="max-w-4xl mx-auto">
                  {section.title && (
                    <h2
                      className="text-2xl md:text-3xl font-bold text-center mb-8"
                      style={{ color: section.textColor }}
                    >
                      {section.title}
                    </h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(section.images || []).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${page.title} - ${idx + 1}`}
                        className="w-full rounded-xl shadow-lg"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CTA Section */}
            {section.type === 'cta' && (
              <div
                className="py-12 px-4 text-center"
                style={{
                  backgroundColor: section.backgroundColor || page.primary_color,
                  color: section.textColor || page.secondary_color,
                }}
              >
                <div className="max-w-3xl mx-auto">
                  {section.title && (
                    <h2 className="text-2xl md:text-3xl font-bold mb-4">{section.title}</h2>
                  )}
                  {section.content && <p className="text-lg mb-6 opacity-90">{section.content}</p>}
                  {section.buttonText && (
                    <button
                      onClick={scrollToOrderForm}
                      className="px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                      style={{
                        backgroundColor: section.textColor || page.secondary_color,
                        color: section.backgroundColor || page.primary_color,
                      }}
                    >
                      {section.buttonText}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Hero (mid-page) */}
            {section.type === 'hero' && (
              <div
                className="py-12 px-4 text-center"
                style={{
                  backgroundColor: section.backgroundColor || page.primary_color,
                  color: section.textColor || page.secondary_color,
                }}
              >
                <div className="max-w-3xl mx-auto">
                  {section.title && (
                    <h2 className="text-3xl font-bold mb-4">{section.title}</h2>
                  )}
                  {section.content && <p className="text-lg opacity-90">{section.content}</p>}
                </div>
              </div>
            )}

            {/* Custom HTML */}
            {section.type === 'custom-html' && (
              <div
                className="py-8 px-4"
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

        {/* ─── Phone CTA ─── */}
        {page.phone_number && (
          <div className="py-6 text-center" style={{ backgroundColor: page.primary_color }}>
            <p className="text-lg mb-2" style={{ color: page.secondary_color }}>
              Need help? Call us
            </p>
            <a
              href={`tel:${page.phone_number}`}
              className="text-3xl font-bold hover:underline"
              style={{ color: page.secondary_color }}
            >
              <FaPhone className="inline mr-2" />
              {page.phone_number}
            </a>
          </div>
        )}

        {/* ─── Order Form ─── */}
        {page.show_order_form && (
          <div ref={orderFormRef} className="py-12 px-4 bg-white">
            <div className="max-w-2xl mx-auto">
              {submitted ? (
                <div className="text-center py-12">
                  <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Your order has been placed successfully!</h2>
                  <p className="text-gray-600">We will contact you shortly.</p>
                  <p className="text-gray-600 mt-2">A customer representative will call you to confirm your order.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-center mb-2" style={{ color: page.primary_color }}>
                    Fill out the form below to place your order 👇
                  </h2>
                  {page.delivery_note && (
                    <p className="text-center text-gray-500 mb-6">{page.delivery_note}</p>
                  )}

                  {/* Product Selection */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-700 mb-3">Select Product</h3>
                    <div className="space-y-3">
                      {(page.products || []).map((product) => {
                        const orderItem = orderItems.find((i) => i.product.id === product.id);
                        const isSelected = !!orderItem;
                        return (
                          <div
                            key={product.id}
                            className={`border-2 rounded-xl p-3 sm:p-4 cursor-pointer transition-all ${
                              isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => toggleProduct(product)}
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              {product.image_url && (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-800 text-sm sm:text-base leading-tight">{product.name}</div>
                                {product.description && (
                                  <div className="text-xs sm:text-sm text-gray-500 mt-0.5 leading-tight">{product.description}</div>
                                )}
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                                  {product.compare_price && product.compare_price > product.price && (
                                    <span className="text-xs sm:text-sm line-through font-medium" style={{ color: '#ef4444' }}>
                                      {product.compare_price.toLocaleString()} ৳
                                    </span>
                                  )}
                                  <span className="text-base sm:text-xl font-extrabold px-2 py-0.5 rounded" style={{ color: '#FFFFFF', backgroundColor: page.primary_color }}>
                                    {product.price.toLocaleString()} ৳
                                  </span>
                                  {product.compare_price && product.compare_price > product.price && (
                                    <span className="text-[10px] sm:text-xs font-bold text-green-600 bg-green-100 px-1.5 sm:px-2 py-0.5 rounded-full">
                                      {Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}% OFF
                                    </span>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="flex items-center gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => updateQuantity(product.id, -1)}
                                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                    >
                                      <FaMinus className="text-xs" />
                                    </button>
                                    <span className="w-8 text-center font-semibold">{orderItem!.quantity}</span>
                                    <button
                                      onClick={() => updateQuantity(product.id, 1)}
                                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
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

                  {/* Order Form Fields */}
                  <div className="space-y-4 mb-6">
                    <h3 className="font-semibold text-gray-700">Billing & Shipping</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Name *</label>
                      <input
                        type="text"
                        value={orderForm.name}
                        onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Your address *</label>
                      <textarea
                        value={orderForm.address}
                        onChange={(e) => setOrderForm((prev) => ({ ...prev, address: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        rows={2}
                        placeholder="Full address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone *</label>
                      <InternationalPhoneInput
                        value={orderForm.phone}
                        onChange={(val) => setOrderForm((prev) => ({ ...prev, phone: val }))}
                        required
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Additional notes (optional)</label>
                      <textarea
                        value={orderForm.note}
                        onChange={(e) => setOrderForm((prev) => ({ ...prev, note: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-3"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border rounded-xl p-4 mb-6 bg-gray-50">
                    <h3 className="font-semibold text-gray-700 mb-3">Your Order</h3>
                    <div className="space-y-2 border-b pb-3 mb-3">
                      {orderItems.map((item) => (
                        <div key={item.product.id} className="flex justify-between text-sm">
                          <span>
                            {item.product.name} × {item.quantity}
                          </span>
                          <span className="font-medium">
                            {(item.product.price * item.quantity).toLocaleString()} ৳
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Zone Selector */}
                    {!page.free_delivery && (Number(page.delivery_charge) > 0 || Number(page.delivery_charge_outside) > 0) && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select delivery area</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setDeliveryZone('inside')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                              deliveryZone === 'inside'
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            Inside Dhaka
                            <div className="text-xs mt-0.5">
                              {Number(page.delivery_charge) === 0 ? (
                                <span className="text-green-600 font-semibold">Free</span>
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
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            Outside Dhaka
                            <div className="text-xs mt-0.5">
                              {Number(page.delivery_charge_outside) === 0 ? (
                                <span className="text-green-600 font-semibold">Free</span>
                              ) : (
                                <span>{Number(page.delivery_charge_outside).toLocaleString()} ৳</span>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Delivery Charge Line */}
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Delivery charge</span>
                      {page.free_delivery || getDeliveryCharge() === 0 ? (
                        <span className="font-semibold text-green-600">Free</span>
                      ) : (
                        <span className="font-medium">{getDeliveryCharge().toLocaleString()} ৳</span>
                      )}
                    </div>

                    {/* Subtotal */}
                    <div className="flex justify-between text-sm border-t pt-2 mb-2">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">{getSubtotal().toLocaleString()} ৳</span>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between text-base font-bold border-t pt-2 mb-3">
                      <span>Total</span>
                      <span style={{ color: page.primary_color }}>{getTotal().toLocaleString()} ৳</span>
                    </div>

                    {page.delivery_note && (
                      <div className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3 flex items-center gap-1">
                        <FaTruck className="flex-shrink-0" /> {page.delivery_note}
                      </div>
                    )}

                    {page.cash_on_delivery && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <input type="radio" checked readOnly />
                        <span>Cash on Delivery</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mb-4">
                      Your personal data will be used to process your order.
                    </div>
                    <button
                      onClick={handleSubmitOrder}
                      disabled={submitting || orderItems.length === 0}
                      className="w-full py-3.5 rounded-lg text-base font-bold text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 hover:brightness-110"
                      style={{ backgroundColor: page.primary_color }}
                    >
                      <FaShoppingCart className="inline mr-2 text-lg align-middle" />
                      {submitting ? 'Processing...' : `Confirm Order — ${getTotal().toLocaleString()} ৳`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── Floating WhatsApp / Phone ─── */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          {page.whatsapp_number && (
            <a
              href={`https://wa.me/${page.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition"
            >
              <FaWhatsapp className="text-2xl" />
            </a>
          )}
          {page.phone_number && (
            <a
              href={`tel:${page.phone_number}`}
              className="w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg hover:opacity-90 transition"
              style={{ backgroundColor: page.primary_color }}
            >
              <FaPhone className="text-xl" />
            </a>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div
          className="py-6 text-center text-sm"
          style={{
            backgroundColor: page.primary_color,
            color: page.secondary_color,
            opacity: 0.8,
          }}
        >
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </div>
    </>
  );
}
