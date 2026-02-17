import { getPendingReferralAttribution } from "@/utils/referralAttribution";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useToast } from '@/contexts/ToastContext';
import Link from "next/link";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import {
  FaArrowLeft,
  FaCreditCard,
  FaMinus,
  FaPlus,
  FaShoppingBag,
  FaShoppingCart,
  FaTrash,
} from "react-icons/fa";
import apiClient, { auth, customers } from "@/services/api";
import { TrackingService } from "@/utils/tracking";
import PhoneInput, { validateBDPhone } from "@/components/PhoneInput";
import { trackBeginCheckout, trackAddPaymentInfo, trackPurchaseWithUser, extractLocationFromAddress } from "@/utils/gtm";

export default function Checkout() {
  const router = useRouter();
  const toast = useToast();
  const touchedRef = useRef<Record<string, boolean>>({});
  const [cart, setCart] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [customerProfile, setCustomerProfile] = useState<any | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<any | null>(null);
  const [deliveryZone, setDeliveryZone] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    offerCode: "",
    paymentMethod: "cash",
  });

  const calculateSubtotal = (cartData: any[]) =>
    (cartData || []).reduce(
      (sum: number, item: any) => sum + item.price * (item.quantity || 1),
      0
    );

  const applyCart = (cartData: any[]) => {
    setCart(cartData);
    setSubtotal(calculateSubtotal(cartData));
  };

  const persistCart = (cartData: any[]) => {
    localStorage.setItem("cart", JSON.stringify(cartData));
    applyCart(cartData);
    window.dispatchEvent(new Event("cartUpdated"));
  };

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
    const stored = localStorage.getItem("cart");
    const cartData = stored ? JSON.parse(stored) : [];
    applyCart(cartData);
    
    // Track begin checkout event for GTM/Analytics
    if (cartData.length > 0) {
      const cartTotal = cartData.reduce(
        (sum: number, item: any) => sum + item.price * (item.quantity || 1),
        0
      );
      trackBeginCheckout(
        cartData.map((item: any) => ({
          id: item.id,
          name: item.name || item.name_en,
          price: item.price,
          quantity: item.quantity || 1,
        })),
        cartTotal
      );
    }

    const handleCartUpdate = () => {
      const updated = localStorage.getItem("cart");
      applyCart(updated ? JSON.parse(updated) : []);
    };

    window.addEventListener("cartUpdated", handleCartUpdate);

    const initCustomer = async () => {
      try {
        const user = await auth.getCurrentUser();
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
          const token = localStorage.getItem("authToken");
          const addressResponse = await apiClient.get("/customer-addresses", {
            headers: { Authorization: `Bearer ${token}` },
          });
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

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, []);

  function addSuggestedToCart(product: any) {
    const price = getProductPrice(product);
    if (!product?.id || !price) return;

    const existingIndex = cart.findIndex((item) => item.id === product.id);
    if (existingIndex >= 0) {
      updateQuantity(existingIndex, (cart[existingIndex]?.quantity || 1) + 1);
      return;
    }

    const newItem = {
      id: product.id,
      name: getProductDisplayName(product),
      name_en: product.name_en,
      nameEn: product.name_en,
      sku: product.sku,
      price,
      image: getProductImageUrl(product),
      quantity: 1,
    };

    persistCart([...cart, newItem]);
    setSuggestedProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  function clearCart() {
    localStorage.removeItem("cart");
    applyCart([]);
    window.dispatchEvent(new Event("cartUpdated"));
  }

  function removeItem(index: number) {
    const newCart = cart.filter((_, i) => i !== index);
    persistCart(newCart);
  }

  function updateQuantity(index: number, newQuantity: number) {
    if (newQuantity < 1) return;

    const newCart = [...cart];
    newCart[index] = { ...newCart[index], quantity: newQuantity };
    persistCart(newCart);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.phone || !formData.address) {
      toast.warning("Please fill in all required fields");
      return;
    }

    if (!validateBDPhone(formData.phone)) {
      toast.warning("Please enter a valid 10-digit phone number");
      return;
    }

    if (cart.length === 0) {
      toast.warning("Your cart is empty");
      return;
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
        status: "pending",
        payment_status:
          formData.paymentMethod === "cash" ? "pending" : "pending",
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
            name: item.name || item.name_en,
            price: item.price,
            quantity: item.quantity || 1,
            category: item.category || item.categoryName || undefined,
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
            name: item.name || item.name_en,
            price: item.price,
            quantity: item.quantity || 1,
          })),
          total,
          formData.paymentMethod
        );
        
        localStorage.removeItem("cart");
        router.push(`/thank-you?orderId=${response.data.id}`);
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
  const total = subtotal + deliveryCharge;

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      {/* Breadcrumb */}
      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600 max-w-7xl mx-auto">
            Home / Cart /{" "}
            <span className="text-gray-900 font-semibold">Checkout</span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
            <FaShoppingCart className="text-orange-500" />
            Cart
          </h2>

          <form onSubmit={handleSubmit}>
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
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
                    >
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
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Price</div>
                        <div className="font-bold text-orange-500">
                          ৳{item.price}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-600 p-2"
                        onClick={() => removeItem(index)}
                      >
                        <FaTrash />
                      </button>
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
            <h2 className="text-3xl font-bold text-gray-800 mt-16 mb-8 flex items-center gap-3">
              <FaCreditCard className="text-orange-500" />
              Checkout
            </h2>
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
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Enter Your Full Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Enter Your Email (Optional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Phone *
                      </label>
                      <PhoneInput
                        name="phone"
                        value={formData.phone}
                        onChange={(value) => {
                          touchedRef.current['phone'] = true;
                          setFormData({ ...formData, phone: value });
                        }}
                        required
                        placeholder="01712345678"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold mb-2">
                        Address *
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Enter Your Detailed Shipping Address"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold mb-2">
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
                      <label className="block text-sm font-semibold mb-2">
                        Order Notes (Optional)
                      </label>
                      <textarea
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
                    <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-orange-500">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={formData.paymentMethod === "cash"}
                        onChange={handleChange}
                        className="text-orange-500"
                      />
                      <span className="font-semibold">Cash on Delivery</span>
                    </label>

                    <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-orange-500">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bkash"
                        checked={formData.paymentMethod === "bkash"}
                        onChange={handleChange}
                        className="text-orange-500"
                      />
                      <span className="font-semibold">bKash</span>
                    </label>

                    <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-orange-500">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={formData.paymentMethod === "card"}
                        onChange={handleChange}
                        className="text-orange-500"
                      />
                      <span className="font-semibold">Credit/Debit Card</span>
                    </label>
                  </div>
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
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Offer / Coupon Code (Optional)
                    </label>
                    <input
                      type="text"
                      name="offerCode"
                      value={formData.offerCode}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="Enter offer/coupon code"
                    />
                    <div className="text-xs text-gray-600 mt-2">
                      If you have a referral coupon/offer code, paste it here.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || cart.length === 0}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-bold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? "Placing Order..." : "Place Order"}
                  </button>

                  {suggestedProducts.length > 0 && (
                    <div className="border-t mt-6 pt-4">
                      <h4 className="text-sm font-bold text-gray-800 mb-3">
                        Suggested Products
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {suggestedProducts.slice(0, 3).map((product) => {
                          const price = getProductPrice(product);
                          const imageUrl = getProductImageUrl(product);
                          return (
                            <div
                              key={product.id}
                              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                            >
                              <div className="h-28 bg-gray-50 flex items-center justify-center overflow-hidden">
                                <img
                                  src={imageUrl}
                                  alt={getProductDisplayName(product)}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      "/default-product.png";
                                  }}
                                />
                              </div>

                              <div className="p-3">
                                <div className="text-sm font-semibold text-gray-800 leading-snug">
                                  {getProductDisplayName(product)}
                                </div>

                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <div className="text-sm font-bold text-orange-500">
                                    ৳{price}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addSuggestedToCart(product)}
                                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-sm transition"
                                  >
                                    Add to cart
                                  </button>
                                </div>
                              </div>
                            </div>
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
      <ElectroFooter />
    </div>
  );
}
