import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FaBars,
  FaHome,
  FaLink,
  FaMapMarkerAlt,
  FaShoppingBag,
  FaSignOutAlt,
  FaTicketAlt,
  FaUser,
  FaWallet,
  FaTimes,
} from 'react-icons/fa';

interface MenuItem {
  title: string;
  icon: any;
  path: string;
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', icon: FaHome, path: '/customer/dashboard' },
  { title: 'My Profile', icon: FaUser, path: '/customer/profile' },
  { title: 'My Addresses', icon: FaMapMarkerAlt, path: '/customer/addresses' },
  { title: 'Wallet & Points', icon: FaWallet, path: '/customer/wallet' },
  { title: 'My Orders', icon: FaShoppingBag, path: '/customer/orders' },
  { title: 'Support Tickets', icon: FaTicketAlt, path: '/customer/support' },
  { title: 'Referral Link', icon: FaLink, path: '/customer/referrals' },
];

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [router.pathname]);

  const handleLogout = () => {
    // Clear shared auth token used by API client
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    setSidebarOpen(false);
    router.push('/customer/login');
  };

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="px-6 py-4 border-b">
        <h1 className="text-xl font-bold text-orange-600">Customer Portal</h1>
        <p className="text-xs text-gray-500 mt-1">Customer Account only</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                onClick={onNavigate}
                className={`flex items-center px-5 py-3 text-sm cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <Icon className="mr-3" />
                <span>{item.title}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center justify-center m-4 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
      >
        <FaSignOutAlt className="mr-2" />
        Logout
      </button>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 bg-white shadow-md flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h1 className="text-xl font-bold text-orange-600">Customer Portal</h1>
                <p className="text-xs text-gray-500 mt-1">Customer Account only</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <FaTimes />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-5 py-3 text-sm cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                      }`}
                    >
                      <Icon className="mr-3" />
                      <span>{item.title}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center m-4 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              <FaSignOutAlt className="mr-2" />
              Logout
            </button>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
                aria-label="Open menu"
              >
                <FaBars />
              </button>
              <h2 className="text-lg font-semibold text-gray-800">Customer Account</h2>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
