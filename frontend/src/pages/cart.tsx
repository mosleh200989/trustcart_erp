import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import ElectroProductCard from "@/components/ElectroProductCard";
import apiClient from "@/services/api";
import { trackViewCart, trackRemoveFromCart } from "@/utils/gtm";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import {
  FaTrash,
  FaMinus,
  FaPlus,
  FaShoppingCart,
  FaArrowLeft,
  FaExclamationTriangle,
  FaTag,
} from "react-icons/fa";

export default function CartPage() {
  const { items: cart, removeItem: removeCartItem, updateQuantity: updateCartQuantity, clearCart: clearAllCart } = useCart();
  const toast = useToast();
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [stockInfo, setStockInfo] = useState<Record<number, number>>({});
  const [couponCode, setCouponCode] = useState('');
  const [deliveryZone, setDeliveryZone] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');

  const subtotal = cart.reduce(
    (sum: number, item: any) => sum + item.price * (item.quantity || 1),
    0
  );

  useEffect(() => {
    // Track view cart event for GTM/Analytics
    if (cart.length > 0) {
      trackViewCart(
        cart.map((item: any) => ({
          id: item.id,
          name: item.name || item.name_en,
          price: item.price,
          quantity: item.quantity || 1,
        })),
        subtotal
      );
    }

    // Load suggested products
    loadSuggestedProducts();
  }, []);

  // Fetch stock info for cart items
  useEffect(() => {
    const fetchStock = async () => {
      const uniqueIds = [...new Set(cart.map((item: any) => item.id))];
      const stockMap: Record<number, number> = {};
      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const res = await apiClient.get(`/products/${id}`);
            stockMap[id] = res.data?.stock_quantity ?? Infinity;
          } catch {
            stockMap[id] = Infinity;
          }
        })
      );
      setStockInfo(stockMap);
    };
    if (cart.length > 0) fetchStock();
  }, [cart.length]);

  const loadSuggestedProducts = async () => {
    try {
      const response = await apiClient.get("/products");
      setSuggestedProducts((response.data || []).slice(0, 4));
    } catch (error) {
      console.error("Failed to load suggested products:", error);
    }
  };

  function clearCart() {
    clearAllCart();
  }

  function removeItem(index: number) {
    // Track remove from cart event for GTM/Analytics
    const removedItem = cart[index];
    if (removedItem) {
      trackRemoveFromCart({
        id: removedItem.id,
        name: removedItem.name || removedItem.name_en || 'Product',
        price: removedItem.price,
        quantity: removedItem.quantity || 1,
      });
    }
    
    removeCartItem(index);
  }

  function updateQuantity(index: number, newQuantity: number) {
    if (newQuantity < 1) return;
    const item = cart[index];
    const stock = item ? stockInfo[item.id] : Infinity;
    if (stock !== undefined && stock !== Infinity && newQuantity > stock) {
      toast.warning(`Only ${stock} items available in stock`);
      updateCartQuantity(index, stock);
      return;
    }
    updateCartQuantity(index, newQuantity);
  }

  const deliveryCharge = deliveryZone === 'inside_dhaka' ? 60 : 110;
  const total = subtotal + deliveryCharge;

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      {/* Breadcrumb */}
      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600 max-w-7xl mx-auto px-4">
            <Link href="/" className="hover:text-orange-500">Home</Link> /{" "}
            <span className="text-gray-900 font-semibold">Shopping Cart</span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
            <FaShoppingCart className="text-orange-500" />
            Your Cart
          </h2>

          {cart.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-8xl mb-6">🛒</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-600 mb-6">No products added yet</p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-bold transition"
              >
                <FaShoppingCart />
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h5 className="text-xl font-bold text-gray-800 mb-6">
                    Cart Items ({cart.length} products)
                  </h5>

                  <div className="space-y-4">
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 rounded-lg"
                      >
                        {/* Mobile layout: stacked */}
                        <div className="flex items-start gap-3 sm:hidden">
                          <div className="w-16 h-16 relative flex-shrink-0 rounded overflow-hidden">
                            <Image
                              src={item.image || "/default-product.png"}
                              alt={item.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h6 className="font-bold text-gray-800 text-sm line-clamp-2">
                                {item.name || item.nameEn}
                              </h6>
                              <button
                                className="text-red-500 hover:text-red-600 p-1 flex-shrink-0"
                                onClick={() => removeItem(index)}
                              >
                                <FaTrash size={14} />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              SKU: {item.sku}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <button
                                  className="w-7 h-7 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() =>
                                    updateQuantity(index, (item.quantity || 1) - 1)
                                  }
                                  disabled={(item.quantity || 1) <= 1}
                                >
                                  <FaMinus size={10} />
                                </button>
                                <span className="w-8 text-center font-bold text-sm">
                                  {item.quantity || 1}
                                </span>
                                <button
                                  className="w-7 h-7 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() =>
                                    updateQuantity(index, (item.quantity || 1) + 1)
                                  }
                                  disabled={stockInfo[item.id] !== undefined && stockInfo[item.id] !== Infinity && (item.quantity || 1) >= stockInfo[item.id]}
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
                            {stockInfo[item.id] !== undefined && stockInfo[item.id] !== Infinity && (item.quantity || 1) >= stockInfo[item.id] && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                                <FaExclamationTriangle size={10} />
                                <span>Only {stockInfo[item.id]} available</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Desktop layout: single row */}
                        <div className="hidden sm:flex items-center gap-4">
                          <div className="w-20 h-20 relative flex-shrink-0 rounded overflow-hidden">
                            <Image
                              src={item.image || "/default-product.png"}
                              alt={item.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h6 className="font-bold text-gray-800">
                              {item.name || item.nameEn}
                            </h6>
                            <p className="text-sm text-gray-500">
                              SKU: {item.sku}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() =>
                                updateQuantity(index, (item.quantity || 1) - 1)
                              }
                              disabled={(item.quantity || 1) <= 1}
                            >
                              <FaMinus size={12} />
                            </button>
                            <span className="w-12 text-center font-bold">
                              {item.quantity || 1}
                            </span>
                            <button
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() =>
                                updateQuantity(index, (item.quantity || 1) + 1)
                              }
                              disabled={stockInfo[item.id] !== undefined && stockInfo[item.id] !== Infinity && (item.quantity || 1) >= stockInfo[item.id]}
                            >
                              <FaPlus size={12} />
                            </button>
                            {stockInfo[item.id] !== undefined && stockInfo[item.id] !== Infinity && (item.quantity || 1) >= stockInfo[item.id] && (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <FaExclamationTriangle size={10} />
                                Max
                              </span>
                            )}
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
                    className="mt-6 flex items-center gap-2 text-red-500 hover:text-red-600 font-semibold"
                    onClick={clearCart}
                  >
                    <FaTrash />
                    Clear Cart
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                  <h5 className="text-xl font-bold text-gray-800 mb-6">
                    Order Summary
                  </h5>

                  <div className="space-y-3 mb-4">
                    {/* Line items summary */}
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                      {cart.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600 truncate mr-2">
                            {item.name || item.nameEn} × {item.quantity || 1}
                          </span>
                          <span className="font-semibold whitespace-nowrap">
                            ৳{(item.price * (item.quantity || 1)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-semibold">
                          ৳{subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Delivery Zone Selector */}
                    <div className="pt-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Delivery Zone
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label
                          className={`flex items-center gap-2 p-2.5 border-2 rounded-lg cursor-pointer transition-all text-sm ${
                            deliveryZone === 'inside_dhaka'
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-300 hover:border-orange-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="cartDeliveryZone"
                            value="inside_dhaka"
                            checked={deliveryZone === 'inside_dhaka'}
                            onChange={() => setDeliveryZone('inside_dhaka')}
                            className="text-orange-500"
                          />
                          <div>
                            <span className="font-semibold">Inside Dhaka</span>
                            <span className="block text-xs text-gray-500">৳60</span>
                          </div>
                        </label>
                        <label
                          className={`flex items-center gap-2 p-2.5 border-2 rounded-lg cursor-pointer transition-all text-sm ${
                            deliveryZone === 'outside_dhaka'
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-300 hover:border-orange-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="cartDeliveryZone"
                            value="outside_dhaka"
                            checked={deliveryZone === 'outside_dhaka'}
                            onChange={() => setDeliveryZone('outside_dhaka')}
                            className="text-orange-500"
                          />
                          <div>
                            <span className="font-semibold">Outside Dhaka</span>
                            <span className="block text-xs text-gray-500">৳110</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-between pt-1">
                      <span className="text-gray-600">Delivery Charge</span>
                      <span className="font-semibold">
                        ৳{deliveryCharge}
                      </span>
                    </div>
                  </div>

                  {/* Coupon Code */}
                  <div className="border-t pt-4 mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FaTag className="inline mr-1 text-orange-500" size={12} />
                      Coupon / Offer Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                        placeholder="Enter code"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (couponCode.trim()) {
                            toast.info('Coupon will be applied at checkout');
                          }
                        }}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition"
                      >
                        Apply
                      </button>
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

                  <Link
                    href={`/checkout${couponCode.trim() ? `?coupon=${encodeURIComponent(couponCode.trim())}` : ''}`}
                    className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-3 rounded-lg font-bold mb-3 transition"
                  >
                    Proceed to Checkout
                  </Link>

                  <Link
                    href="/products"
                    className="flex items-center justify-center gap-2 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition"
                  >
                    <FaArrowLeft />
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Products */}
          {suggestedProducts.length > 0 && (
            <div className="mt-12 pt-8 border-t">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                You might also like
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {suggestedProducts.map((product) => {
                  const basePrice = Number(product.base_price || product.mrp || product.price || 0);
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
                      nameEn={product.name_en}
                      nameBn={product.name_bn}
                      categoryName={
                        product.category_name ||
                        product.category?.name_en ||
                        product.category?.name
                      }
                      price={salePrice}
                      originalPrice={basePrice}
                      stock={product.stock_quantity}
                      image={product.image_url || product.image}
                      rating={5}
                      discount={discountPercent > 0 ? discountPercent : undefined}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <ElectroFooter />
    </div>
  );
}
