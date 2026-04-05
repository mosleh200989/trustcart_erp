import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import { FaExclamationTriangle, FaCreditCard, FaShoppingCart } from "react-icons/fa";

export default function PaymentCancel() {
  const router = useRouter();
  const { orderId, transactionId } = router.query;

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Cancel Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
              <FaExclamationTriangle className="text-yellow-500 text-5xl" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-gray-600 mb-6">
            You cancelled the payment. Don&apos;t worry — your order has been saved and you can complete the payment whenever you&apos;re ready.
          </p>

          {/* Details */}
          <div className="bg-yellow-50 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-bold text-gray-800 mb-3">Your order is still active</h3>
            <p className="text-sm text-gray-600 mb-3">
              No money has been charged. You can retry the payment or switch to Cash on Delivery by contacting our support team.
            </p>
            {orderId && (
              <div className="flex justify-between text-sm border-t border-yellow-200 pt-3 mt-3">
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
            <Link
              href="/checkout"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              <FaCreditCard />
              Go to Checkout
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
