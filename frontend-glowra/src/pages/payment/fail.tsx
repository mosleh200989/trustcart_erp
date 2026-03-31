import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import { FaTimesCircle, FaRedo, FaPhone } from "react-icons/fa";

export default function PaymentFail() {
  const router = useRouter();
  const { orderId, transactionId, error } = router.query;

  const handleRetryPayment = () => {
    if (orderId) {
      router.push(`/checkout?retryOrderId=${orderId}`);
    } else {
      router.push("/checkout");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Fail Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <FaTimesCircle className="text-red-500 text-5xl" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Payment Failed
          </h1>
          <p className="text-gray-600 mb-6">
            Unfortunately, your payment could not be processed. Your order has been saved and you can try again.
          </p>

          {/* Details */}
          <div className="bg-red-50 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-bold text-gray-800 mb-3">What happened?</h3>
            <p className="text-sm text-gray-600 mb-3">
              {error === "validation_failed"
                ? "The payment could not be verified. This may happen if the payment was interrupted or if there was a communication issue."
                : "Your payment was not completed. This can happen due to insufficient funds, incorrect card details, or a network issue."}
            </p>
            {orderId && (
              <div className="flex justify-between text-sm border-t border-red-200 pt-3 mt-3">
                <span className="text-gray-500">Order ID</span>
                <span className="font-semibold">#{orderId}</span>
              </div>
            )}
            {transactionId && (
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-semibold font-mono text-xs">{transactionId}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetryPayment}
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              <FaRedo />
              Try Again
            </button>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold transition"
            >
              <FaPhone />
              Contact Support
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            If you continue to face issues, please contact us at{" "}
            <a href="tel:+8801700000000" className="text-orange-500 hover:underline font-semibold">
              01700-000000
            </a>{" "}
            or email{" "}
            <a href="mailto:support@trustcart.com.bd" className="text-orange-500 hover:underline font-semibold">
              support@trustcart.com.bd
            </a>
          </p>
        </div>
      </div>

      <ElectroFooter />
    </div>
  );
}
