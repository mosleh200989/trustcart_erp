import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaBars, FaSearch, FaShoppingCart, FaHeart, FaUser } from 'react-icons/fa';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { safeGetItem } from '@/utils/safeStorage';

export default function MobileBottomNav() {
  const router = useRouter();
  const { items: cartItems } = useCart();
  const { user } = useAuth();
  const [wishlistCount, setWishlistCount] = useState(0);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Track wishlist count from localStorage
  useEffect(() => {
    const updateWishlistCount = () => {
      try {
        const stored = JSON.parse(safeGetItem('wishlist') || '[]');
        setWishlistCount(stored.length);
      } catch { setWishlistCount(0); }
    };
    updateWishlistCount();
    window.addEventListener('wishlistUpdated', updateWishlistCount);
    window.addEventListener('storage', updateWishlistCount);
    return () => {
      window.removeEventListener('wishlistUpdated', updateWishlistCount);
      window.removeEventListener('storage', updateWishlistCount);
    };
  }, []);

  // Hide on admin pages, checkout, auth pages, and landing pages
  const hiddenPaths = ['/admin', '/checkout', '/customer/login', '/customer/register', '/lp/'];
  if (hiddenPaths.some(p => router.pathname.startsWith(p) || router.asPath.startsWith(p))) return null;

  const accountHref = user ? '/customer/dashboard' : '/customer/login';

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {/* Menu — dispatches event to toggle ElectroNavbar mobile menu */}
        <button
          onClick={() => window.dispatchEvent(new Event('toggleMobileMenu'))}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-500 transition-colors"
          aria-label="Open menu"
        >
          <FaBars size={20} />
          <span className="text-[10px] mt-0.5 font-medium">Menu</span>
        </button>

        {/* Search — dispatches event to open search drawer */}
        <button
          onClick={() => window.dispatchEvent(new Event('toggleMobileSearch'))}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-500 transition-colors"
          aria-label="Open search"
        >
          <FaSearch size={20} />
          <span className="text-[10px] mt-0.5 font-medium">Search</span>
        </button>

        {/* Cart */}
        <Link
          href="/cart"
          id="mobile-cart-icon"
          className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
            router.pathname.startsWith('/cart') ? 'text-orange-500' : 'text-gray-500'
          }`}
        >
          <span className="relative">
            <FaShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center leading-none px-1">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </span>
          <span className="text-[10px] mt-0.5 font-medium">Cart</span>
        </Link>

        {/* Wishlist */}
        <Link
          href="/wishlist"
          className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
            router.pathname.startsWith('/wishlist') ? 'text-orange-500' : 'text-gray-500'
          }`}
        >
          <span className="relative">
            <FaHeart size={20} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center leading-none px-1">
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </span>
          <span className="text-[10px] mt-0.5 font-medium">Wishlist</span>
        </Link>

        {/* Account */}
        <Link
          href={accountHref}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            router.pathname.startsWith('/customer') ? 'text-orange-500' : 'text-gray-500'
          }`}
        >
          <FaUser size={20} />
          <span className="text-[10px] mt-0.5 font-medium">Account</span>
        </Link>
      </div>
    </nav>
  );
}
