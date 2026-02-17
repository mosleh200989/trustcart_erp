import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get cart count from localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartCount(cart.length);

    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Listen for cart updates
    const handleCartUpdate = () => {
      const updatedCart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(updatedCart.length);
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/admin/login');
  };

  return (
    <>
      {/* Top Info Bar */}
      <div style={{
        backgroundColor: '#1b5e20',
        color: 'white',
        height: '42px',
        display: 'flex',
        alignItems: 'center',
        fontSize: '14px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div className="container-lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Left side - Office time and hotline */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <span>⏰ Office time: 8:00 AM to 12:00 AM</span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span>📞 Hotline: 01805486094</span>
            </div>
            
            {/* Right side - Social icons */}
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" 
                 style={{ color: 'white', textDecoration: 'none', fontSize: '18px', transition: 'opacity 0.2s' }}
                 onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                 onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                📘
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                 style={{ color: 'white', textDecoration: 'none', fontSize: '18px', transition: 'opacity 0.2s' }}
                 onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                 onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                🐦
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                 style={{ color: 'white', textDecoration: 'none', fontSize: '18px', transition: 'opacity 0.2s' }}
                 onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                 onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                📷
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
                 style={{ color: 'white', textDecoration: 'none', fontSize: '18px', transition: 'opacity 0.2s' }}
                 onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                 onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                💼
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light" style={{ backgroundColor: 'white' }}>
        <div className="container-lg">
          {/* Left - Logo */}
          <Link href="/" className="navbar-brand">
            🌿 TrustCart
          </Link>
          
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          
          <div className="collapse navbar-collapse" id="navbarNav">
            {/* Middle - Menu Items */}
            <ul className="navbar-nav mx-auto">
              <li className="nav-item">
                <Link href="/" className={`nav-link ${router.pathname === '/' ? 'active' : ''}`}>
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/products" className={`nav-link ${router.pathname === '/products' ? 'active' : ''}`}>
                  All Products
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/about" className={`nav-link ${router.pathname === '/about' ? 'active' : ''}`}>
                  About Us
                </Link>
              </li>
              {/* <li className="nav-item">
                <Link href="/blog" className={`nav-link ${router.pathname === '/blog' ? 'active' : ''}`}>
                  Blog
                </Link>
              </li> */}
              <li className="nav-item">
                <Link href="/contact" className={`nav-link ${router.pathname === '/contact' ? 'active' : ''}`}>
                  Contact Us
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/track-order" className={`nav-link ${router.pathname === '/track-order' ? 'active' : ''}`}>
                  Track Order
                </Link>
              </li>
            </ul>
            
            {/* Right - Cart, Login/Register */}
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <Link href="/cart" className={`nav-link position-relative ${router.pathname === '/cart' ? 'active' : ''}`}>
                  🛒 Cart
                  {cartCount > 0 && (
                    <span
                      className="badge bg-danger position-absolute top-0 start-100 translate-middle"
                      style={{ fontSize: '0.7rem' }}
                    >
                      {cartCount}
                    </span>
                  )}
                </Link>
              </li>
              {user ? (
                <li className="nav-item">
                  <Link href="/profile" className="nav-link">
                    👤 {user.name || user.email}
                  </Link>
                </li>
              ) : (
                <>
                  <li className="nav-item">
                    <Link href="/admin/login" className={`nav-link ${router.pathname === '/admin/login' ? 'active' : ''}`}>
                      Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/register" className={`nav-link ${router.pathname === '/register' ? 'active' : ''}`}>
                      Register
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}
