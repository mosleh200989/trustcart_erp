import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import DealTimer from '@/components/DealTimer';
import AddToCartPopup from '@/components/AddToCartPopup';
import { 
  products as productsAPI, 
  categories as categoriesAPI,
  combos,
  reviews,
  subscribers,
  productViews
} from '@/services/api';

export default function Home() {
  // State for all sections
  const [dealOfDayProducts, setDealOfDayProducts] = useState<any[]>([]);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [combosDeals, setCombosDeals] = useState<any[]>([]);
  const [customerReviews, setCustomerReviews] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [subscribeMessage, setSubscribeMessage] = useState('');
  
  // Add to cart popup
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [cartProduct, setCartProduct] = useState<any>(null);

  useEffect(() => {
    loadHomepageData();
  }, []);

  const loadHomepageData = async () => {
    try {
      // Load all homepage sections
      const [
        dealData,
        popularData,
        newData,
        featuredData,
        combosData,
        reviewsData
      ] = await Promise.all([
        productsAPI.getDealOfDay(),
        productsAPI.getPopular(),
        productsAPI.getNewArrivals(),
        productsAPI.getFeatured(),
        combos.list(),
        reviews.getFeatured()
      ]);

      setDealOfDayProducts(dealData);
      setPopularProducts(popularData);
      setNewArrivals(newData);
      setFeaturedProducts(featuredData);
      setCombosDeals(combosData);
      setCustomerReviews(reviewsData);

      // Load recently viewed from session storage
      const sessionId = getSessionId();
      const recentData = await productViews.getRecentlyViewed(undefined, sessionId);
      setRecentlyViewed(recentData);
    } catch (error) {
      console.error('Error loading homepage data:', error);
    }
  };

  const getSessionId = () => {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  const handleEmailSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setSubscribeMessage('অনুগ্রহ করে একটি ইমেইল প্রবেশ করুন');
      return;
    }
    
    try {
      const result = await subscribers.subscribe(email);
      if (result.success) {
        setSubscribeMessage('সফলভাবে সাবস্ক্রাইব হয়েছে! ধন্যবাদ।');
        setEmail('');
      } else {
        setSubscribeMessage(result.message || 'সাবস্ক্রাইব হয়নি');
      }
    } catch (error) {
      setSubscribeMessage('একটি ত্রুটি ঘটেছে। আবার চেষ্টা করুন।');
    }
    setTimeout(() => setSubscribeMessage(''), 5000);
  };

  const handleAddToCart = (product: any) => {
    // Add to cart logic here
    setCartProduct(product);
    setShowCartPopup(true);
  };

  return (
    <div className="homepage">
      {/* Hero Banner */}
      <section className="hero-banner bg-light py-5 mb-4">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h1 className="display-4 fw-bold text-success mb-3">
                TrustCart
              </h1>
              <h2 className="h3 mb-3">
                বিশ্বস্ত পণ্য, সাশ্রয়ী মূল্যে
              </h2>
              <p className="lead mb-4">
                খাঁটি মধু, অর্গানিক পণ্য এবং স্বাস্থ্যকর খাবার - এক জায়গায়
              </p>
              <Link href="/products" className="btn btn-success btn-lg">
                <i className="bi bi-shop me-2"></i>
                এখনই কিনুন
              </Link>
            </div>
            <div className="col-md-6">
              <img 
                src="/images/hero-banner.jpg" 
                alt="TrustCart"
                className="img-fluid rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400?text=TrustCart';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Deal of the Day / আজকের জন্য অফার */}
      {dealOfDayProducts.length > 0 && (
        <section className="deal-of-day mb-5">
          <div className="container">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="h3 mb-1">
                  <i className="bi bi-lightning-charge-fill text-warning me-2"></i>
                  আজকের বিশেষ অফার
                </h2>
                <p className="text-muted mb-0">Deal of the Day - সীমিত সময়ের জন্য</p>
              </div>
              <DealTimer endTime={new Date(Date.now() + 24 * 60 * 60 * 1000)} />
            </div>
            <div className="row g-3">
              {dealOfDayProducts.slice(0, 4).map((product) => (
                <div key={product.id} className="col-6 col-md-3">
                  <div className="position-relative">
                    <span className="badge bg-danger position-absolute top-0 start-0 m-2" style={{ zIndex: 1 }}>
                      30% OFF
                    </span>
                    <ProductCard 
                      {...product} 
                      onAddToCart={() => handleAddToCart(product)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Products / জনপ্রিয় প্রোডাক্ট */}
      {popularProducts.length > 0 && (
        <section className="popular-products mb-5">
          <div className="container">
            <div className="text-center mb-4">
              <h2 className="h3">
                <i className="bi bi-star-fill text-warning me-2"></i>
                জনপ্রিয় পণ্য
              </h2>
              <p className="text-muted">Popular Products - সবচেয়ে বেশি বিক্রিত</p>
            </div>
            <div className="row g-3">
              {popularProducts.map((product) => (
                <div key={product.id} className="col-6 col-md-3">
                  <ProductCard 
                    {...product} 
                    onAddToCart={() => handleAddToCart(product)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Combo Deals */}
      {combosDeals.length > 0 && (
        <section className="combo-deals mb-5 bg-light py-5">
          <div className="container">
            <div className="text-center mb-4">
              <h2 className="h3">
                <i className="bi bi-box-seam text-primary me-2"></i>
                কম্বো অফার
              </h2>
              <p className="text-muted">Combo Deals - একসাথে কিনুন, বাঁচান বেশি</p>
            </div>
            <div className="row g-4">
              {combosDeals.map((combo) => (
                <div key={combo.id} className="col-md-6 col-lg-3">
                  <div className="card h-100 shadow-sm">
                    <div className="position-relative">
                      <img 
                        src={combo.image_url || 'https://via.placeholder.com/300x200?text=Combo+Deal'} 
                        alt={combo.name}
                        className="card-img-top"
                        style={{ height: '200px', objectFit: 'cover' }}
                      />
                      <span className="badge bg-success position-absolute top-0 end-0 m-2">
                        {combo.discount_percentage}% ছাড়
                      </span>
                    </div>
                    <div className="card-body">
                      <h5 className="card-title">{combo.name}</h5>
                      <p className="card-text small text-muted">{combo.description}</p>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="h5 text-success mb-0">৳{combo.combo_price}</span>
                        <span className="text-muted small">{combo.products?.length || 0} পণ্য</span>
                      </div>
                      <Link 
                        href={`/combo/${combo.slug}`} 
                        className="btn btn-outline-success w-100"
                      >
                        বিস্তারিত দেখুন
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals / নতুন প্রোডাক্ট */}
      {newArrivals.length > 0 && (
        <section className="new-arrivals mb-5">
          <div className="container">
            <div className="text-center mb-4">
              <h2 className="h3">
                <i className="bi bi-stars text-info me-2"></i>
                নতুন পণ্য
              </h2>
              <p className="text-muted">New Arrivals - সদ্য আগত পণ্য</p>
            </div>
            <div className="row g-3">
              {newArrivals.map((product) => (
                <div key={product.id} className="col-6 col-md-3">
                  <div className="position-relative">
                    <span className="badge bg-info position-absolute top-0 start-0 m-2" style={{ zIndex: 1 }}>
                      NEW
                    </span>
                    <ProductCard 
                      {...product} 
                      onAddToCart={() => handleAddToCart(product)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="featured-products mb-5">
          <div className="container">
            <div className="text-center mb-4">
              <h2 className="h3">
                <i className="bi bi-gem text-purple me-2"></i>
                বিশেষ নির্বাচিত
              </h2>
              <p className="text-muted">Featured Products - আমাদের পছন্দের পণ্য</p>
            </div>
            <div className="row g-3">
              {featuredProducts.map((product) => (
                <div key={product.id} className="col-6 col-md-3">
                  <ProductCard 
                    {...product} 
                    onAddToCart={() => handleAddToCart(product)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently Viewed Products */}
      {recentlyViewed.length > 0 && (
        <section className="recently-viewed mb-5 bg-light py-5">
          <div className="container">
            <div className="text-center mb-4">
              <h2 className="h3">
                <i className="bi bi-clock-history text-secondary me-2"></i>
                সম্প্রতি দেখা পণ্য
              </h2>
              <p className="text-muted">Recently Viewed - আপনার দেখা পণ্যসমূহ</p>
            </div>
            <div className="row g-3">
              {recentlyViewed.slice(0, 8).map((product) => (
                <div key={product.id} className="col-6 col-md-3">
                  <ProductCard 
                    {...product} 
                    onAddToCart={() => handleAddToCart(product)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Customer Reviews / গ্রাহক পর্যালোচনা */}
      {customerReviews.length > 0 && (
        <section className="customer-reviews mb-5">
          <div className="container">
            <div className="text-center mb-4">
              <h2 className="h3">
                <i className="bi bi-chat-quote text-primary me-2"></i>
                গ্রাহক পর্যালোচনা
              </h2>
              <p className="text-muted">Customer Reviews - আমাদের গ্রাহকরা কী বলছেন</p>
            </div>
            <div className="row g-4">
              {customerReviews.slice(0, 3).map((review) => (
                <div key={review.id} className="col-md-4">
                  <div className="card h-100 shadow-sm">
                    {review.video_url ? (
                      <div className="ratio ratio-16x9">
                        <iframe 
                          src={review.video_url.replace('watch?v=', 'embed/')}
                          title={`Review by ${review.customer_name}`}
                          allowFullScreen
                        ></iframe>
                      </div>
                    ) : (
                      <div className="card-header bg-primary text-white">
                        <div className="d-flex align-items-center">
                          <div className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center me-2"
                               style={{ width: '40px', height: '40px', fontWeight: 'bold' }}>
                            {review.customer_name.charAt(0)}
                          </div>
                          <div>
                            <h6 className="mb-0">{review.customer_name}</h6>
                            <div className="text-warning">
                              {'★'.repeat(review.rating || 5)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="card-body">
                      <p className="card-text">{review.review_text}</p>
                      {review.product_name && (
                        <Link 
                          href={`/product/${review.product_slug}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          পণ্য দেখুন: {review.product_name}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Email Subscribe / ইমেইল সাবস্ক্রিপশন */}
      <section className="email-subscribe mb-5 py-5" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-8 text-center text-white">
              <h2 className="h3 mb-3">
                <i className="bi bi-envelope-heart me-2"></i>
                নিউজলেটার সাবস্ক্রাইব করুন
              </h2>
              <p className="mb-4">
                বিশেষ অফার এবং নতুন পণ্য সম্পর্কে জানতে আমাদের নিউজলেটার সাবস্ক্রাইব করুন
              </p>
              <form onSubmit={handleEmailSubscribe} className="row g-2 justify-content-center">
                <div className="col-md-6">
                  <input 
                    type="email"
                    className="form-control form-control-lg"
                    placeholder="আপনার ইমেইল ঠিকানা"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <button type="submit" className="btn btn-success btn-lg w-100">
                    <i className="bi bi-send me-2"></i>
                    সাবস্ক্রাইব
                  </button>
                </div>
              </form>
              {subscribeMessage && (
                <div className="alert alert-light mt-3" role="alert">
                  {subscribeMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features / সুবিধা সমূহ */}
      <section className="features mb-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-3 text-center">
              <div className="p-4">
                <i className="bi bi-truck" style={{ fontSize: '3rem', color: '#28a745' }}></i>
                <h5 className="mt-3">ফ্রি ডেলিভারি</h5>
                <p className="text-muted small">৳৫০০+ অর্ডারে</p>
              </div>
            </div>
            <div className="col-md-3 text-center">
              <div className="p-4">
                <i className="bi bi-shield-check" style={{ fontSize: '3rem', color: '#28a745' }}></i>
                <h5 className="mt-3">নিরাপদ পেমেন্ট</h5>
                <p className="text-muted small">১০০% সুরক্ষিত</p>
              </div>
            </div>
            <div className="col-md-3 text-center">
              <div className="p-4">
                <i className="bi bi-arrow-repeat" style={{ fontSize: '3rem', color: '#28a745' }}></i>
                <h5 className="mt-3">সহজ রিটার্ন</h5>
                <p className="text-muted small">৭ দিনের মধ্যে</p>
              </div>
            </div>
            <div className="col-md-3 text-center">
              <div className="p-4">
                <i className="bi bi-headset" style={{ fontSize: '3rem', color: '#28a745' }}></i>
                <h5 className="mt-3">২৪/৭ সাপোর্ট</h5>
                <p className="text-muted small">সবসময় আপনার পাশে</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add to Cart Popup */}
      <AddToCartPopup 
        isOpen={showCartPopup}
        onClose={() => setShowCartPopup(false)}
        product={cartProduct}
      />
    </div>
  );
}
