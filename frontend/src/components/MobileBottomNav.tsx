import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaHome, FaSearch, FaShoppingCart, FaUser } from 'react-icons/fa';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

export default function MobileBottomNav() {
  const router = useRouter();
  const { items: cartItems } = useCart();
  const { user } = useAuth();

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Hide on admin pages, checkout, auth pages, and landing pages
  const hiddenPaths = ['/admin', '/checkout', '/customer/login', '/customer/register', '/lp/'];
  if (hiddenPaths.some(p => router.pathname.startsWith(p) || router.asPath.startsWith(p))) return null;

  const accountHref = user ? '/customer/dashboard' : '/customer/login';

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            router.pathname === '/' ? 'text-orange-500' : 'text-gray-500'
          }`}
          aria-label="Go to home"
        >
          <FaHome size={20} />
          <span className="text-[10px] mt-0.5 font-medium">Home</span>
        </Link>

        {/* Search */}
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
