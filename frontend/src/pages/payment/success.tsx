import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import { FaCheckCircle, FaShoppingCart, FaReceipt } from "react-icons/fa";
import { getPaymentStatus, PaymentStatusResponse } from "@/services/payment";

export default function PaymentSuccess() {
  const router = useRouter();
  const { orderId, transactionId, status } = router.query;
  const [paymentInfo, setPaymentInfo] = useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear cart on successful payment — order is confirmed
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cartUpdated"));
  }, []);

  useEffect(() => {
    if (!orderId) return;

    const fetchStatus = async () => {
      try {
        const data = await getPaymentStatus(Number(orderId));
        setPaymentInfo(data);
      } catch (err) {
        console.error("Failed to fetch payment status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <FaCheckCircle className="text-green-500 text-5xl" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for your payment. Your order has been confirmed.
          </p>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaReceipt className="text-orange-500" />
              Payment Details
            </h3>

            <div className="space-y-3">
              {orderId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Order ID</span>
                  <span className="font-semibold">#{orderId}</span>
                </div>
              )}
              {transactionId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transaction ID</span>
                  <span className="font-semibold font-mono text-xs">{transactionId}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className="font-semibold text-green-600">
                  {status === "paid" ? "Paid" : "Payment Received"}
                </span>
              </div>

              {!loading && paymentInfo && (
                <>
                  {paymentInfo.paidAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Amount Paid</span>
                      <span className="font-semibold text-green-600">
                        ৳{paymentInfo.paidAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {paymentInfo.transactions?.[0]?.cardType && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Payment Method</span>
                      <span className="font-semibold">
                        {paymentInfo.transactions[0].cardType}
                        {paymentInfo.transactions[0].cardBrand ? ` (${paymentInfo.transactions[0].cardBrand})` : ""}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={orderId ? `/thank-you?orderId=${orderId}` : "/"}
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              <FaReceipt />
              View Order Details
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold transition"
            >
              <FaShoppingCart />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      <ElectroFooter />
    </div>
  );
}
