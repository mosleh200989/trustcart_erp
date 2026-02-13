import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import apiClient from '@/services/api';
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
  delivery_note: string;
}

interface OrderItem {
  product: LandingPageProduct;
  quantity: number;
}

export default function LandingPagePublic() {
  const router = useRouter();
  // Support /lp/[slug], /?landing_page=slug, /?cartflows_step=slug, /products/x/?landing_page=slug
  const slug = router.query.slug || router.query.landing_page || router.query.cartflows_step;
  const orderFormRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Order form state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderForm, setOrderForm] = useState({
    name: '',
    phone: '',
    address: '',
    district: 'Dhaka',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiClient
      .get(`/landing-pages/public/slug/${slug}`)
      .then((res) => {
        const data = res.data;
        setPage(data);
        // Initialize order items with default product
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
    setOrderItems((prev) => {
      const exists = prev.find((i) => i.product.id === product.id);
      if (exists) {
        return prev.filter((i) => i.product.id !== product.id);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const getTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const handleSubmitOrder = async () => {
    if (!orderForm.name || !orderForm.phone || !orderForm.address) {
      alert('অনুগ্রহ করে সব তথ্য পূরণ করুন');
      return;
    }
    if (orderItems.length === 0) {
      alert('অনুগ্রহ করে একটি প্রোডাক্ট নির্বাচন করুন');
      return;
    }

    try {
      setSubmitting(true);
      if (page) {
        const orderPayload = {
          landing_page_id: page.id,
          landing_page_title: page.title,
          landing_page_slug: page.slug,
          customer_name: orderForm.name,
          customer_phone: orderForm.phone,
          customer_address: orderForm.address,
          district: orderForm.district || '',
          note: orderForm.note || '',
          items: orderItems.map((item) => ({
            product_id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            subtotal: item.product.price * item.quantity,
          })),
          total_amount: getTotal(),
          payment_method: 'cod',
        };
        await apiClient.post('/landing-pages/orders/submit', orderPayload);
      }
      setSubmitted(true);
    } catch (err) {
      console.error('Order submission error:', err);
      alert('অর্ডার জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
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
                        🚚 হোম ডেলিভেরি চার্জ সম্পূর্ণ ফ্রি!
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
              প্রয়োজনে কল করুন
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
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!</h2>
                  <p className="text-gray-600">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-center mb-2" style={{ color: page.primary_color }}>
                    অর্ডার করতে নিচের ফর্মটি পূরণ করুন 👇
                  </h2>
                  {page.delivery_note && (
                    <p className="text-center text-gray-500 mb-6">{page.delivery_note}</p>
                  )}

                  {/* Product Selection */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-700 mb-3">প্রোডাক্ট নির্বাচন করুন</h3>
                    <div className="space-y-3">
                      {(page.products || []).map((product) => {
                        const orderItem = orderItems.find((i) => i.product.id === product.id);
                        const isSelected = !!orderItem;
                        return (
                          <div
                            key={product.id}
                            className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                              isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => toggleProduct(product)}
                          >
                            <div className="flex items-center gap-4">
                              {product.image_url && (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                              )}
                              <div className="flex-1">
                                <div className="font-semibold text-gray-800">{product.name}</div>
                                {product.description && (
                                  <div className="text-sm text-gray-500">{product.description}</div>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  {product.compare_price && product.compare_price > product.price && (
                                    <span className="text-sm line-through font-medium" style={{ color: '#ef4444' }}>
                                      {product.compare_price.toLocaleString()} ৳
                                    </span>
                                  )}
                                  <span className="text-xl font-extrabold px-2 py-0.5 rounded" style={{ color: '#FFFFFF', backgroundColor: page.primary_color }}>
                                    {product.price.toLocaleString()} ৳
                                  </span>
                                  {product.compare_price && product.compare_price > product.price && (
                                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                      {Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}% OFF
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Form Fields */}
                  <div className="space-y-4 mb-6">
                    <h3 className="font-semibold text-gray-700">Billing & Shipping</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">নাম *</label>
                      <input
                        type="text"
                        value={orderForm.name}
                        onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="আপনার নাম"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">আপনার ঠিকানা লিখুন *</label>
                      <textarea
                        value={orderForm.address}
                        onChange={(e) => setOrderForm((prev) => ({ ...prev, address: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        rows={2}
                        placeholder="সম্পূর্ণ ঠিকানা"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">District</label>
                      <select
                        value={orderForm.district}
                        onChange={(e) => setOrderForm((prev) => ({ ...prev, district: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-3"
                      >
                        <option>Dhaka</option>
                        <option>Chattogram</option>
                        <option>Rajshahi</option>
                        <option>Khulna</option>
                        <option>Barishal</option>
                        <option>Sylhet</option>
                        <option>Rangpur</option>
                        <option>Mymensingh</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">মোবাইল *</label>
                      <input
                        type="tel"
                        value={orderForm.phone}
                        onChange={(e) => setOrderForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="01XXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">অতিরিক্ত নোট (ঐচ্ছিক)</label>
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
                    {page.free_delivery && (
                      <div className="flex justify-between text-sm text-green-600 mb-2">
                        <span>Delivery</span>
                        <span className="font-medium">Free</span>
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
                      className="w-full py-5 rounded-xl text-xl font-extrabold text-white shadow-2xl hover:shadow-xl transition-all disabled:opacity-50 transform hover:scale-[1.02]"
                      style={{ backgroundColor: page.primary_color }}
                    >
                      <FaShoppingCart className="inline mr-2 text-xl" />
                      {submitting ? 'Processing...' : `অর্ডার কনফার্ম করুন — ${getTotal().toLocaleString()} ৳`}
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
