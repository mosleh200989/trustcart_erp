import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaHome, FaThLarge, FaShoppingCart, FaUser } from 'react-icons/fa';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: FaHome },
  { href: '/products', label: 'Categories', icon: FaThLarge },
  { href: '/cart', label: 'Cart', icon: FaShoppingCart, showBadge: true },
  { href: '/customer/account', label: 'Account', icon: FaUser, authAware: true },
];

export default function MobileBottomNav() {
  const router = useRouter();
  const { items: cartItems } = useCart();
  const { user } = useAuth();

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Hide on admin pages, checkout, and auth pages
  const hiddenPaths = ['/admin', '/checkout', '/customer/login', '/customer/register'];
  if (hiddenPaths.some(p => router.pathname.startsWith(p))) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/'
            ? router.pathname === '/'
            : router.pathname.startsWith(item.href);

          const href = item.authAware && !user ? '/customer/login' : item.href;

          return (
            <Link
              key={item.href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                isActive ? 'text-orange-500' : 'text-gray-500'
              }`}
            >
              <span className="relative">
                <item.icon size={20} />
                {item.showBadge && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center leading-none px-1">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
