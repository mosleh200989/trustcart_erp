import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaMinus, FaPlus, FaPhone, FaWhatsapp, FaTruck, FaCheckCircle, FaShieldAlt, FaUndo, FaMapMarkerAlt, FaEnvelope } from 'react-icons/fa';
import apiClient from '@/services/api';
import PhoneInput from '@/components/PhoneInput';
import { useToast } from '@/contexts/ToastContext';
import { SITE_NAME, canonicalUrl, productImageUrl } from '@/config/seo';

interface SizeVariant {
  name: string;
  price: number;
  stock?: number;
  sku_suffix?: string;
}

interface ProductLandingViewProps {
  product: any;
  productImages: any[];
}

const DELIVERY_INSIDE = 60;
const DELIVERY_OUTSIDE = 120;

export default function ProductLandingView({ product, productImages }: ProductLandingViewProps) {
  const router = useRouter();
  const toast = useToast();
  const orderFormRef = useRef<HTMLDivElement>(null);

  const sizeVariants: SizeVariant[] = Array.isArray(product.size_variants) ? product.size_variants : [];
  const [selectedVariant, setSelectedVariant] = useState<SizeVariant | null>(
    sizeVariants.length > 0 ? sizeVariants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [deliveryZone, setDeliveryZone] = useState<'inside' | 'outside'>('inside');
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [formTouched, setFormTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const supportPhone = (process.env.NEXT_PUBLIC_SUPPORT_PHONE || '').trim();
  const supportWhatsApp = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '').trim();

  // Price calculation
  const basePrice = Number(product.base_price || product.price || 0);
  const salePrice = product.sale_price ? Number(product.sale_price) : null;
  const unitPrice = selectedVariant
    ? selectedVariant.price
    : (salePrice != null && salePrice > 0 && salePrice < basePrice ? salePrice : basePrice);
  const originalPrice = selectedVariant ? basePrice : basePrice;
  const hasDiscount = selectedVariant
    ? selectedVariant.price < basePrice
    : (salePrice != null && salePrice > 0 && salePrice < basePrice);
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - unitPrice) / originalPrice) * 100)
    : 0;

  const subtotal = unitPrice * quantity;
  const deliveryCharge = deliveryZone === 'inside' ? DELIVERY_INSIDE : DELIVERY_OUTSIDE;
  const total = subtotal + deliveryCharge;

  const displayName = product.name_bn || product.name_en || 'Product';
  const displayNameEn = product.name_en || '';
  const mainImage = productImages.length > 0 ? productImages[0]?.image_url : product.image_url;

  // Auto-rotate images
  useEffect(() => {
    if (productImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [productImages.length]);

  const isBdPhoneValid = () => {
    if (!orderForm.phone) return false;
    const digits = orderForm.phone.replace(/^\+?88/, '').replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('0');
  };

  const scrollToOrder = () => {
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmitOrder = async () => {
    setFormTouched(true);
    if (!orderForm.name || !orderForm.phone || !orderForm.address) {
      toast.warning('Please fill in all required fields');
      return;
    }
    if (!isBdPhoneValid()) {
      toast.warning('Phone number must start with 0 and be 11 digits');
      return;
    }

    try {
      setSubmitting(true);
      const productName = selectedVariant
        ? `${product.name_en} (${selectedVariant.name})`
        : product.name_en;

      const orderPayload = {
        customer_name: orderForm.name,
        customer_phone: orderForm.phone,
        shipping_address: orderForm.address,
        notes: orderForm.note || '',
        payment_method: 'cash',
        items: [{
          product_id: product.id,
          product_name: productName,
          product_image: product.image_url || null,
          quantity,
          unit_price: unitPrice,
          total_price: subtotal,
        }],
        subtotal,
        delivery_charge: deliveryCharge,
        total_amount: total,
        status: 'processing',
        order_source: 'landing_page',
        traffic_source: 'landing_page',
        referrer_url: typeof window !== 'undefined' ? window.location.href : '',
        utm_source: product.slug || `product-${product.id}`,
        utm_medium: 'product_landing',
        utm_campaign: product.name_en,
      };

      const res = await apiClient.post('/sales', orderPayload);
      const savedOrderId = res.data?.id || res.data?.data?.id;

      if (savedOrderId) {
        window.location.href = `/thank-you?orderId=${savedOrderId}`;
      } else {
        toast.success('Your order has been placed successfully!');
      }
    } catch (err: any) {
      const savedId = err?.response?.data?.id || err?.response?.data?.data?.id;
      if (savedId) {
        window.location.href = `/thank-you?orderId=${savedId}`;
        return;
      }
      const status = err?.response?.status;
      if (status && status >= 500) {
        toast.success('Your order has been received! We will contact you shortly.');
      } else {
        toast.error('Failed to place order. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>{displayName} | {SITE_NAME}</title>
        <meta name="description" content={product.short_description || `Buy ${displayNameEn} online at ${SITE_NAME}`} />
        <link rel="canonical" href={canonicalUrl(`/products/${product.slug || product.id}`)} />
        <meta property="og:title" content={`${displayName} | ${SITE_NAME}`} />
        <meta property="og:image" content={productImageUrl(product.image_url)} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Minimal Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-center">
          <Link href="/">
            <Image src="/trust-cart-logo-main.png" alt={SITE_NAME} width={160} height={60} className="h-12 sm:h-14 w-auto object-contain" priority />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-start">
            {/* Product Image */}
            <div className="relative">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                <Image
                  src={productImages[currentImageIndex]?.image_url || mainImage || '/placeholder.png'}
                  alt={displayName}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain"
                  priority
                />
                {hasDiscount && discountPercent > 0 && (
                  <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow">
                    {discountPercent}% OFF
                  </div>
                )}
              </div>
              {/* Thumbnail strip */}
              {productImages.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex ? 'border-orange-500 ring-1 ring-orange-300' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Image src={img.image_url} alt="" fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info & Quick Order */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {displayName}
              </h1>
              {displayNameEn && displayName !== displayNameEn && (
                <p className="text-base text-gray-500 mt-1">{displayNameEn}</p>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-3xl font-bold text-orange-600">৳{unitPrice}</span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-gray-400 line-through">৳{originalPrice}</span>
                    <span className="bg-red-100 text-red-600 text-sm font-semibold px-2 py-0.5 rounded-full">
                      Save {discountPercent}%
                    </span>
                  </>
                )}
              </div>

              {/* Short description */}
              {product.short_description && (
                <p className="text-gray-600 mt-3 text-sm leading-relaxed">{product.short_description}</p>
              )}

              {/* Size Variants */}
              {sizeVariants.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Select Option:</p>
                  <div className="flex flex-wrap gap-2">
                    {sizeVariants.map((v) => {
                      const isSelected = selectedVariant?.name === v.name;
                      const isOOS = v.stock !== undefined && v.stock <= 0;
                      const vDiscount = v.price < basePrice
                        ? Math.round(((basePrice - v.price) / basePrice) * 100)
                        : 0;
                      return (
                        <button
                          key={v.name}
                          disabled={isOOS}
                          onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                          className={`relative px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                            isOOS
                              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                              : isSelected
                                ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                          }`}
                        >
                          <span>{v.name}</span>
                          <span className="block text-xs mt-0.5">
                            ৳{v.price}
                            {vDiscount > 0 && (
                              <span className="text-red-500 ml-1">-{vDiscount}%</span>
                            )}
                          </span>
                          {isOOS && (
                            <span className="block text-[10px] text-red-400 mt-0.5">Out of Stock</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mt-5">
                <p className="text-sm font-semibold text-gray-700 mb-2">Quantity:</p>
                <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <FaMinus className="text-xs" />
                  </button>
                  <span className="px-5 py-2.5 text-center font-semibold min-w-[50px] border-x border-gray-300">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <FaPlus className="text-xs" />
                  </button>
                </div>
              </div>

              {/* Delivery Area */}
              <div className="mt-5">
                <p className="text-sm font-semibold text-gray-700 mb-2">Delivery Area:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDeliveryZone('inside')}
                    className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      deliveryZone === 'inside'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Inside Dhaka
                    <span className="block text-xs text-gray-500 mt-0.5">৳{DELIVERY_INSIDE}</span>
                  </button>
                  <button
                    onClick={() => setDeliveryZone('outside')}
                    className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      deliveryZone === 'outside'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Outside Dhaka
                    <span className="block text-xs text-gray-500 mt-0.5">৳{DELIVERY_OUTSIDE}</span>
                  </button>
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="flex flex-col items-center text-center p-2">
                  <FaTruck className="text-orange-500 text-lg mb-1" />
                  <span className="text-[11px] text-gray-600 font-medium">Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center text-center p-2">
                  <FaShieldAlt className="text-orange-500 text-lg mb-1" />
                  <span className="text-[11px] text-gray-600 font-medium">Secure Payment</span>
                </div>
                <div className="flex flex-col items-center text-center p-2">
                  <FaUndo className="text-orange-500 text-lg mb-1" />
                  <span className="text-[11px] text-gray-600 font-medium">Easy Returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Order Form Section */}
      <section ref={orderFormRef} className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-6">
            Place Your Order
          </h2>

          {/* Order Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                <Image
                  src={mainImage || '/placeholder.png'}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{displayName}</p>
                {selectedVariant && (
                  <p className="text-xs text-gray-500">{selectedVariant.name}</p>
                )}
                <p className="text-sm text-orange-600 font-bold mt-0.5">
                  ৳{unitPrice} × {quantity} = ৳{subtotal}
                </p>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-orange-50 rounded-xl p-4 mb-6 border border-orange-100">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Subtotal</span>
              <span>৳{subtotal}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Delivery Charge</span>
              <span>৳{deliveryCharge}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-orange-200">
              <span>Total</span>
              <span className="text-orange-600">৳{total}</span>
            </div>
          </div>

          {/* Customer Details Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={orderForm.name}
                onChange={(e) => setOrderForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
                className={`w-full px-4 py-3 rounded-lg border ${
                  formTouched && !orderForm.name ? 'border-red-400' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm`}
              />
              {formTouched && !orderForm.name && (
                <p className="text-xs text-red-500 mt-1">Name is required</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                value={orderForm.phone}
                onChange={(val) => setOrderForm((f) => ({ ...f, phone: val }))}
                required
                showError={formTouched}
                className={`w-full px-4 py-3 rounded-lg border ${
                  formTouched && !isBdPhoneValid() && orderForm.phone ? 'border-red-400' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={orderForm.address}
                onChange={(e) => setOrderForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Full delivery address"
                rows={2}
                className={`w-full px-4 py-3 rounded-lg border ${
                  formTouched && !orderForm.address ? 'border-red-400' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm resize-none`}
              />
              {formTouched && !orderForm.address && (
                <p className="text-xs text-red-500 mt-1">Address is required</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Note (Optional)</label>
              <input
                type="text"
                value={orderForm.note}
                onChange={(e) => setOrderForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Any special instructions"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className={`mt-6 w-full py-4 rounded-xl text-lg font-bold transition-all shadow-lg ${
              submitting
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200 active:scale-[0.98]'
            }`}
          >
            {submitting ? 'Placing Order...' : `Confirm Order — ৳${total}`}
          </button>

          <p className="text-center text-xs text-gray-500 mt-3">
            Cash on Delivery • Our representative will call to confirm
          </p>
        </div>
      </section>

      {/* Product Description */}
      {product.description_en && (
        <section className="border-t border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Product Details</h2>
            <div
              className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900"
              dangerouslySetInnerHTML={{ __html: product.description_en }}
            />
          </div>
        </section>
      )}

      {/* Professional Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <Image src="/trust-cart-logo-main.png" alt={SITE_NAME} width={160} height={60} className="h-14 w-auto object-contain mb-4 brightness-0 invert" />
              <p className="text-sm text-gray-400 leading-relaxed">
                Your trusted source for premium organic groceries, delivered fresh to your doorstep.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/products" className="text-gray-400 hover:text-orange-400 transition-colors">Shop</Link></li>
                <li><Link href="/about" className="text-gray-400 hover:text-orange-400 transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-orange-400 transition-colors">Contact</Link></li>
                <li><Link href="/shipping" className="text-gray-400 hover:text-orange-400 transition-colors">Shipping Policy</Link></li>
                <li><Link href="/returns" className="text-gray-400 hover:text-orange-400 transition-colors">Returns & Refunds</Link></li>
                <li><Link href="/privacy" className="text-gray-400 hover:text-orange-400 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Contact Info</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <FaMapMarkerAlt className="text-orange-500 mt-0.5 flex-shrink-0" size={14} />
                  <span className="text-gray-400">Basabo, Dhaka, Bangladesh</span>
                </li>
                {supportPhone && (
                  <li className="flex items-center gap-3">
                    <FaPhone className="text-orange-500 flex-shrink-0" size={14} />
                    <a href={`tel:${supportPhone}`} className="text-gray-400 hover:text-orange-400 transition-colors">{supportPhone}</a>
                  </li>
                )}
                <li className="flex items-center gap-3">
                  <FaEnvelope className="text-orange-500 flex-shrink-0" size={14} />
                  <span className="text-gray-400">support@trustcart.com</span>
                </li>
              </ul>
              <div className="mt-5 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">We Accept</p>
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-gray-800 text-gray-300 border border-gray-700 px-2.5 py-0.5 rounded text-xs font-bold">VISA</span>
                  <span className="bg-gray-800 text-gray-300 border border-gray-700 px-2.5 py-0.5 rounded text-xs font-bold">MASTER</span>
                  <span className="bg-gray-800 text-orange-400 border border-gray-700 px-2.5 py-0.5 rounded text-xs font-bold">bKash</span>
                  <span className="bg-gray-800 text-pink-400 border border-gray-700 px-2.5 py-0.5 rounded text-xs font-bold">Nagad</span>
                  <span className="bg-gray-800 text-gray-300 border border-gray-700 px-2.5 py-0.5 rounded text-xs font-bold">COD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom Bar */}
        <div className="border-t border-gray-800">
          <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-2">
            <p>&copy; {new Date().getFullYear()} {SITE_NAME}. All Rights Reserved.</p>
            <p>Designed by <span className="text-orange-500 font-medium">TrustCart Team</span></p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp / Phone Buttons */}
      <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-50">
        {supportWhatsApp && (
          <a
            href={`https://wa.me/${supportWhatsApp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
            aria-label="WhatsApp"
          >
            <FaWhatsapp className="text-2xl" />
          </a>
        )}
        {supportPhone && (
          <a
            href={`tel:${supportPhone}`}
            className="w-14 h-14 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors"
            aria-label="Call Us"
          >
            <FaPhone className="text-xl" />
          </a>
        )}
      </div>
    </div>
  );
}
