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
    children: [
      { title: 'Branches', icon: FaUserTie, path: '/admin/hr/branches' },
      { title: 'Departments', icon: FaUserTie, path: '/admin/hr/departments' },
      { title: 'Designations', icon: FaUserTie, path: '/admin/hr/designations' },
      { title: 'Document Types', icon: FaUserTie, path: '/admin/hr/document-types' },
      { title: 'Employees', icon: FaUserTie, path: '/admin/hr/employees' },
      { title: 'Award Types', icon: FaUserTie, path: '/admin/hr/award-types' },
      { title: 'Awards', icon: FaUserTie, path: '/admin/hr/awards' },
      { title: 'Promotions', icon: FaUserTie, path: '/admin/hr/promotions' },
      { title: 'Performance', icon: FaUserTie, path: '/admin/hr/performance', children: [
        { title: 'Indicator Categories', icon: FaUserTie, path: '/admin/hr/performance/indicator-categories' },
        { title: 'Indicators', icon: FaUserTie, path: '/admin/hr/performance/indicators' },
        { title: 'Goal Types', icon: FaUserTie, path: '/admin/hr/performance/goal-types' },
        { title: 'Employee Goals', icon: FaUserTie, path: '/admin/hr/performance/employee-goals' },
        { title: 'Review Cycles', icon: FaUserTie, path: '/admin/hr/performance/review-cycles' },
        { title: 'Employee Reviews', icon: FaUserTie, path: '/admin/hr/performance/employee-reviews' },
      ]},
      { title: 'Resignations', icon: FaUserTie, path: '/admin/hr/resignations' },
      { title: 'Terminations', icon: FaUserTie, path: '/admin/hr/terminations' },
      { title: 'Warnings', icon: FaUserTie, path: '/admin/hr/warnings' },
      { title: 'Trips', icon: FaUserTie, path: '/admin/hr/trips' },
      { title: 'Complaints', icon: FaUserTie, path: '/admin/hr/complaints' },
      { title: 'Transfers', icon: FaUserTie, path: '/admin/hr/transfers' },
      { title: 'Holidays', icon: FaUserTie, path: '/admin/hr/holidays' },
      { title: 'Announcements', icon: FaUserTie, path: '/admin/hr/announcements' },
      { title: 'Training Management', icon: FaUserTie, children: [
        { title: 'Training Types', icon: FaUserTie, path: '/admin/hr/training-types' },
        { title: 'Training Programs', icon: FaUserTie, path: '/admin/hr/training-programs' },
        { title: 'Training Sessions', icon: FaUserTie, path: '/admin/hr/training-sessions' },
        { title: 'Employee Trainings', icon: FaUserTie, path: '/admin/hr/employee-trainings' },
      ]},
    ],
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
    path: '/admin/crm/team-dashboard'
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
              const hasGrandchildren = child.children && child.children.length > 0;
              
              if (hasGrandchildren) {
                const [subExpanded, setSubExpanded] = useState(false);
                return (
                  <div key={child.title}>
                    <button
                      onClick={() => setSubExpanded(!subExpanded)}
                      className="w-full flex items-center px-8 py-2 hover:bg-blue-700 transition-colors"
                    >
                      <ChildIcon className="text-sm" />
                      <span className="ml-3 flex-1 text-left text-sm">{child.title}</span>
                      <FaChevronDown className={`text-xs transition-transform ${subExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {subExpanded && (
                      <div className="bg-blue-900 bg-opacity-50">
                        {child.children!.map((grandchild) => {
                          const GrandchildIcon = grandchild.icon;
                          return (
                            <Link key={grandchild.title} href={grandchild.path || '#'}>
                              <div
                                className={`flex items-center px-12 py-2 hover:bg-blue-700 transition-colors ${
                                  currentPath === grandchild.path ? 'bg-gradient-to-r from-blue-500 to-blue-600' : ''
                                }`}
                              >
                                <GrandchildIcon className="text-xs" />
                                <span className="ml-3 text-xs">{grandchild.title}</span>
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
