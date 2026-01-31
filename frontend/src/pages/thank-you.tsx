import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useToast } from '@/contexts/ToastContext';
import Link from "next/link";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import ElectroProductCard from "@/components/ElectroProductCard";
import apiClient from "@/services/api";
import { 
  FaCheckCircle, 
  FaShoppingCart, 
  FaClock, 
  FaTruck, 
  FaBoxOpen,
  FaChevronLeft,
  FaChevronRight
} from "react-icons/fa";
import { HiOutlineClipboardCheck } from "react-icons/hi";

type OrderItem = {
  id: number;
  productId: number;
  productName?: string;
  productImage?: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type ThankYouOffer = {
  id: number;
  title?: string;
  subtitle?: string;
  description?: string;
  primary_button_text?: string;
  is_active?: boolean;
  background_gradient?: string;
  product_id?: number;
  offer_price?: number;
  context?: string;
};

// Order status steps
const ORDER_STATUSES = [
  { key: "ordered", label: "Ordered", sublabel: "Order placed", icon: HiOutlineClipboardCheck },
  { key: "processing", label: "Processing", sublabel: "Preparing for delivery", icon: FaClock },
  { key: "under_delivery", label: "Under Delivery", sublabel: "On Courier", icon: FaTruck },
  { key: "delivered", label: "Delivered", sublabel: "Delivered to customer", icon: FaBoxOpen },
];

// Helper to get relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs} seconds Ago`;
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} Ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} Ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} Ago`;
}

// Format date
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

export default function ThankYouPage() {
  const router = useRouter();
  const toast = useToast();
  const orderId = useMemo(() => {
    const raw = router.query.orderId;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? String(value) : "";
  }, [router.query.orderId]);

  const [order, setOrder] = useState<any | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [offer, setOffer] = useState<ThankYouOffer | null>(null);
  const [offerProduct, setOfferProduct] = useState<any | null>(null);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [offerAccepted, setOfferAccepted] = useState(false);

  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [recPage, setRecPage] = useState(0);

  const loadOrder = async (id: string) => {
    const [orderRes, itemsRes] = await Promise.all([
      apiClient.get(`/sales/public/${id}`),
      apiClient.get(`/sales/public/${id}/items`),
    ]);

    setOrder(orderRes.data);
    setItems(itemsRes.data || []);

    const alreadyAccepted = Boolean(orderRes.data?.thankYouOfferAccepted);
    setOfferAccepted(alreadyAccepted);
  };

  const loadOffer = async () => {
    try {
      const res = await apiClient.get("/special-offers/thank-you");
      setOffer(res.data || null);
    } catch (e) {
      setOffer(null);
    }
  };

  const loadRecommended = async () => {
    try {
      const res = await apiClient.get("/products/featured/suggested?limit=8");
      setRecommendedProducts(res.data || []);
    } catch (e) {
      setRecommendedProducts([]);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;

    const run = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await Promise.all([loadOrder(orderId), loadOffer(), loadRecommended()]);
      } catch (e) {
        console.error("Failed to load thank you page data:", e);
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, orderId]);

  useEffect(() => {
    const run = async () => {
      if (!offer?.product_id) {
        setOfferProduct(null);
        return;
      }

      try {
        const res = await apiClient.get(`/products/${offer.product_id}`);
        setOfferProduct(res.data);
      } catch (e) {
        setOfferProduct(null);
      }
    };

    run();
  }, [offer?.product_id]);

  const handleAcceptOffer = async () => {
    if (!orderId) return;

    try {
      setAcceptingOffer(true);
      await apiClient.post(`/sales/${orderId}/accept-thank-you-offer`, {});
      await loadOrder(orderId);
      setOfferAccepted(true);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Failed to accept offer"
      );
    } finally {
      setAcceptingOffer(false);
    }
  };

  const totalAmount = useMemo(() => {
    const raw = order?.totalAmount ?? order?.total_amount ?? 0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  }, [order]);

  const subtotal = useMemo(() => {
    const raw = order?.subtotal ?? order?.sub_total ?? 0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : items.reduce((acc, it) => acc + Number(it.lineTotal || 0), 0);
  }, [order, items]);

  const deliveryCharge = useMemo(() => {
    const raw = order?.deliveryCharge ?? order?.delivery_charge ?? order?.shippingCost ?? order?.shipping_cost ?? 0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  }, [order]);

  const discount = useMemo(() => {
    const raw = order?.discount ?? order?.discount_amount ?? 0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  }, [order]);

  const orderDate = useMemo(() => {
    const raw = order?.createdAt ?? order?.created_at ?? order?.orderDate ?? order?.order_date;
    return raw ? new Date(raw) : new Date();
  }, [order]);

  const orderStatus = useMemo(() => {
    return order?.status ?? order?.order_status ?? "ordered";
  }, [order]);

  const currentStatusIndex = useMemo(() => {
    const statusMap: Record<string, number> = {
      ordered: 0,
      pending: 0,
      confirmed: 0,
      processing: 1,
      preparing: 1,
      shipped: 2,
      under_delivery: 2,
      out_for_delivery: 2,
      delivered: 3,
      completed: 3,
    };
    return statusMap[orderStatus?.toLowerCase()] ?? 0;
  }, [orderStatus]);

  const courierName = useMemo(() => {
    return order?.courierName ?? order?.courier_name ?? null;
  }, [order]);

  const customerName = useMemo(() => {
    return order?.customerName ?? order?.customer_name ?? order?.customer?.name ?? "Guest";
  }, [order]);

  const customerPhone = useMemo(() => {
    return order?.customerPhone ?? order?.customer_phone ?? order?.phone ?? order?.customer?.phone ?? "";
  }, [order]);

  const customerAddress = useMemo(() => {
    const addr = order?.shippingAddress ?? order?.shipping_address ?? order?.address ?? "";
    if (typeof addr === 'object') {
      const parts = [addr.city, addr.area, addr.address].filter(Boolean);
      return parts.join(", ");
    }
    return addr;
  }, [order]);

  const customerNote = useMemo(() => {
    return order?.note ?? order?.notes ?? order?.customer_note ?? "";
  }, [order]);

  const paymentMethod = useMemo(() => {
    const method = order?.paymentMethod ?? order?.payment_method ?? "Cash on delivery";
    return method;
  }, [order]);

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
            </div>
          </div>
        ) : !orderId ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2 italic">
              Thank you!
            </h1>
            <p className="text-gray-600 mb-6">
              Your order was placed successfully.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-bold transition"
            >
              <FaShoppingCart />
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header - Thank you message */}
            <div className="text-center py-8 border-b border-gray-100">
              <h1 className="text-3xl md:text-4xl font-serif italic text-gray-700">
                Thank you for your order.
              </h1>
            </div>

            {/* Order Status Progress */}
            <div className="px-6 py-6 border-b border-gray-100">
              <div className="flex items-center justify-between max-w-3xl mx-auto">
                {ORDER_STATUSES.map((status, index) => {
                  const Icon = status.icon;
                  const isCompleted = index <= currentStatusIndex;
                  const isActive = index === currentStatusIndex;
                  const isLast = index === ORDER_STATUSES.length - 1;

                  return (
                    <React.Fragment key={status.key}>
                      <div className="flex flex-col items-center text-center flex-shrink-0">
                        <div
                          className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                            isCompleted
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          <Icon className={`text-lg md:text-xl ${isActive ? "animate-pulse" : ""}`} />
                        </div>
                        <span
                          className={`text-xs md:text-sm font-semibold ${
                            isCompleted ? "text-gray-800" : "text-gray-400"
                          }`}
                        >
                          {status.label}
                        </span>
                        <span className="text-[10px] md:text-xs text-gray-500 max-w-[80px] md:max-w-[100px]">
                          {status.key === "under_delivery" && courierName
                            ? `On ${courierName}`
                            : status.key === "under_delivery" && !courierName
                            ? "On Courier (null)"
                            : status.sublabel}
                        </span>
                      </div>
                      {!isLast && (
                        <div
                          className={`flex-1 h-1 mx-2 rounded ${
                            index < currentStatusIndex
                              ? "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Order ID, Date and Total */}
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-700 italic">
                  Order Id: {orderId}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(orderDate)} ({getRelativeTime(orderDate)})
                </p>
              </div>
              <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold text-lg shadow-md">
                Total {Math.round(totalAmount)}TK
              </div>
            </div>

            {/* Customer & Order Information */}
            <div className="px-6 py-6 border-b border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Customer Information */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Customer Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex">
                      <span className="text-gray-500 w-20">Name:</span>
                      <span className="font-semibold text-gray-800">{customerName}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-500 w-20">Phone:</span>
                      <span className="font-semibold text-gray-800">{customerPhone}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-500 w-20">Address:</span>
                      <span className="font-semibold text-gray-800">{customerAddress || "N/A"}</span>
                    </div>
                    {customerNote && (
                      <div className="flex">
                        <span className="text-gray-500 w-20">Note:</span>
                        <span className="font-semibold text-gray-800">{customerNote}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Information */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Order Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="text-gray-500 w-24">Payment:</span>
                      <span className="bg-orange-400 text-white px-4 py-1.5 rounded-full text-sm font-semibold">
                        {paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            {items.length > 0 && (
              <div className="px-6 py-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Order Items</h3>
                
                {/* Table Header */}
                <div className="bg-amber-50 rounded-t-lg px-4 py-3 grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                  <div className="col-span-6 md:col-span-7">Product</div>
                  <div className="col-span-3 md:col-span-3 text-center">Quantity</div>
                  <div className="col-span-3 md:col-span-2 text-right">Price</div>
                </div>

                {/* Table Body */}
                <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`px-4 py-4 grid grid-cols-12 gap-4 items-center ${
                        index !== items.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <div className="col-span-6 md:col-span-7 flex items-center gap-3">
                        <img
                          src={item.productImage || "/default-product.png"}
                          alt={item.productName || `Product #${item.productId}`}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                        <div>
                          <div className="font-semibold text-gray-800">
                            {item.productName || `Product #${item.productId}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            SKU: {item.productSku || ""}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3 md:col-span-3 text-center text-gray-700">
                        {item.quantity}
                      </div>
                      <div className="col-span-3 md:col-span-2 text-right font-semibold text-green-600">
                        ৳{Number(item.unitPrice || 0).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="mt-6 space-y-3 max-w-sm ml-auto">
                  <div className="flex justify-between text-gray-600 pb-2 border-b border-gray-100">
                    <span>Subtotal</span>
                    <span className="font-semibold text-green-600">৳{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 pb-2 border-b border-gray-100">
                    <span>Delivery charge</span>
                    <span className="font-semibold text-green-600">৳{deliveryCharge.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 pb-2 border-b border-gray-100">
                    <span>Discount</span>
                    <span className="font-semibold text-green-600">৳{discount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 font-bold text-lg pt-1">
                    <span>Total</span>
                    <span className="text-green-600">৳{totalAmount.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="px-6 py-6 border-b border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href={`/order-tracking?orderId=${orderId}`}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-center py-4 rounded-lg font-bold transition shadow-md"
                >
                  Track your order
                </Link>
                <Link
                  href="/contact"
                  className="bg-orange-500 hover:bg-orange-600 text-white text-center py-4 rounded-lg font-bold transition shadow-md"
                >
                  Question? Contact us
                </Link>
              </div>
            </div>

            {/* Special Offer */}
            {offer?.is_active && !offerAccepted && offer?.product_id && offer?.offer_price ? (
              <div className="px-6 py-6 border-b border-gray-100">
                <div className={`rounded-xl p-6 bg-gradient-to-r ${offer.background_gradient || "from-orange-50 via-white to-orange-50"}`}>
                  <div className="text-sm font-semibold text-orange-700 mb-2">
                    Special Offer Just For You
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {offer.title || "Unlock a special deal"}
                  </h2>
                  {offer.subtitle && (
                    <p className="text-gray-700 mt-2">{offer.subtitle}</p>
                  )}

                  <div className="mt-4 bg-white/80 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={offerProduct?.image || "/default-product.png"}
                        alt={offerProduct?.name_en || "Offer product"}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div>
                        <div className="font-bold text-gray-900">
                          {offerProduct?.name_en || `Product #${offer.product_id}`}
                        </div>
                        <div className="text-orange-600 font-bold">
                          Offer Price: ৳{Number(offer.offer_price).toFixed(0)}
                        </div>
                      </div>
                    </div>

                    <div className="sm:ml-auto">
                      <button
                        type="button"
                        disabled={acceptingOffer}
                        onClick={handleAcceptOffer}
                        className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-bold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {acceptingOffer
                          ? "Adding to your order..."
                          : offer.primary_button_text || "Claim Offer"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* View More / Recommended Products */}
            {recommendedProducts.length > 0 && (
              <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">View More</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRecPage((p) => Math.max(0, p - 1))}
                      disabled={recPage === 0}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <FaChevronLeft className="text-xs" />
                    </button>
                    <button
                      onClick={() =>
                        setRecPage((p) =>
                          Math.min(Math.floor((recommendedProducts.length - 1) / 4), p + 1)
                        )
                      }
                      disabled={(recPage + 1) * 4 >= recommendedProducts.length}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <FaChevronRight className="text-xs" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {recommendedProducts.slice(recPage * 4, recPage * 4 + 4).map((product) => (
                    <ElectroProductCard
                      key={product.id}
                      id={product.id}
                      nameEn={product.name_en}
                      nameBn={product.name_bn}
                      categoryName={
                        product.category_name ||
                        product.category?.name_en ||
                        product.category?.name
                      }
                      price={product.base_price}
                      originalPrice={product.mrp}
                      stock={product.stock_quantity}
                      image={product.image}
                      rating={5}
                      reviews={Math.floor(Math.random() * 200)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ElectroFooter />
    </div>
  );
}
