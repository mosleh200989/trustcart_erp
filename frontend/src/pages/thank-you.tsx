import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import ElectroProductCard from "@/components/ElectroProductCard";
import apiClient from "@/services/api";
import { FaCheckCircle, FaShoppingCart } from "react-icons/fa";

type OrderItem = {
  id: number;
  productId: number;
  productName?: string;
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

export default function ThankYouPage() {
  const router = useRouter();
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

  const loadOrder = async (id: string) => {
    const [orderRes, itemsRes] = await Promise.all([
      apiClient.get(`/sales/${id}`),
      apiClient.get(`/sales/${id}/items`),
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
      const res = await apiClient.get("/products/featured/suggested?limit=4");
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
      alert(
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

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600 max-w-7xl mx-auto">
            Home / <span className="text-gray-900 font-semibold">Thank You</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="container mx-auto px-4 py-12">
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-8">Loading...</div>
          ) : !orderId ? (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
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
            <>
              <div className="bg-white rounded-lg shadow-md p-8 mb-8">
                <div className="flex items-start gap-4">
                  <FaCheckCircle className="text-green-500 text-4xl mt-1" />
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-800">
                      Thank you for your order!
                    </h1>
                    <p className="text-gray-600 mt-2">
                      We’re preparing your order. We’ll contact you if needed.
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Order ID:</span> #{orderId}
                      </div>
                      <div className="text-lg font-bold text-orange-500">
                        Total: ৳{totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                      Order Items
                    </h2>
                    <div className="space-y-2">
                      {items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="text-gray-700">
                            {it.productName || `Product #${it.productId}`} × {it.quantity}
                          </div>
                          <div className="font-semibold text-gray-900">
                            ৳{Number(it.lineTotal || 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition"
                  >
                    <FaShoppingCart />
                    Continue Shopping
                  </Link>
                </div>
              </div>

              {/* Special Offer */}
              {offer?.is_active && !offerAccepted && offer?.product_id && offer?.offer_price ? (
                <div className="rounded-lg shadow-md mb-10 overflow-hidden">
                  <div className={`p-8 bg-gradient-to-r ${offer.background_gradient || "from-orange-50 via-white to-orange-50"}`}>
                    <div className="max-w-3xl">
                      <div className="text-sm font-semibold text-orange-700 mb-2">
                        Special Offer Just For You
                      </div>
                      <h2 className="text-3xl font-bold text-gray-900">
                        {offer.title || "Unlock a special deal"}
                      </h2>
                      {offer.subtitle && (
                        <p className="text-gray-700 mt-2">{offer.subtitle}</p>
                      )}
                      {offer.description && (
                        <p className="text-gray-700 mt-4">{offer.description}</p>
                      )}

                      <div className="mt-6 bg-white/80 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
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
                              Offer Price: ৳{Number(offer.offer_price).toFixed(2)}
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

                      <p className="text-xs text-gray-600 mt-3">
                        Accepting this offer will be added to your existing invoice.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Recommended Products */}
              {recommendedProducts.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    Recommended For You
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {recommendedProducts.map((product) => (
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
            </>
          )}
        </div>
      </div>

      <ElectroFooter />
    </div>
  );
}
