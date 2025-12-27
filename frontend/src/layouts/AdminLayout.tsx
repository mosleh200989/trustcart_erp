import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  FaTachometerAlt, FaBoxes, FaShoppingCart, FaUsers, FaWarehouse, 
  FaShoppingBag, FaUserTie, FaBook, FaBullseye, FaHandshake, 
  FaHeadset, FaUser, FaCog, FaBars, FaTimes, FaBell, FaChevronDown 
} from 'react-icons/fa';

interface MenuItem {
  title: string;
  icon: any;
  path?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', icon: FaTachometerAlt, path: '/admin/dashboard' },
  {
    title: 'Products',
    icon: FaBoxes,
    children: [
      { title: 'All Products', icon: FaBoxes, path: '/admin/products' },
      { title: 'Combo Products', icon: FaBoxes, path: '/admin/combo-products' },
      { title: 'Offers & Promotions', icon: FaBoxes, path: '/admin/offers' },
    ],
  },
  {
    title: 'Sales',
    icon: FaShoppingCart,
    path: '/admin/sales'
  },
  {
    title: 'Customers',
    icon: FaUsers,
    path: '/admin/customers'
  },
  {
    title: 'Inventory',
    icon: FaWarehouse,
    path: '/admin/inventory'
  },
  {
    title: 'Purchase',
    icon: FaShoppingBag,
    path: '/admin/purchase'
  },
  {
    title: 'HR',
    icon: FaUserTie,
    path: '/admin/hr'
  },
  {
    title: 'Payroll',
    icon: FaUserTie,
    path: '/admin/payroll'
  },
  {
    title: 'Accounting',
    icon: FaBook,
    path: '/admin/accounting'
  },
  {
    title: 'Projects',
    icon: FaBullseye,
    path: '/admin/projects'
  },
  {
    title: 'Tasks',
    icon: FaBullseye,
    path: '/admin/tasks'
  },
  {
    title: 'CRM',
    icon: FaHandshake,
    children: [
      { title: 'Dashboard', icon: FaTachometerAlt, path: '/admin/crm/team-dashboard' },
      { title: 'Lead Assignment', icon: FaUsers, path: '/admin/crm/lead-assignment' },
      { title: 'Team Data Collection', icon: FaBullseye, path: '/admin/crm/team-data-collection' },
      { title: 'Tier Management', icon: FaTachometerAlt, path: '/admin/crm/customer-tier-management' },
      { title: 'Pipeline', icon: FaBullseye, path: '/admin/crm/pipeline' },
      { title: 'Tasks', icon: FaBullseye, path: '/admin/crm/tasks' },
      { title: 'Analytics', icon: FaTachometerAlt, path: '/admin/crm/analytics' },
      { title: 'Quotes', icon: FaBook, path: '/admin/crm/quotes' },
      { title: 'Meetings', icon: FaUsers, path: '/admin/crm/meetings' },
      { title: 'Emails', icon: FaBell, path: '/admin/crm/emails' },
      { title: 'Customers', icon: FaUsers, path: '/admin/crm/customers' },
    ],
  },
  {
    title: 'Support',
    icon: FaHeadset,
    path: '/admin/support'
  },
  {
    title: 'Users',
    icon: FaUser,
    path: '/admin/users'
  },
  {
    title: 'Recruitment',
    icon: FaUserTie,
    children: [
      { title: 'Jobs', icon: FaUserTie, path: '/admin/recruitment/jobs' },
      { title: 'Applications', icon: FaUserTie, path: '/admin/recruitment/applications' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const router = useRouter();

  // Auto-expand menu containing the active page
  useEffect(() => {
    const activeMenu = menuItems.find(item => {
      if (item.path === router.pathname) return true;
      if (item.children) {
        return item.children.some(child => child.path === router.pathname);
      }
      return false;
    });
    
    if (activeMenu && activeMenu.children) {
      setExpandedMenus(prev => 
        prev.includes(activeMenu.title) ? prev : [...prev, activeMenu.title]
      );
    }
  }, [router.pathname]);

  const toggleMenu = (title: string) => {
    setExpandedMenus(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('authToken');
    router.push('/admin/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar with Argon Gradient */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 text-white transition-all duration-300 flex flex-col shadow-xl`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-blue-500 flex items-center justify-between">
          {!sidebarCollapsed && (
            <h1 className="text-xl font-bold">TrustCart ERP</h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-white hover:text-blue-200 transition-colors"
          >
            {sidebarCollapsed ? <FaBars size={20} /> : <FaTimes size={20} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => (
            <MenuItem
              key={item.title}
              item={item}
              collapsed={sidebarCollapsed}
              expanded={expandedMenus.includes(item.title)}
              onToggle={() => toggleMenu(item.title)}
              currentPath={router.pathname}
            />
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Gradient */}
        <header className="bg-gradient-to-r from-white to-gray-50 shadow-md z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <h2 className="text-2xl font-bold text-gray-800">Admin Panel</h2>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-800 relative">
                <FaBell size={20} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  3
                </span>
              </button>
              <span className="text-sm text-gray-700 font-medium">Admin User</span>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">{children}</main>
      </div>
    </div>
  );
}

function MenuItem({
  item,
  collapsed,
  expanded,
  onToggle,
  currentPath,
}: {
  item: MenuItem;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  currentPath: string;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.path === currentPath;
  const IconComponent = item.icon;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={onToggle}
          className={`w-full flex items-center px-4 py-3 hover:bg-blue-700 transition-colors ${
            expanded ? 'bg-blue-700' : ''
          }`}
        >
          <IconComponent className="text-lg" />
          {!collapsed && (
            <>
              <span className="ml-3 flex-1 text-left text-sm font-medium">{item.title}</span>
              <FaChevronDown className={`text-sm transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>
        {expanded && !collapsed && (
          <div className="bg-blue-800 bg-opacity-50">
            {item.children!.map((child) => {
              const ChildIcon = child.icon;
              return (
                <Link key={child.title} href={child.path || '#'}>
                  <div
                    className={`flex items-center px-8 py-2 hover:bg-blue-700 transition-colors ${
                      currentPath === child.path ? 'bg-gradient-to-r from-blue-500 to-blue-600' : ''
                    }`}
                  >
                    <ChildIcon className="text-sm" />
                    <span className="ml-3 text-sm">{child.title}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.path || '#'}>
      <div
        className={`flex items-center px-4 py-3 hover:bg-blue-700 transition-colors ${
          isActive ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-l-4 border-white' : ''
        }`}
      >
        <IconComponent className="text-lg" />
        {!collapsed && <span className="ml-3 text-sm font-medium">{item.title}</span>}
      </div>
    </Link>
  );
}
