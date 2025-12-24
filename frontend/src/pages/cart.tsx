import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import ElectroProductCard from '@/components/ElectroProductCard';
import apiClient from '@/services/api';
import { FaTrash, FaMinus, FaPlus, FaShoppingCart, FaArrowLeft } from 'react-icons/fa';

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('cart');
    const cartData = stored ? JSON.parse(stored) : [];
    setCart(cartData);
    
    // Calculate subtotal
    const total = cartData.reduce((sum: number, item: any) => 
      sum + (item.price * (item.quantity || 1)), 0
    );
    setSubtotal(total);

    // Load suggested products
    loadSuggestedProducts();
  }, []);

  const loadSuggestedProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setSuggestedProducts((response.data || []).slice(0, 4));
    } catch (error) {
      console.error('Failed to load suggested products:', error);
    }
  };

  function clearCart() {
    localStorage.removeItem('cart');
    setCart([]);
    setSubtotal(0);
  }

  function removeItem(index: number) {
    const newCart = cart.filter((_, i) => i !== index);
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
    
    const total = newCart.reduce((sum: number, item: any) => 
      sum + (item.price * (item.quantity || 1)), 0
    );
    setSubtotal(total);
  }

  function updateQuantity(index: number, newQuantity: number) {
    if (newQuantity < 1) return;
    
    const newCart = [...cart];
    newCart[index] = { ...newCart[index], quantity: newQuantity };
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
    
    const total = newCart.reduce((sum: number, item: any) => 
      sum + (item.price * (item.quantity || 1)), 0
    );
    setSubtotal(total);
  }

  const deliveryCharge = subtotal >= 500 ? 0 : 60;
  const total = subtotal + deliveryCharge;

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />
      
      {/* Breadcrumb */}
      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            Home / <span className="text-gray-900 font-semibold">Shopping Cart</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
          <FaShoppingCart className="text-orange-500" />
          Your Cart
        </h2>
        
        {cart.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-8xl mb-6">🛒</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h3>
            <p className="text-gray-600 mb-6">No products added yet</p>
            <Link href="/products" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-bold transition">
              <FaShoppingCart />
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h5 className="text-xl font-bold text-gray-800 mb-6">Cart Items ({cart.length} products)</h5>
                
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      <img 
                        src={item.image || '/default-product.png'} 
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h6 className="font-bold text-gray-800">{item.name || item.nameEn}</h6>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded"
                          onClick={() => updateQuantity(index, (item.quantity || 1) - 1)}
                        >
                          <FaMinus size={12} />
                        </button>
                        <span className="w-12 text-center font-bold">{item.quantity || 1}</span>
                        <button 
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded"
                          onClick={() => updateQuantity(index, (item.quantity || 1) + 1)}
                        >
                          <FaPlus size={12} />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Price</div>
                        <div className="font-bold text-orange-500">৳{item.price}</div>
                      </div>
                      <button 
                        className="text-red-500 hover:text-red-600 p-2"
                        onClick={() => removeItem(index)}
                      >
                        <FaTrash />
                      </button>
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
                <h5 className="text-xl font-bold text-gray-800 mb-6">Order Summary</h5>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">৳{subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Charge</span>
                    <span className={`font-semibold ${deliveryCharge === 0 ? 'text-green-500' : ''}`}>
                      {deliveryCharge === 0 ? 'FREE' : `৳${deliveryCharge}`}
                    </span>
                  </div>
                </div>
                
                {subtotal < 500 && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded mb-4">
                    Add ৳{(500 - subtotal).toFixed(2)} more for free delivery!
                  </div>
                )}
                
                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-lg">
                    <strong>Total</strong>
                    <strong className="text-orange-500">৳{total.toFixed(2)}</strong>
                  </div>
                </div>
                
                <Link href="/checkout" className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-3 rounded-lg font-bold mb-3 transition">
                  Proceed to Checkout
                </Link>
                
                <Link href="/products" className="flex items-center justify-center gap-2 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition">
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
            <h3 className="text-2xl font-bold text-gray-800 mb-6">You might also like</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {suggestedProducts.map((product) => (
                <ElectroProductCard
                  key={product.id}
                  id={product.id}
                  nameEn={product.name_en}
                  nameBn={product.name_bn}
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

      <ElectroFooter />
    </div>
  );
}
