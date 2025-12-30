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
      { title: 'Manage Categories', icon: FaBoxes, path: '/admin/categories' },
      { title: 'Combo Products', icon: FaBoxes, path: '/admin/combo-products' },
      { title: 'Offers & Promotions', icon: FaBoxes, path: '/admin/offers' },
      { title: 'Special Offers', icon: FaBoxes, path: '/admin/special-offers' },
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
    title: 'HR Management',
    icon: FaUserTie,
    children: [
      { title: 'Branches', icon: FaUserTie, path: '/admin/hrm/branches' },
      { title: 'Departments', icon: FaUserTie, path: '/admin/hrm/departments' },
      { title: 'Designations', icon: FaUserTie, path: '/admin/hrm/designations' },
      { title: 'Document Types', icon: FaUserTie, path: '/admin/hrm/document-types' },
      { title: 'Employees', icon: FaUserTie, path: '/admin/hrm/employees' },
      { title: 'Award Types', icon: FaUserTie, path: '/admin/hrm/award-types' },
      { title: 'Awards', icon: FaUserTie, path: '/admin/hrm/awards' },
      { title: 'Promotions', icon: FaUserTie, path: '/admin/hrm/promotions' },
      { title: 'Resignations', icon: FaUserTie, path: '/admin/hrm/resignations' },
      { title: 'Terminations', icon: FaUserTie, path: '/admin/hrm/terminations' },
      { title: 'Warnings', icon: FaUserTie, path: '/admin/hrm/warnings' },
      { title: 'Trips', icon: FaUserTie, path: '/admin/hrm/trips' },
      { title: 'Complaints', icon: FaUserTie, path: '/admin/hrm/complaints' },
      { title: 'Transfers', icon: FaUserTie, path: '/admin/hrm/transfers' },
      { title: 'Holidays', icon: FaUserTie, path: '/admin/hrm/holidays' },
      { title: 'Announcements', icon: FaUserTie, path: '/admin/hrm/announcements' },
      { 
        title: 'Training Management', 
        icon: FaUserTie, 
        children: [
          { title: 'Training Types', icon: FaUserTie, path: '/admin/hrm/training-types' },
          { title: 'Training Programs', icon: FaUserTie, path: '/admin/hrm/training-programs' },
          { title: 'Training Sessions', icon: FaUserTie, path: '/admin/hrm/training-sessions' },
          { title: 'Employee Trainings', icon: FaUserTie, path: '/admin/hrm/employee-trainings' },
        ]
      },
      { 
        title: 'Performance Management', 
        icon: FaUserTie, 
        children: [
          { title: 'Indicator Categories', icon: FaUserTie, path: '/admin/hrm/indicator-categories' },
          { title: 'Indicators', icon: FaUserTie, path: '/admin/hrm/indicators' },
          { title: 'Goal Types', icon: FaUserTie, path: '/admin/hrm/goal-types' },
          { title: 'Employee Goals', icon: FaUserTie, path: '/admin/hrm/employee-goals' },
          { title: 'Review Cycles', icon: FaUserTie, path: '/admin/hrm/review-cycles' },
          { title: 'Employee Reviews', icon: FaUserTie, path: '/admin/hrm/employee-reviews' },
        ]
      },
      { 
        title: 'Attendance Management', 
        icon: FaUserTie, 
        children: [
          { title: 'Shifts', icon: FaUserTie, path: '/admin/hrm/shifts' },
          { title: 'Attendance Policies', icon: FaUserTie, path: '/admin/hrm/attendance-policies' },
          { title: 'Attendance Records', icon: FaUserTie, path: '/admin/hrm/attendance-records' },
          { title: 'Regularizations', icon: FaUserTie, path: '/admin/hrm/regularizations' },
        ]
      },
      { 
        title: 'Payroll', 
        icon: FaUserTie, 
        children: [
          { title: 'Salary Components', icon: FaUserTie, path: '/admin/hrm/salary-components' },
          { title: 'Employee Salaries', icon: FaUserTie, path: '/admin/hrm/employee-salaries' },
          { title: 'Payroll Runs', icon: FaUserTie, path: '/admin/hrm/payroll-runs' },
          { title: 'Payslips', icon: FaUserTie, path: '/admin/hrm/payslips' },
        ]
      },
      { 
        title: 'Leave Management', 
        icon: FaUserTie, 
        children: [
          { title: 'Leave Types', icon: FaUserTie, path: '/admin/hrm/leave-types' },
          { title: 'Leave Policies', icon: FaUserTie, path: '/admin/hrm/leave-policies' },
          { title: 'Leave Applications', icon: FaUserTie, path: '/admin/hrm/leave-applications' },
          { title: 'Leave Balances', icon: FaUserTie, path: '/admin/hrm/leave-balances' },
        ]
      },
      {
        title: 'Recruitment',
        icon: FaUserTie,
        children: [
          { title: 'Job Categories', icon: FaUserTie, path: '/admin/hrm/job-categories' },
          { title: 'Job Requisitions', icon: FaUserTie, path: '/admin/hrm/job-requisitions' },
          { title: 'Job Types', icon: FaUserTie, path: '/admin/hrm/job-types' },
          { title: 'Job Locations', icon: FaUserTie, path: '/admin/hrm/job-locations' },
          { title: 'Job Postings', icon: FaUserTie, path: '/admin/hrm/job-postings' },
          { title: 'Candidate Sources', icon: FaUserTie, path: '/admin/hrm/candidate-sources' },
          { title: 'Candidates', icon: FaUserTie, path: '/admin/hrm/candidates' },
          { title: 'Interview Types', icon: FaUserTie, path: '/admin/hrm/interview-types' },
          { title: 'Interview Rounds', icon: FaUserTie, path: '/admin/hrm/interview-rounds' },
          { title: 'Interviews', icon: FaUserTie, path: '/admin/hrm/interviews' },
          { title: 'Interview Feedback', icon: FaUserTie, path: '/admin/hrm/interview-feedback' },
          { title: 'Assessments', icon: FaUserTie, path: '/admin/hrm/assessments' },
          { title: 'Offer Templates', icon: FaUserTie, path: '/admin/hrm/offer-templates' },
          { title: 'Offers', icon: FaUserTie, path: '/admin/hrm/offers' },
          { title: 'Onboarding Checklists', icon: FaUserTie, path: '/admin/hrm/onboarding-checklists' },
          { title: 'Checklist Items', icon: FaUserTie, path: '/admin/hrm/checklist-items' },
          { title: 'Candidate Onboarding', icon: FaUserTie, path: '/admin/hrm/candidate-onboarding' },
        ],
      },
      {
        title: 'Contract Management',
        icon: FaUserTie,
        children: [
          { title: 'Contract Types', icon: FaUserTie, path: '/admin/hrm/contract-types' },
          { title: 'Employee Contracts', icon: FaUserTie, path: '/admin/hrm/employee-contracts' },
          { title: 'Contract Renewals', icon: FaUserTie, path: '/admin/hrm/contract-renewals' },
          { title: 'Contract Templates', icon: FaUserTie, path: '/admin/hrm/contract-templates' },
        ],
      },
      {
        title: 'Document Management',
        icon: FaUserTie,
        children: [
          { title: 'Document Categories', icon: FaUserTie, path: '/admin/hrm/document-categories' },
          { title: 'HR Documents', icon: FaUserTie, path: '/admin/hrm/hr-documents' },
          { title: 'Acknowledgments', icon: FaUserTie, path: '/admin/hrm/acknowledgments' },
          { title: 'Document Templates', icon: FaUserTie, path: '/admin/hrm/document-templates' },
        ],
      },
      {
        title: 'Meetings',
        icon: FaUserTie,
        children: [
          { title: 'Meeting Types', icon: FaUserTie, path: '/admin/hrm/meeting-types' },
          { title: 'Meeting Rooms', icon: FaUserTie, path: '/admin/hrm/meeting-rooms' },
          { title: 'Meetings', icon: FaUserTie, path: '/admin/hrm/meetings' },
          { title: 'Meeting Attendees', icon: FaUserTie, path: '/admin/hrm/meeting-attendees' },
          { title: 'Meeting Minutes', icon: FaUserTie, path: '/admin/hrm/meeting-minutes' },
          { title: 'Action Items', icon: FaUserTie, path: '/admin/hrm/action-items' },
        ],
      },
      {
        title: 'Calendar',
        icon: FaUserTie,
        children: [
          { title: 'Calendar Events', icon: FaUserTie, path: '/admin/hrm/calendar-events' },
        ],
      },
      {
        title: 'Media Library',
        icon: FaUserTie,
        children: [
          { title: 'Media Files', icon: FaUserTie, path: '/admin/hrm/media-files' },
        ],
      },
    ],
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
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const router = useRouter();

  // Helper function to get all parent menu titles for a given path
  const getParentMenuTitles = (items: MenuItem[], currentPath: string, parents: string[] = []): string[] | null => {
    for (const item of items) {
      if (item.path === currentPath) {
        return parents;
      }
      if (item.children) {
        const found = getParentMenuTitles(item.children, currentPath, [...parents, item.title]);
        if (found !== null) {
          return found;
        }
      }
    }
    return null;
  };

  // Auto-expand menu containing the active page
  useEffect(() => {
    const parentTitles = getParentMenuTitles(menuItems, router.pathname);
    if (parentTitles && parentTitles.length > 0) {
      setExpandedMenus(parentTitles);
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
              expandedMenus={expandedMenus}
              onToggle={toggleMenu}
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
  expandedMenus,
  onToggle,
  currentPath,
}: {
  item: MenuItem;
  collapsed: boolean;
  expandedMenus: string[];
  onToggle: (title: string) => void;
  currentPath: string;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.path === currentPath;
  const isExpanded = expandedMenus.includes(item.title);
  const IconComponent = item.icon;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => onToggle(item.title)}
          className={`w-full flex items-center px-4 py-3 hover:bg-blue-700 transition-colors ${
            isExpanded ? 'bg-blue-700' : ''
          }`}
        >
          <IconComponent className="text-lg" />
          {!collapsed && (
            <>
              <span className="ml-3 flex-1 text-left text-sm font-medium">{item.title}</span>
              <FaChevronDown className={`text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>
        {isExpanded && !collapsed && (
          <div className="bg-blue-800 bg-opacity-50">
            {item.children!.map((child) => {
              const ChildIcon = child.icon;
              const hasGrandchildren = child.children && child.children.length > 0;
              
              if (hasGrandchildren) {
                const isChildExpanded = expandedMenus.includes(child.title);
                return (
                  <div key={child.title}>
                    <button
                      onClick={() => onToggle(child.title)}
                      className="w-full flex items-center px-8 py-2 hover:bg-blue-700 transition-colors"
                    >
                      <ChildIcon className="text-sm" />
                      <span className="ml-3 flex-1 text-left text-sm">{child.title}</span>
                      <FaChevronDown className={`text-xs transition-transform ${isChildExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isChildExpanded && (
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
