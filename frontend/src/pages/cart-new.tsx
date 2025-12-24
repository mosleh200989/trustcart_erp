import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '../components/ProductCard';
import { products } from '../services/api';

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

    // Load suggested products for cart
    products.getSuggested(8).then(setSuggestedProducts);
  }, []);

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
    <div className="container my-5">
      <h2 className="mb-4">
        <i className="bi bi-cart3 me-2"></i>
        আপনার কার্ট
      </h2>
      
      {cart.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-cart-x" style={{ fontSize: '5rem', color: '#ccc' }}></i>
          <h3 className="mt-3">আপনার কার্ট খালি</h3>
          <p className="text-muted">এখনও কোন পণ্য যোগ করা হয়নি</p>
          <Link href="/products" className="btn btn-primary mt-3">
            <i className="bi bi-shop me-2"></i>
            কেনাকাটা শুরু করুন
          </Link>
        </div>
      ) : (
        <div className="row">
          {/* Cart Items */}
          <div className="col-lg-8">
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title mb-4">কার্টের পণ্যসমূহ ({cart.length} টি পণ্য)</h5>
                
                {cart.map((item, index) => (
                  <div key={index} className="row mb-3 pb-3 border-bottom">
                    <div className="col-md-2">
                      <img 
                        src={item.image || 'https://via.placeholder.com/100'} 
                        alt={item.name}
                        className="img-fluid rounded"
                      />
                    </div>
                    <div className="col-md-4">
                      <h6>{item.name || item.nameEn}</h6>
                      <p className="text-muted small mb-0">SKU: {item.sku}</p>
                    </div>
                    <div className="col-md-2">
                      <label className="small text-muted d-block">পরিমাণ</label>
                      <div className="input-group input-group-sm" style={{ maxWidth: '120px' }}>
                        <button 
                          className="btn btn-outline-secondary" 
                          onClick={() => updateQuantity(index, (item.quantity || 1) - 1)}
                        >
                          <i className="bi bi-dash"></i>
                        </button>
                        <input 
                          type="text" 
                          className="form-control text-center" 
                          value={item.quantity || 1}
                          readOnly
                        />
                        <button 
                          className="btn btn-outline-secondary"
                          onClick={() => updateQuantity(index, (item.quantity || 1) + 1)}
                        >
                          <i className="bi bi-plus"></i>
                        </button>
                      </div>
                    </div>
                    <div className="col-md-2 text-center">
                      <label className="small text-muted d-block">মূল্য</label>
                      <strong className="text-success">৳{item.price}</strong>
                    </div>
                    <div className="col-md-2 text-end">
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeItem(index)}
                      >
                        <i className="bi bi-trash"></i> সরান
                      </button>
                    </div>
                  </div>
                ))}
                
                <button className="btn btn-outline-secondary mt-3" onClick={clearCart}>
                  <i className="bi bi-trash me-2"></i>
                  সব সরিয়ে ফেলুন
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="col-lg-4">
            <div className="card sticky-top" style={{ top: '80px' }}>
              <div className="card-body">
                <h5 className="card-title mb-4">অর্ডার সারাংশ</h5>
                
                <div className="d-flex justify-content-between mb-2">
                  <span>সাবটোটাল</span>
                  <span>৳{subtotal.toFixed(2)}</span>
                </div>
                
                <div className="d-flex justify-content-between mb-2">
                  <span>ডেলিভারি চার্জ</span>
                  <span className={deliveryCharge === 0 ? 'text-success' : ''}>
                    {deliveryCharge === 0 ? 'ফ্রি' : `৳${deliveryCharge}`}
                  </span>
                </div>
                
                {subtotal < 500 && (
                  <div className="alert alert-info small py-2 mt-2">
                    <i className="bi bi-info-circle me-1"></i>
                    আরও ৳{(500 - subtotal).toFixed(2)} কিনলে ফ্রি ডেলিভারি!
                  </div>
                )}
                
                <hr />
                
                <div className="d-flex justify-content-between mb-4">
                  <strong>মোট</strong>
                  <strong className="text-success">৳{total.toFixed(2)}</strong>
                </div>
                
                <Link href="/checkout" className="btn btn-success w-100 mb-2">
                  <i className="bi bi-credit-card me-2"></i>
                  চেকআউট
                </Link>
                
                <Link href="/products" className="btn btn-outline-primary w-100">
                  <i className="bi bi-arrow-left me-2"></i>
                  কেনাকাটা চালিয়ে যান
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Products Section */}
      {suggestedProducts.length > 0 && (
        <section className="mt-5 pt-4" style={{ borderTop: '2px solid #e0e0e0' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 className="mb-1">
                <i className="bi bi-plus-circle text-success me-2"></i>
                কার্টে আরও যা যুক্ত করতে পারেন
              </h3>
              <p className="text-muted mb-0">You might also like - এই পণ্যগুলোও দেখুন</p>
            </div>
          </div>
          
          <div className="row g-3">
            {suggestedProducts.map((product) => (
              <div key={product.id} className="col-6 col-md-3">
                <ProductCard {...product} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
