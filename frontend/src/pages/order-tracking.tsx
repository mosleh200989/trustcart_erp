import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import apiClient from "@/services/api";
import { 
  FaClock, 
  FaTruck, 
  FaBoxOpen,
  FaHome,
  FaPhone,
  FaMapMarkerAlt,
  FaClipboardList
} from "react-icons/fa";
import { HiOutlineClipboardCheck } from "react-icons/hi";

// Order status steps
const ORDER_STATUSES = [
  { key: "ordered", label: "Ordered", sublabel: "Order placed", icon: HiOutlineClipboardCheck },
  { key: "processing", label: "Processing", sublabel: "Preparing for delivery", icon: FaClock },
  { key: "under_delivery", label: "Under Delivery", sublabel: "On Courier", icon: FaTruck },
  { key: "delivered", label: "Delivered", sublabel: "Delivered to customer", icon: FaBoxOpen },
];

// Helper to format date
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function OrderTrackingPage() {
  const router = useRouter();
  const orderId = useMemo(() => {
    const raw = router.query.orderId;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? String(value) : "";
  }, [router.query.orderId]);

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    const loadOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await apiClient.get(`/sales/public/${orderId}`);
        setOrder(res.data);
      } catch (e) {
        console.error("Failed to load order:", e);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [router.isReady, orderId]);

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

  const orderDate = useMemo(() => {
    const raw = order?.createdAt ?? order?.created_at ?? order?.orderDate ?? order?.order_date;
    return raw ? new Date(raw) : null;
  }, [order]);

  const totalAmount = useMemo(() => {
    const raw = order?.totalAmount ?? order?.total_amount ?? 0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      router.push(`/order-tracking?orderId=${searchId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Track Your Order</h1>
          <p className="text-gray-600">Enter your order ID to check the delivery status</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Order ID (e.g., 24061)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-bold transition"
            >
              Track
            </button>
          </div>
        </form>

        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
            </div>
          </div>
        ) : !orderId ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <FaClipboardList className="text-gray-400 text-6xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Enter an Order ID
            </h2>
            <p className="text-gray-500">
              Enter your order ID above to track your delivery status
            </p>
          </div>
        ) : !order ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <FaClipboardList className="text-red-400 text-6xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Order Not Found
            </h2>
            <p className="text-gray-500 mb-4">
              We couldn't find an order with ID: <strong>{orderId}</strong>
            </p>
            <p className="text-sm text-gray-400">
              Please check the order ID and try again
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Order Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Order #{orderId}
                  </h2>
                  {orderDate && (
                    <p className="text-sm text-gray-500 mt-1">
                      Placed on {formatDate(orderDate)}
                    </p>
                  )}
                </div>
                <div className="bg-green-500 text-white px-6 py-2 rounded-full font-bold text-lg">
                  ৳{totalAmount.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Order Status Progress */}
            <div className="px-6 py-8 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">
                Delivery Status
              </h3>
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {ORDER_STATUSES.map((status, index) => {
                  const Icon = status.icon;
                  const isCompleted = index <= currentStatusIndex;
                  const isActive = index === currentStatusIndex;
                  const isLast = index === ORDER_STATUSES.length - 1;

                  return (
                    <React.Fragment key={status.key}>
                      <div className="flex flex-col items-center text-center flex-shrink-0">
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 transition-all ${
                            isCompleted
                              ? "bg-green-500 text-white shadow-lg"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          <Icon className={`text-2xl ${isActive ? "animate-pulse" : ""}`} />
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            isCompleted ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {status.label}
                        </span>
                        <span className="text-xs text-gray-500 max-w-[90px]">
                          {status.key === "under_delivery" && courierName
                            ? `Via ${courierName}`
                            : status.sublabel}
                        </span>
                      </div>
                      {!isLast && (
                        <div
                          className={`flex-1 h-1.5 mx-2 rounded-full ${
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

            {/* Delivery Information */}
            <div className="px-6 py-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Delivery Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaHome className="text-orange-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Recipient</div>
                    <div className="font-semibold text-gray-800">{customerName}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaPhone className="text-orange-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <div className="font-semibold text-gray-800">{customerPhone || "N/A"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:col-span-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaMapMarkerAlt className="text-orange-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Delivery Address</div>
                    <div className="font-semibold text-gray-800">{customerAddress || "N/A"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/"
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-center py-3 rounded-lg font-semibold transition"
                >
                  Back to Home
                </Link>
                <Link
                  href="/contact"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-center py-3 rounded-lg font-bold transition"
                >
                  Need Help? Contact Us
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <ElectroFooter />
    </div>
  );
}
