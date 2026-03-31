import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  FaMinus,
  FaPlus,
  FaPhone,
  FaWhatsapp,
  FaTruck,
  FaCheckCircle,
  FaShieldAlt,
  FaUndo,
  FaMapMarkerAlt,
  FaEnvelope,
  FaShoppingCart,
} from "react-icons/fa";
import apiClient from "@/services/api";
import PhoneInput from "@/components/PhoneInput";
import { useToast } from "@/contexts/ToastContext";
import { SITE_NAME, canonicalUrl, productImageUrl } from "@/config/seo";

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
const DELIVERY_OUTSIDE = 110;

export default function ProductLandingView({
  product,
  productImages,
}: ProductLandingViewProps) {
  const router = useRouter();
  const toast = useToast();
  const orderFormRef = useRef<HTMLDivElement>(null);

  const sizeVariants: SizeVariant[] = Array.isArray(product.size_variants)
    ? product.size_variants
    : [];
  const [selectedVariant, setSelectedVariant] = useState<SizeVariant | null>(
    sizeVariants.length > 0 ? sizeVariants[0] : null,
  );
  const [variantQuantities, setVariantQuantities] = useState<
    Record<string, number>
  >(() => Object.fromEntries(sizeVariants.map((v) => [v.name, 1])));
  const quantity = selectedVariant
    ? variantQuantities[selectedVariant.name] || 1
    : 1;
  const setQuantity = (updater: number | ((prev: number) => number)) => {
    if (!selectedVariant) return;
    setVariantQuantities((prev) => {
      const cur = prev[selectedVariant.name] || 1;
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...prev, [selectedVariant.name]: Math.max(1, next) };
    });
  };
  const [deliveryZone, setDeliveryZone] = useState<"inside" | "outside">(
    "outside",
  );
  const [orderForm, setOrderForm] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });
  const [formTouched, setFormTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const supportPhone = (process.env.NEXT_PUBLIC_SUPPORT_PHONE || "").trim();
  const supportWhatsApp = (
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || ""
  ).trim();

  // Price calculation
  const basePrice = Number(product.base_price || product.price || 0);
  const salePrice = product.sale_price ? Number(product.sale_price) : null;
  const unitPrice = selectedVariant
    ? selectedVariant.price
    : salePrice != null && salePrice > 0 && salePrice < basePrice
      ? salePrice
      : basePrice;
  const originalPrice = selectedVariant ? basePrice : basePrice;
  const hasDiscount = selectedVariant
    ? selectedVariant.price < basePrice
    : salePrice != null && salePrice > 0 && salePrice < basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - unitPrice) / originalPrice) * 100)
    : 0;

  const subtotal = unitPrice * quantity;
  const deliveryCharge =
    deliveryZone === "inside" ? DELIVERY_INSIDE : DELIVERY_OUTSIDE;
  const total = subtotal + deliveryCharge;

  const displayName = product.name_bn || product.name_en || "Product";
  const displayNameEn = product.name_en || "";
  const mainImage =
    productImages.length > 0 ? productImages[0]?.image_url : product.image_url;

  // Auto-detect Dhaka in address and set delivery zone
  useEffect(() => {
    const addr = orderForm.address.toLowerCase();
    if (addr.includes('dhaka') || addr.includes('ঢাকা')) {
      setDeliveryZone('inside');
    } else if (addr.length > 10 && !addr.includes('dhaka') && !addr.includes('ঢাকা')) {
      setDeliveryZone('outside');
    }
  }, [orderForm.address]);

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
    const digits = orderForm.phone.replace(/^\+?88/, "").replace(/\D/g, "");
    return digits.length === 11 && digits.startsWith("0");
  };

  const scrollToOrder = () => {
    orderFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleSubmitOrder = async () => {
    setFormTouched(true);
    if (!orderForm.name || !orderForm.phone || !orderForm.address) {
      toast.warning("Please fill in all required fields");
      return;
    }
    if (!isBdPhoneValid()) {
      toast.warning("Phone number must start with 0 and be 11 digits");
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
        notes: orderForm.note || "",
        payment_method: "cash",
        items: [
          {
            product_id: product.id,
            product_name: productName,
            product_image: product.image_url || null,
            quantity,
            unit_price: unitPrice,
            total_price: subtotal,
          },
        ],
        subtotal,
        delivery_charge: deliveryCharge,
        total_amount: total,
        status: "processing",
        order_source: "landing_page",
        traffic_source: "landing_page",
        referrer_url: typeof window !== "undefined" ? window.location.href : "",
        utm_source: product.slug || `product-${product.id}`,
        utm_medium: "product_landing",
        utm_campaign: product.name_en,
      };

      const res = await apiClient.post("/sales", orderPayload);
      const savedOrderId = res.data?.id || res.data?.data?.id;

      if (savedOrderId) {
        window.location.href = `/thank-you?orderId=${savedOrderId}`;
      } else {
        toast.success("Your order has been placed successfully!");
      }
    } catch (err: any) {
      const savedId = err?.response?.data?.id || err?.response?.data?.data?.id;
      if (savedId) {
        window.location.href = `/thank-you?orderId=${savedId}`;
        return;
      }
      const status = err?.response?.status;
      if (status && status >= 500) {
        toast.success(
          "Your order has been received! We will contact you shortly.",
        );
      } else {
        toast.error("Failed to place order. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>
          {displayName} | {SITE_NAME}
        </title>
        <meta
          name="description"
          content={
            product.short_description ||
            `Buy ${displayNameEn} online at ${SITE_NAME}`
          }
        />
        <link
          rel="canonical"
          href={canonicalUrl(`/products/${product.slug || product.id}`)}
        />
        <meta property="og:title" content={`${displayName} | ${SITE_NAME}`} />
        <meta
          property="og:image"
          content={productImageUrl(product.image_url)}
        />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Minimal Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-center">
          <Link href="/">
            <Image
              src="/trust-cart-logo-main.png"
              alt={SITE_NAME}
              width={160}
              height={60}
              className="h-12 sm:h-14 w-auto object-contain"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
          <div className="flex flex-col items-center">
            {/* Product Image */}
            <div className="relative w-full max-w-md">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                <Image
                  src={
                    productImages[currentImageIndex]?.image_url ||
                    mainImage ||
                    "/placeholder.png"
                  }
                  alt={displayName}
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-contain"
                  priority
                />
                {hasDiscount && discountPercent > 0 && (
                  <div className="absolute top-2 right-2 z-10">
                    <div
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-500 via-green-400 to-green-600 text-white px-3 py-3 text-xs font-extrabold shadow-xl border border-white/60"
                      style={{
                        clipPath:
                          'polygon(50% 0%, 60% 12%, 76% 6%, 72% 22%, 88% 24%, 78% 36%, 100% 50%, 78% 64%, 88% 76%, 72% 78%, 76% 94%, 60% 88%, 50% 100%, 40% 88%, 24% 94%, 28% 78%, 12% 76%, 22% 64%, 0% 50%, 22% 36%, 12% 24%, 28% 22%, 24% 6%, 40% 12%)',
                      }}
                    >
                      <span>-{discountPercent}%</span>
                    </div>
                  </div>
                )}
              </div>
              {/* Thumbnail strip */}
              {productImages.length > 1 && (
                <div className="flex gap-2 mt-3 justify-center overflow-x-auto pb-1">
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex
                          ? "border-orange-500 ring-1 ring-orange-300"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={img.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="text-center mt-6 w-full">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {displayName}
              </h1>
              {displayNameEn && displayName !== displayNameEn && (
                <p className="text-base text-gray-500 mt-1">{displayNameEn}</p>
              )}

              {/* Price */}
              <div className="flex items-baseline justify-center gap-3 mt-4">
                <span className="text-3xl font-bold text-orange-600">
                  ৳{unitPrice}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-gray-400 line-through">
                      ৳{originalPrice}
                    </span>
                    <span className="bg-red-100 text-red-600 text-sm font-semibold px-2 py-0.5 rounded-full">
                      Save {discountPercent}%
                    </span>
                  </>
                )}
              </div>

              {/* Short description */}
              {product.short_description && (
                <p className="text-gray-600 mt-3 text-sm leading-relaxed max-w-lg mx-auto">
                  {product.short_description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Order Form Section */}
      <section ref={orderFormRef} className="py-12 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2 text-orange-600">
            অর্ডার করতে নিচের ফর্মটি পূরণ করুন 👇
          </h2>

          {/* Product / Variant Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">
              প্রোডাক্ট নির্বাচন করুন
            </h3>
            {sizeVariants.length > 0 ? (
              <div className="space-y-3">
                {sizeVariants.map((v) => {
                  const isSelected = selectedVariant?.name === v.name;
                  const isOOS = v.stock !== undefined && v.stock <= 0;
                  const vDiscount =
                    v.price < basePrice
                      ? Math.round(((basePrice - v.price) / basePrice) * 100)
                      : 0;
                  const vQty = variantQuantities[v.name] || 1;
                  return (
                    <div
                      key={v.name}
                      onClick={() => !isOOS && setSelectedVariant(v)}
                      className={`relative border-2 rounded-xl p-3 sm:p-4 cursor-pointer transition-all ${
                        isOOS
                          ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                          : isSelected
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Product Image */}
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white">
                          <Image
                            src={mainImage || "/placeholder.png"}
                            alt={v.name}
                            fill
                            className="object-contain"
                            sizes="64px"
                          />
                        </div>

                        {/* Variant Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm sm:text-base leading-tight text-gray-800">
                            {product.name_bn
                              ? `${product.name_bn} - ${v.name}`
                              : `${product.name_en} - ${v.name}`}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                            {vDiscount > 0 && (
                              <span className="text-xs sm:text-sm line-through font-medium text-red-500">
                                ৳{basePrice}
                              </span>
                            )}
                            <span className="text-base sm:text-xl font-extrabold text-white px-2 py-0.5 rounded bg-orange-500">
                              ৳{v.price}
                            </span>
                            {vDiscount > 0 && (
                              <span className="text-[10px] sm:text-xs font-bold text-green-600 bg-green-100 px-1.5 sm:px-2 py-0.5 rounded-full">
                                {vDiscount}% OFF
                              </span>
                            )}
                          </div>
                          {isOOS && (
                            <p className="text-xs text-red-500 font-medium mt-1">
                              Out of Stock
                            </p>
                          )}

                          {/* Per-variant Quantity */}
                          {isSelected && !isOOS && (
                            <div
                              className="flex items-center gap-3 mt-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  setVariantQuantities((prev) => ({
                                    ...prev,
                                    [v.name]: Math.max(1, vQty - 1),
                                  }))
                                }
                                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                              >
                                <FaMinus className="text-xs" />
                              </button>
                              <span className="w-8 text-center font-semibold">
                                {vQty}
                              </span>
                              <button
                                onClick={() =>
                                  setVariantQuantities((prev) => ({
                                    ...prev,
                                    [v.name]: vQty + 1,
                                  }))
                                }
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
            ) : (
              /* Single product (no variants) */
              <div className="border-2 border-green-500 bg-green-50 rounded-xl p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white">
                    <Image
                      src={mainImage || "/placeholder.png"}
                      alt={displayName}
                      fill
                      className="object-contain"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base leading-tight text-gray-800">
                      {displayName}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                      {hasDiscount && (
                        <span className="text-xs sm:text-sm line-through font-medium text-red-500">
                          ৳{originalPrice}
                        </span>
                      )}
                      <span className="text-base sm:text-xl font-extrabold text-white px-2 py-0.5 rounded bg-orange-500">
                        ৳{unitPrice}
                      </span>
                      {hasDiscount && discountPercent > 0 && (
                        <span className="text-[10px] sm:text-xs font-bold text-green-600 bg-green-100 px-1.5 sm:px-2 py-0.5 rounded-full">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      >
                        <FaMinus className="text-xs" />
                      </button>
                      <span className="w-8 text-center font-semibold">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      >
                        <FaPlus className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customer Details Form */}
          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-gray-700">Billing & Shipping</h3>
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${formTouched && !orderForm.name ? "text-red-600" : "text-gray-600"}`}
              >
                নাম *
              </label>
              <input
                type="text"
                value={orderForm.name}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="আপনার নাম"
                className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${formTouched && !orderForm.name ? "border-red-500 bg-red-50" : ""}`}
              />
            </div>
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${formTouched && !orderForm.address ? "text-red-600" : "text-gray-600"}`}
              >
                আপনার ঠিকানা লিখুন *
              </label>
              <textarea
                value={orderForm.address}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="সম্পূর্ণ ঠিকানা"
                rows={2}
                className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${formTouched && !orderForm.address ? "border-red-500 bg-red-50" : ""}`}
              />
            </div>
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${formTouched && (!orderForm.phone || !isBdPhoneValid()) ? "text-red-600" : "text-gray-600"}`}
              >
                মোবাইল *
              </label>
              <PhoneInput
                value={orderForm.phone}
                onChange={(val) => setOrderForm((f) => ({ ...f, phone: val }))}
                required
                showError={formTouched}
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                অতিরিক্ত নোট (ঐচ্ছিক)
              </label>
              <textarea
                value={orderForm.note}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, note: e.target.value }))
                }
                className="w-full border rounded-lg px-4 py-3"
                rows={2}
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="border rounded-xl p-4 mb-6 bg-gray-50">
            <h3 className="font-semibold text-gray-700 mb-3">Your Order</h3>

            {/* Order Items */}
            <div className="space-y-2 border-b pb-3 mb-3">
              <div className="flex justify-between text-sm">
                <span>
                  {selectedVariant
                    ? `${product.name_bn || product.name_en} (${selectedVariant.name}) × ${quantity}`
                    : `${displayName} × ${quantity}`}
                </span>
                <span className="font-medium">
                  {subtotal.toLocaleString()} ৳
                </span>
              </div>
            </div>

            {/* Delivery Zone Selector */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ডেলিভারি এলাকা নির্বাচন করুন
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryZone("inside")}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                    deliveryZone === "inside"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  ঢাকার ভিতরে
                  <div className="text-xs mt-0.5">
                    {DELIVERY_INSIDE.toLocaleString()} ৳
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryZone("outside")}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                    deliveryZone === "outside"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  ঢাকার বাইরে
                  <div className="text-xs mt-0.5">
                    {DELIVERY_OUTSIDE.toLocaleString()} ৳
                  </div>
                </button>
              </div>
            </div>

            {/* Delivery Charge Line */}
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">ডেলিভারি চার্জ</span>
              <span className="font-medium">
                {deliveryCharge.toLocaleString()} ৳
              </span>
            </div>

            {/* Subtotal */}
            <div className="flex justify-between text-sm border-t pt-2 mb-2">
              <span className="text-gray-600">সাবটোটাল</span>
              <span className="font-medium">{subtotal.toLocaleString()} ৳</span>
            </div>

            {/* Total */}
            <div className="flex justify-between text-base font-bold border-t pt-2 mb-3">
              <span>সর্বমোট</span>
              <span className="text-orange-600">
                {total.toLocaleString()} ৳
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <input
                type="radio"
                checked
                readOnly
                className="accent-orange-500"
              />
              <span>Cash on Delivery</span>
            </div>
            <div className="text-xs text-gray-400 mb-4">
              Your personal data will be used to process your order.
            </div>

            {/* Confirm Order Button */}
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className={`w-full py-3.5 rounded-lg text-base font-bold text-white shadow-md hover:shadow-lg transition-all duration-200 ${
                submitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-500 hover:brightness-110 active:scale-[0.98]"
              }`}
            >
              <FaShoppingCart className="inline mr-2 text-lg align-middle" />
              {submitting
                ? "Processing..."
                : `অর্ডার কনফার্ম করুন — ${total.toLocaleString()} ৳`}
            </button>
          </div>
        </div>
      </section>

      {/* Product Description */}
      {product.description_en && (
        <section className="border-t border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Product Details
            </h2>
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
              <Image
                src="/trust-cart-logo-main.png"
                alt={SITE_NAME}
                width={160}
                height={60}
                className="h-14 w-auto object-contain mb-4 brightness-0 invert"
              />
              <p className="text-sm text-gray-400 leading-relaxed">
                Your trusted source for premium organic groceries, delivered
                fresh to your doorstep.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Quick Links
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/products"
                    className="text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    Shop
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/shipping"
                    className="text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    Shipping Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/returns"
                    className="text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    Returns & Refunds
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Contact Info
              </h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <FaMapMarkerAlt
                    className="text-orange-500 mt-0.5 flex-shrink-0"
                    size={14}
                  />
                  <span className="text-gray-400">
                    Basabo, Dhaka, Bangladesh
                  </span>
                </li>
                {supportPhone && (
                  <li className="flex items-center gap-3">
                    <FaPhone
                      className="text-orange-500 flex-shrink-0"
                      size={14}
                    />
                    <a
                      href={`tel:${supportPhone}`}
                      className="text-gray-400 hover:text-orange-400 transition-colors"
                    >
                      {supportPhone}
                    </a>
                  </li>
                )}
                <li className="flex items-center gap-3">
                  <FaEnvelope
                    className="text-orange-500 flex-shrink-0"
                    size={14}
                  />
                  <span className="text-gray-400">support@trustcart.com</span>
                </li>
              </ul>
              <div className="mt-5 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">
                  We Accept
                </p>
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-gray-800 text-gray-300 border border-gray-700 px-2.5 py-0.5 rounded text-xs font-bold">
                    VISA
                  </span>
                  <span className="bg-gray-800 text-gray-300 border border-gray-700 px-2.5 py-0.5 rounded text-xs font-bold">
                    MASTER
                  </span>
                  <span className="bg-gray-800 text-orange-400 border border-gray-700 px-2.5 py-0.5 rounded text-xs font-bold">
                    bKash
                  </span>
                  <span className="bg-gray-800 text-pink-400 border border-gray-700 px-2.5 py-0.5 rounded text-xs font-bold">
                    Nagad
                  </span>
                  <span className="bg-gray-800 text-gray-300 border border-gray-700 px-2.5 py-0.5 rounded text-xs font-bold">
                    COD
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom Bar */}
        <div className="border-t border-gray-800">
          <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-2">
            <p>
              &copy; {new Date().getFullYear()} {SITE_NAME}. All Rights
              Reserved.
            </p>
            <p>
              Designed by{" "}
              <span className="text-orange-500 font-medium">
                TrustCart Team
              </span>
            </p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp / Phone Buttons */}
      <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-50">
        {supportWhatsApp && (
          <a
            href={`https://wa.me/${supportWhatsApp.replace(/\D/g, "")}`}
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
