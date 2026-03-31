import { getPendingReferralAttribution } from "@/utils/referralAttribution";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useToast } from '@/contexts/ToastContext';
import Link from "next/link";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import ElectroProductCard from "@/components/ElectroProductCard";
import {
  FaArrowLeft,
  FaCreditCard,
  FaLock,
  FaMinus,
  FaPlus,
  FaShoppingBag,
  FaShoppingCart,
  FaTrash,
  FaExclamationTriangle,
  FaInfoCircle,
} from "react-icons/fa";
import apiClient, { customers, stockAvailability } from "@/services/api";
import { TrackingService } from "@/utils/tracking";
import PhoneInput, { validateBDPhone } from "@/components/PhoneInput";
import { trackBeginCheckout, trackAddPaymentInfo, trackPurchaseWithUser, extractLocationFromAddress } from "@/utils/gtm";
import { initiatePayment, redirectToPaymentGateway } from "@/services/payment";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

export default function Checkout() {
  const router = useRouter();
  const toast = useToast();
  const { user: authUser } = useAuth();
  const { items: cart, addItem, removeItem: removeCartItem, updateQuantity: updateCartQuantity, clearCart: clearAllCart, setItems: setCartItems } = useCart();
  const touchedRef = useRef<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [customerProfile, setCustomerProfile] = useState<any | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<any | null>(null);
  const [deliveryZone, setDeliveryZone] = useState<'inside_dhaka' | 'outside_dhaka'>('outside_dhaka');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [guestAccountCreated, setGuestAccountCreated] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    offerCode: "",
    paymentMethod: "cash",
  });

  const subtotal = cart.reduce(
    (sum: number, item: any) => sum + item.price * (item.quantity || 1),
    0
  );

  const getProductDisplayName = (product: any) =>
    product?.name_en || product?.name_bn || product?.name || "Product";

  const getProductPrice = (product: any) => {
    const price =
      product?.base_price ??
      product?.price ??
      product?.sale_price ??
      product?.salePrice ??
      0;
    return Number(price) || 0;
  };

  const getProductImageUrl = (product: any) => {
    const candidate =
      product?.image_url ??
      product?.imageUrl ??
      product?.image ??
      product?.thumb ??
      product?.thumbnail ??
      product?.imageUrl ??
      null;

    const resolved = typeof candidate === "string" ? candidate.trim() : "";
    return resolved || "/default-product.png";
  };

  const loadSuggestedProducts = async () => {
    try {
      const response = await apiClient.get("/products");
      const products = response.data || [];
      setSuggestedProducts(products.slice(0, 3));
    } catch (error) {
      console.error("Failed to load suggested products:", error);
    }
  };

  useEffect(() => {
    // Track begin checkout event for GTM/Analytics
    if (cart.length > 0) {
      const cartTotal = cart.reduce(
        (sum: number, item: any) => sum + item.price * (item.quantity || 1),
        0
      );
      trackBeginCheckout(
        cart.map((item: any) => ({
          id: item.id,
          name: item.name || item.name_en,
          price: item.price,
          quantity: item.quantity || 1,
        })),
        cartTotal
      );
    }

    const initCustomer = async () => {
      try {
        const user = authUser;
        if (!user || !(user as any).email) return;

        setCurrentUser(user);

        // Prefill from the authenticated user immediately (works even if CRM lookup fails)
        setFormData((prev) => {
          const isTouched = touchedRef.current;
          const fullNameFromUser = String(
            (user as any).name ?? (user as any).fullName ?? ""
          ).trim();
          const emailFromUser = String((user as any).email ?? "").trim();
          const phoneFromUser = String((user as any).phone ?? "").trim();

          return {
            ...prev,
            fullName:
              isTouched.fullName || prev.fullName
                ? prev.fullName
                : fullNameFromUser,
            email:
              isTouched.email || prev.email ? prev.email : emailFromUser,
            phone:
              isTouched.phone || prev.phone ? prev.phone : phoneFromUser,
          };
        });

        // Optionally resolve a CRM customer + default address
        let match: any | null = null;
        try {
          match = await customers.me();
          if (match) setCustomerProfile(match);
        } catch (err) {
          console.warn(
            "Customer list lookup failed (prefill still applied):",
            err
          );
        }

        if (!match) return;

        const fullNameFromMatch =
          String(match.name ?? "").trim() ||
          `${String(match.firstName ?? "").trim()} ${String(
            match.lastName ?? ""
          ).trim()}`.trim();

        // Load customer addresses to get default address details
        try {
          const addressResponse = await apiClient.get("/customer-addresses");
          const addresses = addressResponse.data;
          const primaryAddress =
            addresses.find((addr: any) => addr.isPrimary) || addresses[0];

          if (primaryAddress) {
            setDefaultAddress(primaryAddress);
          }

          setFormData((prev) => {
            const isTouched = touchedRef.current;
            return {
              ...prev,
              fullName:
                isTouched.fullName || prev.fullName
                  ? prev.fullName
                  : fullNameFromMatch || prev.fullName,
              email:
                isTouched.email || prev.email
                  ? prev.email
                  : match.email || prev.email,
              phone:
                isTouched.phone || prev.phone
                  ? prev.phone
                  : primaryAddress?.phone || match.phone || prev.phone,
              address:
                isTouched.address || prev.address
                  ? prev.address
                  : primaryAddress?.streetAddress ||
                    match.address ||
                    prev.address,
            };
          });
        } catch (addrError) {
          console.error("Error loading addresses:", addrError);
          // Fallback to basic customer data
          setFormData((prev) => {
            const isTouched = touchedRef.current;
            return {
              ...prev,
              fullName:
                isTouched.fullName || prev.fullName
                  ? prev.fullName
                  : fullNameFromMatch || prev.fullName,
              email:
                isTouched.email || prev.email
                  ? prev.email
                  : match.email || prev.email,
              phone:
                isTouched.phone || prev.phone
                  ? prev.phone
                  : match.phone || prev.phone,
              address:
                isTouched.address || prev.address
                  ? prev.address
                  : match.address || prev.address,
            };
          });
        }
      } catch (e) {
        console.error("Error loading customer for checkout:", e);
      }
    };

    initCustomer();
    loadSuggestedProducts();
  }, []);

  function addSuggestedToCart(product: any) {
    const price = getProductPrice(product);
    if (!product?.id || !price) return;

    addItem({
      id: product.id,
      name: getProductDisplayName(product),
      name_en: product.name_en,
      price,
      image: getProductImageUrl(product),
      quantity: 1,
    });

    setSuggestedProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  function clearCart() {
    clearAllCart();
  }

  function removeItem(index: number) {
    removeCartItem(index);
  }

  function updateQuantity(index: number, newQuantity: number) {
    if (newQuantity < 1) return;
    updateCartQuantity(index, newQuantity);
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    touchedRef.current[e.target.name] = true;
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error on change
    if (formErrors[e.target.name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[e.target.name];
        return next;
      });
    }
  };

  // Auto-detect Dhaka in address and set delivery zone
  useEffect(() => {
    const addr = formData.address.toLowerCase();
    if (addr.includes('dhaka') || addr.includes('ঢাকা')) {
      setDeliveryZone('inside_dhaka');
    } else if (addr.length > 10 && !addr.includes('dhaka') && !addr.includes('ঢাকা')) {
      setDeliveryZone('outside_dhaka');
    }
  }, [formData.address]);

  // Read coupon from URL query params (passed from cart page)
  useEffect(() => {
    if (router.isReady && router.query.coupon && !formData.offerCode) {
      setFormData((prev) => ({ ...prev, offerCode: String(router.query.coupon) }));
    }
  }, [router.isReady, router.query.coupon]);

  // Reset coupon when code changes
  const handleCouponCodeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, offerCode: value }));
    if (couponApplied) {
      setCouponApplied(false);
      setCouponDiscount(0);
      setCouponMsg('');
      setCouponError('');
    }
  };

  const applyCoupon = async () => {
    const code = formData.offerCode.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponMsg('');
    setCouponError('');
    setCouponDiscount(0);
    setCouponApplied(false);
    try {
      const res = await apiClient.post('/coupons/validate', {
        code,
        customerId: customerProfile?.id || currentUser?.id || null,
        customerPhone: formData.phone || null,
        cartTotal: subtotal,
      });
      const data = res.data;
      if (data.valid) {
        setCouponDiscount(data.discountAmount);
        setCouponMsg(data.message);
        setCouponApplied(true);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Invalid coupon code';
      setCouponError(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!validateBDPhone(formData.phone)) {
      errors.phone = 'Enter a valid Bangladesh phone number (e.g. 01712345678)';
    }
    if (!formData.address.trim()) errors.address = 'Shipping address is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Enter a valid email address';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);

    if (!validateForm()) {
      toast.warning('Please fix the errors in the form');
      // Scroll to first error
      const firstErrorField = document.querySelector('[data-error="true"]');
      firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (cart.length === 0) {
      toast.warning("Your cart is empty");
      return;
    }

    // Check stock availability before placing order
    try {
      const productIds = cart.map((item) => item.id);
      const availability = await stockAvailability.bulkCheck(productIds);
      if (availability && availability.length > 0) {
        const outOfStock: string[] = [];
        for (const item of cart) {
          const stock = availability.find((s: any) => s.product_id === item.id);
          if (stock && stock.total_available < (item.quantity || 1)) {
            outOfStock.push(
              `${item.name || item.name_en}: only ${stock.total_available} available`
            );
          }
        }
        if (outOfStock.length > 0) {
          toast.error(`Insufficient stock: ${outOfStock.join(', ')}`);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      // Best-effort: allow checkout to proceed if stock check fails
      console.warn('Stock availability check failed, proceeding with order:', err);
    }

    setLoading(true);

    try {
      // Collect tracking information
      const trackingInfo = await TrackingService.collectTrackingInfo();

      // If not logged in, check if customer exists by phone or email
      let customerId = customerProfile?.id ?? null;

      if (!customerId) {
        try {
          const lookup = await apiClient.get('/customers/lookup', {
            params: {
              phone: formData.phone,
              email: formData.email || undefined,
            },
          });

          if (lookup.data?.id) {
            customerId = lookup.data.id;
          } else {
            const pendingReferral = getPendingReferralAttribution();
            const newCustomer = await apiClient.post('/customers/public', {
              name: formData.fullName,
              email: formData.email || null,
              phone: formData.phone,
              address: formData.address,
              ...(pendingReferral?.code
                ? {
                    ref: pendingReferral.code,
                    referralChannel: pendingReferral.channel || 'checkout',
                  }
                : null),
            });
            customerId = newCustomer.data.id;
            setGuestAccountCreated(true);
          }
        } catch (error) {
          console.error("Error checking/creating customer:", error);
          // Continue with order submission even if customer lookup fails
        }
      }

      const deliveryCharge = deliveryZone === 'inside_dhaka' ? 60 : 110;
      const total = subtotal + deliveryCharge;

      const orderData = {
        // Link to CRM/CDM customer if logged in or found/created
        customer_id: customerId,
        customer_name: formData.fullName,
        customer_email: formData.email || null,
        customer_phone: formData.phone,
        shipping_address: formData.address,
        notes: formData.notes,
        ...(formData.offerCode?.trim()
          ? { offer_code: formData.offerCode.trim() }
          : {}),
        payment_method: formData.paymentMethod,
        items: cart.map((item) => ({
          product_id: item.id,
          product_name: item.name || item.name_en,
          quantity: item.quantity || 1,
          unit_price: item.price,
          total_price: item.price * (item.quantity || 1),
        })),
        subtotal: subtotal,
        delivery_charge: deliveryCharge,
        total_amount: total,
        status: "processing",
        payment_status: "pending",
        // User tracking info
        user_ip: trackingInfo.userIp,
        geo_location: trackingInfo.geoLocation,
        browser_info: trackingInfo.browserInfo,
        device_type: trackingInfo.deviceType,
        operating_system: trackingInfo.operatingSystem,
        traffic_source: trackingInfo.trafficSource,
        referrer_url: trackingInfo.referrerUrl,
        utm_source: trackingInfo.utmSource,
        utm_medium: trackingInfo.utmMedium,
        utm_campaign: trackingInfo.utmCampaign,
      };

      const response = await apiClient.post("/sales", orderData);

      if (response.data) {
        // Extract city/district from address
        const location = extractLocationFromAddress(formData.address);
        
        // Track purchase event for GTM/Analytics with user info
        trackPurchaseWithUser({
          orderId: response.data.id || response.data.orderNumber,
          totalValue: total,
          shipping: deliveryCharge,
          discount: response.data.discountAmount || 0,
          coupon: formData.offerCode || undefined,
          items: cart.map((item) => ({
            id: item.id,
            name: item.name || item.name_en || 'Product',
            price: item.price,
            quantity: item.quantity || 1,
            category: item.category || undefined,
          })),
          user: {
            name: formData.fullName,
            phone: formData.phone,
            email: formData.email || undefined,
            city: location.city,
            district: location.district,
            area: location.area,
            address: formData.address,
          },
        });
        
        // Also track payment info
        trackAddPaymentInfo(
          cart.map((item) => ({
            id: item.id,
            name: item.name || item.name_en || 'Product',
            price: item.price,
            quantity: item.quantity || 1,
          })),
          total,
          formData.paymentMethod
        );

        // For online payment methods (bKash, Card), initiate SSLCommerz payment
        if (formData.paymentMethod === "bkash" || formData.paymentMethod === "card") {
          try {
            const paymentResult = await initiatePayment({
              orderId: response.data.id,
              customerName: formData.fullName,
              customerEmail: formData.email || undefined,
              customerPhone: formData.phone,
              shippingAddress: formData.address,
            });

            if (paymentResult.success && paymentResult.gatewayUrl) {
              // Cart will be cleared on payment success page — keep it until order is confirmed
              redirectToPaymentGateway(paymentResult.gatewayUrl);
              return; // Don't proceed further — browser will navigate away
            } else {
              // Payment initiation failed, redirect to thank-you with pending status
              toast.warning("Payment gateway could not be initialized. Your order has been placed — you can pay later.");
              clearAllCart();
              router.push(`/thank-you?orderId=${response.data.id}`);
            }
          } catch (paymentError: any) {
            console.error("Payment initiation error:", paymentError);
            toast.warning("Payment gateway is temporarily unavailable. Your order has been saved — please try paying again from your order page or contact support.");
            clearAllCart();
            router.push(`/thank-you?orderId=${response.data.id}`);
          }
        } else {
          // Cash on Delivery — go to thank-you page
          clearAllCart();
          router.push(`/thank-you?orderId=${response.data.id}`);
        }
      }
    } catch (error: any) {
      console.error("Order submission error:", error);
      toast.error(
        "Failed to place order: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const deliveryCharge = deliveryZone === 'inside_dhaka' ? 60 : 110;
  const total = subtotal + deliveryCharge - couponDiscount;

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      {/* Breadcrumb */}
      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600 max-w-7xl mx-auto">
            <Link href="/" className="hover:text-orange-500">Home</Link> / <Link href="/cart" className="hover:text-orange-500">Cart</Link> /{" "}
            <span className="text-gray-900 font-semibold">Checkout</span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <div className="container mx-auto px-4 py-12 pb-24 lg:pb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8 flex items-center gap-3">
            <FaShoppingCart className="text-orange-500" />
            Cart
          </h2>

          <form ref={formRef} onSubmit={handleSubmit}>
            {/* Cart Items (same features as Cart page) */}
            {cart.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Your cart is empty
                </h3>
                <p className="text-gray-600 mb-4">
                  Add products to proceed with checkout.
                </p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold"
                >
                  <FaArrowLeft />
                  Continue Shopping
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  Cart Items ({cart.length} products)
                </h3>

                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      {/* Mobile layout: stacked */}
                      <div className="flex items-start gap-3 sm:hidden">
                        <img
                          src={item.image || "/default-product.png"}
                          alt={item.name || item.nameEn || item.name_en}
                          className="w-16 h-16 object-cover rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h6 className="font-bold text-gray-800 text-sm line-clamp-2">
                              {item.name || item.nameEn || item.name_en}
                            </h6>
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-600 p-1 flex-shrink-0"
                              onClick={() => removeItem(index)}
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                          {item.sku ? (
                            <p className="text-xs text-gray-500 mt-0.5">
                              SKU: {item.sku}
                            </p>
                          ) : null}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="w-7 h-7 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded"
                                onClick={() =>
                                  updateQuantity(index, (item.quantity || 1) - 1)
                                }
                              >
                                <FaMinus size={10} />
                              </button>
                              <span className="w-8 text-center font-bold text-sm">
                                {item.quantity || 1}
                              </span>
                              <button
                                type="button"
                                className="w-7 h-7 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded"
                                onClick={() =>
                                  updateQuantity(index, (item.quantity || 1) + 1)
                                }
                              >
                                <FaPlus size={10} />
                              </button>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-orange-500">
                                ৳{(item.price * (item.quantity || 1)).toFixed(2)}
                              </div>
                              {(item.quantity || 1) > 1 && (
                                <div className="text-xs text-gray-400">৳{item.price} each</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Desktop layout: single row */}
                      <div className="hidden sm:flex items-center gap-4">
                        <img
                          src={item.image || "/default-product.png"}
                          alt={item.name || item.nameEn || item.name_en}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h6 className="font-bold text-gray-800">
                            {item.name || item.nameEn || item.name_en}
                          </h6>
                          {item.sku ? (
                            <p className="text-sm text-gray-500">
                              SKU: {item.sku}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded"
                            onClick={() =>
                              updateQuantity(index, (item.quantity || 1) - 1)
                            }
                          >
                            <FaMinus size={12} />
                          </button>
                          <span className="w-12 text-center font-bold">
                            {item.quantity || 1}
                          </span>
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded"
                            onClick={() =>
                              updateQuantity(index, (item.quantity || 1) + 1)
                            }
                          >
                            <FaPlus size={12} />
                          </button>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <div className="text-sm text-gray-500">Total</div>
                          <div className="font-bold text-orange-500">
                            ৳{(item.price * (item.quantity || 1)).toFixed(2)}
                          </div>
                          {(item.quantity || 1) > 1 && (
                            <div className="text-xs text-gray-400">৳{item.price} each</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-600 p-2"
                          onClick={() => removeItem(index)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="mt-6 flex items-center gap-2 text-red-500 hover:text-red-600 font-semibold"
                  onClick={clearCart}
                >
                  <FaTrash />
                  Clear Cart
                </button>
              </div>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mt-12 sm:mt-16 mb-6 sm:mb-8 flex items-center gap-3">
              <FaCreditCard className="text-orange-500" />
              Checkout
            </h2>

            {/* Guest account notice */}
            {!authUser && (
              <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg flex items-start gap-3">
                <FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">Ordering as a guest</p>
                  <p className="mt-1">You can checkout without an account. An account will be created for you automatically so you can track your order. <Link href="/customer/login" className="underline font-semibold hover:text-blue-900">Log in</Link> if you already have an account.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Billing Details */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">
                    Billing Details
                  </h3>

                  {customerProfile && (
                    <div className="mb-5 p-4 border border-green-200 bg-green-50 rounded-lg text-sm text-gray-800">
                      <div className="font-semibold mb-1">
                        Default Address (from your profile)
                      </div>
                      {defaultAddress ? (
                        <>
                          <div className="font-medium">
                            {customerProfile.name || formData.fullName}
                          </div>
                          <div>
                            {defaultAddress.phone || customerProfile.phone}
                          </div>
                          <div>{defaultAddress.streetAddress}</div>
                          {defaultAddress.postalCode && (
                            <div>Postal Code: {defaultAddress.postalCode}</div>
                          )}
                        </>
                      ) : (
                        <>
                          <div>{customerProfile.name}</div>
                          <div>{customerProfile.phone}</div>
                          <div>{customerProfile.address || "Not set"}</div>
                        </>
                      )}
                      <div className="text-xs text-gray-600 mt-1">
                        You can place the order to this address or update the
                        fields below to deliver to a different location.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div data-error={!!formErrors.fullName || undefined}>
                      <label htmlFor="fullName" className="block text-sm font-semibold mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none transition-colors ${
                          formErrors.fullName
                            ? 'border-red-400 bg-red-50 focus:border-red-500'
                            : 'border-gray-300 focus:border-orange-500'
                        }`}
                        placeholder="Enter Your Full Name"
                      />
                      {formErrors.fullName && (
                        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                          <FaExclamationTriangle size={12} />
                          {formErrors.fullName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold mb-2">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none transition-colors ${
                          formErrors.email
                            ? 'border-red-400 bg-red-50 focus:border-red-500'
                            : 'border-gray-300 focus:border-orange-500'
                        }`}
                        placeholder="Enter Your Email (Optional)"
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                          <FaExclamationTriangle size={12} />
                          {formErrors.email}
                        </p>
                      )}
                    </div>

                    <div data-error={!!formErrors.phone || undefined}>
                      <label htmlFor="phone" className="block text-sm font-semibold mb-2">
                        Phone *
                      </label>
                      <PhoneInput
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={(value) => {
                          touchedRef.current['phone'] = true;
                          setFormData({ ...formData, phone: value });
                          if (formErrors.phone) {
                            setFormErrors((prev) => {
                              const next = { ...prev };
                              delete next.phone;
                              return next;
                            });
                          }
                        }}
                        required
                        placeholder="01712345678"
                      />
                      {formErrors.phone && (
                        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                          <FaExclamationTriangle size={12} />
                          {formErrors.phone}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2" data-error={!!formErrors.address || undefined}>
                      <label htmlFor="address" className="block text-sm font-semibold mb-2">
                        Address *
                      </label>
                      <textarea
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        rows={3}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none transition-colors ${
                          formErrors.address
                            ? 'border-red-400 bg-red-50 focus:border-red-500'
                            : 'border-gray-300 focus:border-orange-500'
                        }`}
                        placeholder="Enter Your Detailed Shipping Address"
                      />
                      {formErrors.address && (
                        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                          <FaExclamationTriangle size={12} />
                          {formErrors.address}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="deliveryZone" className="block text-sm font-semibold mb-2">
                        Delivery Zone *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            deliveryZone === 'inside_dhaka'
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-300 hover:border-orange-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliveryZone"
                            value="inside_dhaka"
                            checked={deliveryZone === 'inside_dhaka'}
                            onChange={() => setDeliveryZone('inside_dhaka')}
                            className="text-orange-500"
                          />
                          <div>
                            <span className="font-semibold">Inside Dhaka</span>
                            <span className="block text-sm text-gray-500">৳60</span>
                          </div>
                        </label>
                        <label
                          className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            deliveryZone === 'outside_dhaka'
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-300 hover:border-orange-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliveryZone"
                            value="outside_dhaka"
                            checked={deliveryZone === 'outside_dhaka'}
                            onChange={() => setDeliveryZone('outside_dhaka')}
                            className="text-orange-500"
                          />
                          <div>
                            <span className="font-semibold">Outside Dhaka</span>
                            <span className="block text-sm text-gray-500">৳110</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="notes" className="block text-sm font-semibold mb-2">
                        Order Notes (Optional)
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Add any special instructions for your order..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">
                    Payment Method
                  </h3>

                  <div className="space-y-3">
                    <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.paymentMethod === "cash"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-300 hover:border-orange-300"
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={formData.paymentMethod === "cash"}
                        onChange={handleChange}
                        className="text-orange-500"
                      />
                      <div>
                        <span className="font-semibold">Cash on Delivery</span>
                        <span className="block text-sm text-gray-500">Pay when you receive the product</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.paymentMethod === "bkash"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-300 hover:border-orange-300"
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bkash"
                        checked={formData.paymentMethod === "bkash"}
                        onChange={handleChange}
                        className="text-orange-500"
                      />
                      <div>
                        <span className="font-semibold">bKash / Mobile Banking</span>
                        <span className="block text-sm text-gray-500">Pay securely via bKash, Nagad, Rocket & more</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.paymentMethod === "card"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-300 hover:border-orange-300"
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={formData.paymentMethod === "card"}
                        onChange={handleChange}
                        className="text-orange-500"
                      />
                      <div>
                        <span className="font-semibold">Credit/Debit Card</span>
                        <span className="block text-sm text-gray-500">Visa, Mastercard, AMEX & more</span>
                      </div>
                    </label>
                  </div>

                  {(formData.paymentMethod === "bkash" || formData.paymentMethod === "card") && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-800">
                      <FaLock className="text-blue-600 flex-shrink-0" />
                      <span>
                        You will be redirected to <strong>SSLCommerz</strong> secure payment gateway to complete your payment.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FaShoppingBag className="text-orange-500" />
                    Order Summary
                  </h3>

                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {cart.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.name || item.nameEn} × {item.quantity || 1}
                        </span>
                        <span className="font-semibold">
                          ৳{(item.price * (item.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2 mb-4">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-semibold">
                        ৳{subtotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-gray-600">
                      <span>Delivery ({deliveryZone === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</span>
                      <span className="font-semibold">
                        ৳{deliveryCharge}
                      </span>
                    </div>

                    {couponApplied && couponDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Coupon Discount</span>
                        <span className="font-semibold">-৳{couponDiscount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between text-lg">
                      <strong>Total</strong>
                      <strong className="text-orange-500">
                        ৳{total.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <label htmlFor="offerCode" className="block text-sm font-semibold text-gray-800 mb-2">
                      Offer / Coupon Code (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="offerCode"
                        name="offerCode"
                        value={formData.offerCode}
                        onChange={(e) => handleCouponCodeChange(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Enter offer/coupon code"
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={couponLoading || !formData.offerCode.trim() || couponApplied}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {couponLoading ? 'Checking...' : couponApplied ? 'Applied' : 'Apply'}
                      </button>
                    </div>
                    {couponMsg && (
                      <div className="text-sm text-green-600 mt-2 font-medium">{couponMsg}</div>
                    )}
                    {couponError && (
                      <div className="text-sm text-red-600 mt-2 font-medium">{couponError}</div>
                    )}
                    {!couponMsg && !couponError && (
                      <div className="text-xs text-gray-600 mt-2">
                        If you have a referral coupon/offer code, paste it here.
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || cart.length === 0}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-bold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? (formData.paymentMethod === "cash" ? "Placing Order..." : "Redirecting to Payment...")
                      : (formData.paymentMethod === "cash" ? "Place Order" : "Place Order & Pay Now")}
                  </button>

                  {suggestedProducts.length > 0 && (
                    <div className="border-t mt-6 pt-4">
                      <h4 className="text-sm font-bold text-gray-800 mb-3">
                        Suggested Products
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {suggestedProducts.slice(0, 2).map((product) => {
                          const basePrice = Number(product.price) || Number(product.mrp) || 0;
                          const salePrice = product.special_price
                            ? Number(product.special_price)
                            : product.sale_price
                              ? Number(product.sale_price)
                              : product.salePrice || basePrice;
                          const discountPercent = product.discount_percent
                            || (basePrice > salePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0);
                          return (
                            <ElectroProductCard
                              key={product.id}
                              id={product.id}
                              slug={product.slug}
                              name={product.name_en || product.name}
                              nameBn={product.name_bn}
                              nameEn={product.name_en}
                              categoryName={
                                product.category_name ||
                                product.category?.name_en ||
                                product.category?.name
                              }
                              price={salePrice}
                              originalPrice={basePrice}
                              stock={product.stock_quantity}
                              image={product.image_url}
                              rating={5}
                              reviews={0}
                              discount={discountPercent > 0 ? discountPercent : undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Sticky Mobile Order Summary Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] p-3 lg:hidden z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-gray-500">{cart.length} item{cart.length > 1 ? 's' : ''} · {deliveryZone === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}</div>
              <div className="text-lg font-bold text-orange-500">৳{total.toFixed(2)}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (formRef.current) {
                  if (typeof formRef.current.requestSubmit === 'function') {
                    formRef.current.requestSubmit();
                  } else {
                    formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }
                }
              }}
              disabled={loading || cart.length === 0}
              className="flex-1 max-w-[200px] bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-bold transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Placing...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}

      <ElectroFooter />
    </div>
  );
}
