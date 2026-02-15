import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
// import QuoteNotifications from '@/components/QuoteNotifications'; // DISABLED
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/services/api';
import { 
  FaTachometerAlt, FaBoxes, FaShoppingCart, FaUsers, FaWarehouse, 
  FaShoppingBag, FaUserTie, FaBook, FaBullseye, FaHandshake, 
  FaHeadset, FaUser, FaCog, FaBars, FaTimes, FaBell, FaChevronDown, FaChartBar, FaTags, FaGift, FaPhone, FaMoneyBillWave, FaImage, FaList, FaRocket, FaPrint
} from 'react-icons/fa';

interface MenuItem {
  title: string;
  icon: any;
  path?: string;
  children?: MenuItem[];
  requiredPermissions?: string[]; // any-of
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', icon: FaTachometerAlt, path: '/admin/dashboard' },
  {
    title: 'Products',
    icon: FaBoxes,
    children: [
      { title: 'All Products', icon: FaBoxes, path: '/admin/products', requiredPermissions: ['view-products'] },
      { title: 'Manage Categories', icon: FaBoxes, path: '/admin/categories', requiredPermissions: ['manage-categories'] },
      { title: 'Combo Products', icon: FaBoxes, path: '/admin/combo-products', requiredPermissions: ['view-products'] },
      { title: 'Hot Deals', icon: FaBoxes, path: '/admin/products/hot-deals', requiredPermissions: ['manage-discounts'] },
      { title: 'Deal of the Day', icon: FaBoxes, path: '/admin/products/deal-of-the-day', requiredPermissions: ['manage-discounts', 'edit-products'] },
      { title: 'Offers & Promotions', icon: FaBoxes, path: '/admin/offers', requiredPermissions: ['manage-discounts'] },
      { title: 'Special Offers', icon: FaBoxes, path: '/admin/special-offers', requiredPermissions: ['manage-discounts'] },
    ],
  },
  {
    title: 'Banners',
    icon: FaImage,
    path: '/admin/banners',
    requiredPermissions: ['manage-system-settings']
  },
  {
    title: 'Landing Pages',
    icon: FaRocket,
    path: '/admin/landing-pages',
    requiredPermissions: ['manage-system-settings'],
    // Orders now go to Sales -> Orders module
  },
  {
    title: 'Sales',
    icon: FaShoppingCart,
    children: [
      { title: 'Orders', icon: FaShoppingCart, path: '/admin/sales', requiredPermissions: ['view-sales-orders'] },
      { title: 'Printing', icon: FaPrint, path: '/admin/sales/printing', requiredPermissions: ['view-sales-orders'] },
      { title: 'Incomplete Order', icon: FaShoppingCart, path: '/admin/sales/incomplete-orders', requiredPermissions: ['view-sales-orders'] },
      { title: 'Late Delivery', icon: FaShoppingCart, path: '/admin/sales/late-delivery', requiredPermissions: ['view-sales-orders'] },
    ],
  },
  {
    title: 'Reports',
    icon: FaChartBar,
    children: [
      { title: 'Overview', icon: FaChartBar, path: '/admin/reports?tab=overview', requiredPermissions: ['view-sales-reports','view-product-reports','view-stock-reports','view-crm-reports','view-financial-reports','view-marketing-reports','view-mlm-reports','view-hr-reports','view-recruitment-reports'] },
      { title: 'Sales Reports', icon: FaChartBar, path: '/admin/reports?tab=sales', requiredPermissions: ['view-sales-reports'] },
      { title: 'Customer Reports', icon: FaChartBar, path: '/admin/reports?tab=customers', requiredPermissions: ['view-crm-reports','view-customers'] },
      { title: 'Product Reports', icon: FaChartBar, path: '/admin/reports?tab=products', requiredPermissions: ['view-product-reports'] },
      { title: 'Inventory Reports', icon: FaChartBar, path: '/admin/reports?tab=inventory', requiredPermissions: ['view-stock-reports'] },
      { title: 'Marketing Reports', icon: FaChartBar, path: '/admin/reports?tab=marketing', requiredPermissions: ['view-marketing-reports'] },
    ],
  },
  {
    title: 'Customers',
    icon: FaUsers,
    path: '/admin/customers',
    requiredPermissions: ['view-customers']
  },
  {
    title: 'Loyalty',
    icon: FaGift,
    requiredPermissions: ['view-mlm-reports', 'manage-mlm-settings'],
    children: [
      { title: 'Dashboard', icon: FaTachometerAlt, path: '/admin/loyalty' },
      { title: 'Members', icon: FaUsers, path: '/admin/loyalty/members' },
      { title: 'Referrals', icon: FaGift, path: '/admin/loyalty/referrals' },
      { title: 'Campaigns', icon: FaBullseye, path: '/admin/loyalty/referrals/campaigns' },
      { title: 'Partners', icon: FaHandshake, path: '/admin/loyalty/referrals/partners' },
      { title: 'Subscriptions', icon: FaShoppingCart, path: '/admin/loyalty/subscriptions' },
    ],
  },
  {
    title: 'Tagging',
    icon: FaTags,
    requiredPermissions: ['customer-segmentation', 'view-products'],
    children: [
      { title: 'Manage Tags', icon: FaTags, path: '/admin/tagging?tab=manage' },
      { title: 'Tagwise Filter', icon: FaTags, path: '/admin/tagging?tab=filter' },
    ],
  },
  {
    title: 'Inventory',
    icon: FaWarehouse,
    path: '/admin/inventory',
    requiredPermissions: ['view-inventory']
  },
  {
    title: 'Purchase',
    icon: FaShoppingBag,
    path: '/admin/purchase',
    requiredPermissions: ['view-purchase-orders']
  },
  {
    title: 'HR Management',
    icon: FaUserTie,
    requiredPermissions: ['view-employees', 'manage-attendance', 'process-payroll', 'view-hr-reports'],
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
          { title: 'Training Types', icon: FaUserTie, path: '/admin/hrm/training-management/training-types' },
          { title: 'Training Programs', icon: FaUserTie, path: '/admin/hrm/training-management/training-programs' },
          { title: 'Training Sessions', icon: FaUserTie, path: '/admin/hrm/training-management/training-sessions' },
          { title: 'Employee Trainings', icon: FaUserTie, path: '/admin/hrm/training-management/employee-trainings' },
        ]
      },
      { 
        title: 'Performance Management', 
        icon: FaUserTie, 
        children: [
          { title: 'Indicator Categories', icon: FaUserTie, path: '/admin/hrm/performance-management/indicator-categories' },
          { title: 'Indicators', icon: FaUserTie, path: '/admin/hrm/performance-management/indicators' },
          { title: 'Goal Types', icon: FaUserTie, path: '/admin/hrm/performance-management/goal-types' },
          { title: 'Employee Goals', icon: FaUserTie, path: '/admin/hrm/performance-management/employee-goals' },
          { title: 'Review Cycles', icon: FaUserTie, path: '/admin/hrm/performance-management/review-cycles' },
          { title: 'Employee Reviews', icon: FaUserTie, path: '/admin/hrm/performance-management/employee-reviews' },
        ]
      },
      { 
        title: 'Attendance Management', 
        icon: FaUserTie, 
        children: [
          { title: 'Shifts', icon: FaUserTie, path: '/admin/hrm/attendance-management/shifts' },
          { title: 'Attendance Policies', icon: FaUserTie, path: '/admin/hrm/attendance-management/attendance-policies' },
          { title: 'Attendance Records', icon: FaUserTie, path: '/admin/hrm/attendance-management/attendance-records' },
          { title: 'Regularizations', icon: FaUserTie, path: '/admin/hrm/attendance-management/regularizations' },
        ]
      },
      { 
        title: 'Payroll', 
        icon: FaUserTie, 
        children: [
          { title: 'Salary Components', icon: FaUserTie, path: '/admin/hrm/payroll/salary-components' },
          { title: 'Employee Salaries', icon: FaUserTie, path: '/admin/hrm/payroll/employee-salaries' },
          { title: 'Payroll Runs', icon: FaUserTie, path: '/admin/hrm/payroll/payroll-runs' },
          { title: 'Payslips', icon: FaUserTie, path: '/admin/hrm/payroll/payslips' },
        ]
      },
      { 
        title: 'Leave Management', 
        icon: FaUserTie, 
        children: [
          { title: 'Leave Types', icon: FaUserTie, path: '/admin/hrm/leave-management/leave-types' },
          { title: 'Leave Policies', icon: FaUserTie, path: '/admin/hrm/leave-management/leave-policies' },
          { title: 'Leave Applications', icon: FaUserTie, path: '/admin/hrm/leave-management/leave-applications' },
          { title: 'Leave Balances', icon: FaUserTie, path: '/admin/hrm/leave-management/leave-balances' },
        ]
      },
      {
        title: 'Recruitment',
        icon: FaUserTie,
        children: [
          { title: 'Job Categories', icon: FaUserTie, path: '/admin/hrm/recruitment/job-categories' },
          { title: 'Job Requisitions', icon: FaUserTie, path: '/admin/hrm/recruitment/job-requisitions' },
          { title: 'Job Types', icon: FaUserTie, path: '/admin/hrm/recruitment/job-types' },
          { title: 'Job Locations', icon: FaUserTie, path: '/admin/hrm/recruitment/job-locations' },
          { title: 'Job Postings', icon: FaUserTie, path: '/admin/hrm/recruitment/job-postings' },
          { title: 'Candidate Sources', icon: FaUserTie, path: '/admin/hrm/recruitment/candidate-sources' },
          { title: 'Candidates', icon: FaUserTie, path: '/admin/hrm/recruitment/candidates' },
          { title: 'Interview Types', icon: FaUserTie, path: '/admin/hrm/recruitment/interview-types' },
          { title: 'Interview Rounds', icon: FaUserTie, path: '/admin/hrm/recruitment/interview-rounds' },
          { title: 'Interviews', icon: FaUserTie, path: '/admin/hrm/recruitment/interviews' },
          { title: 'Interview Feedback', icon: FaUserTie, path: '/admin/hrm/recruitment/interview-feedback' },
          { title: 'Assessments', icon: FaUserTie, path: '/admin/hrm/recruitment/assessments' },
          { title: 'Offer Templates', icon: FaUserTie, path: '/admin/hrm/recruitment/offer-templates' },
          { title: 'Offers', icon: FaUserTie, path: '/admin/hrm/recruitment/offers' },
          { title: 'Onboarding Checklists', icon: FaUserTie, path: '/admin/hrm/recruitment/onboarding-checklists' },
          { title: 'Checklist Items', icon: FaUserTie, path: '/admin/hrm/recruitment/checklist-items' },
          { title: 'Candidate Onboarding', icon: FaUserTie, path: '/admin/hrm/recruitment/candidate-onboarding' },
        ],
      },
      {
        title: 'Contract Management',
        icon: FaUserTie,
        children: [
          { title: 'Contract Types', icon: FaUserTie, path: '/admin/hrm/contract-management/contract-types' },
          { title: 'Employee Contracts', icon: FaUserTie, path: '/admin/hrm/contract-management/employee-contracts' },
          { title: 'Contract Renewals', icon: FaUserTie, path: '/admin/hrm/contract-management/contract-renewals' },
          { title: 'Contract Templates', icon: FaUserTie, path: '/admin/hrm/contract-management/contract-templates' },
        ],
      },
      {
        title: 'Document Management',
        icon: FaUserTie,
        children: [
          { title: 'Document Categories', icon: FaUserTie, path: '/admin/hrm/document-management/document-categories' },
          { title: 'HR Documents', icon: FaUserTie, path: '/admin/hrm/document-management/hr-documents' },
          { title: 'Acknowledgments', icon: FaUserTie, path: '/admin/hrm/document-management/acknowledgments' },
          { title: 'Document Templates', icon: FaUserTie, path: '/admin/hrm/document-management/document-templates' },
        ],
      },
      {
        title: 'Meetings',
        icon: FaUserTie,
        children: [
          { title: 'Meeting Types', icon: FaUserTie, path: '/admin/hrm/meetings/meeting-types' },
          { title: 'Meeting Rooms', icon: FaUserTie, path: '/admin/hrm/meetings/meeting-rooms' },
          { title: 'Meetings', icon: FaUserTie, path: '/admin/hrm/meetings/meetings' },
          { title: 'Meeting Attendees', icon: FaUserTie, path: '/admin/hrm/meetings/meeting-attendees' },
          { title: 'Meeting Minutes', icon: FaUserTie, path: '/admin/hrm/meetings/meeting-minutes' },
          { title: 'Action Items', icon: FaUserTie, path: '/admin/hrm/meetings/action-items' },
        ],
      },
      {
        title: 'Calendar',
        icon: FaUserTie,
        children: [
          { title: 'Calendar Events', icon: FaUserTie, path: '/admin/hrm/calendar/calendar-events' },
        ],
      },
      {
        title: 'Media Library',
        icon: FaUserTie,
        children: [
          { title: 'Media Files', icon: FaUserTie, path: '/admin/hrm/media-library/media-files' },
        ],
      },
    ],
  },
  {
    title: 'Accounting',
    icon: FaBook,
    path: '/admin/accounting',
    requiredPermissions: ['view-financial-reports', 'view-ledgers', 'view-invoices']
  },
  {
    title: 'Projects',
    icon: FaBullseye,
    path: '/admin/projects'
  },
  // {
  //   title: 'Tasks',
  //   icon: FaBullseye,
  //   path: '/admin/tasks'
  // },
  {
    title: 'Commission',
    icon: FaMoneyBillWave,
    path: '/admin/crm/commission-settings'
  },
  {
    title: 'CRM',
    icon: FaHandshake,
    children: [
      { title: 'Dashboard', icon: FaTachometerAlt, path: '/admin/crm' },
      { title: 'Customers', icon: FaUsers, path: '/admin/crm/customers' },
      { title: 'Team Dashboard', icon: FaTachometerAlt, path: '/admin/crm/team-dashboard' },
      { title: 'Lead Assignment', icon: FaUsers, path: '/admin/crm/lead-assignment' },
      { title: 'Team Data Collection', icon: FaBullseye, path: '/admin/crm/team-data-collection' },
      { title: 'Commission Settings', icon: FaMoneyBillWave, path: '/admin/crm/commission-settings' },
      { title: 'Tier Management', icon: FaTachometerAlt, path: '/admin/crm/customer-tier-management' },
      { title: 'Pipeline', icon: FaBullseye, path: '/admin/crm/pipeline' },
      { title: 'Tasks', icon: FaBullseye, path: '/admin/crm/tasks' },
      { title: 'Analytics', icon: FaTachometerAlt, path: '/admin/crm/analytics' },
      { title: 'Quotes', icon: FaBook, path: '/admin/crm/quotes' },
      { title: 'Meetings', icon: FaUsers, path: '/admin/crm/meetings' },
      { title: 'Emails', icon: FaBell, path: '/admin/crm/emails' },
      /* PHASE 1 FEATURES - COMMENTED OUT
      { 
        title: 'Phase 1 Features', 
        icon: FaCog, 
        children: [
          { title: 'Pipeline Settings', icon: FaCog, path: '/admin/crm/pipeline-settings' },
          { title: 'Activity Templates', icon: FaBullseye, path: '/admin/crm/activity-templates' },
          { title: 'Customer Segments', icon: FaUsers, path: '/admin/crm/segments' },
          { title: 'Email Templates', icon: FaBell, path: '/admin/crm/email-templates' },
          { title: 'Workflows', icon: FaCog, path: '/admin/crm/workflows' },
          { title: 'Quote Templates', icon: FaBook, path: '/admin/crm/quote-templates' },
          { title: 'Quote Approvals', icon: FaBook, path: '/admin/crm/quote-approvals' },
          { title: 'Sales Forecasts', icon: FaTachometerAlt, path: '/admin/crm/forecasts' },
        ]
      },
      END PHASE 1 FEATURES */
    ],
  },
  {
    title: 'Telephony',
    icon: FaPhone,
    children: [
      { title: 'Today Tasklist', icon: FaPhone, path: '/admin/telephony/today-tasklist' },
      { title: 'All Tasks', icon: FaList, path: '/admin/telephony/all-tasks' },
      { title: 'My Follow-ups', icon: FaPhone, path: '/admin/telephony/my-followups' },
      { title: 'PBX Call Logs', icon: FaPhone, path: '/admin/telephony/calls' },
      { title: 'Reports', icon: FaChartBar, path: '/admin/telephony/reports' },
      { title: 'Agent Dashboard', icon: FaPhone, path: '/admin/crm/agent-dashboard' },
    ],
  },
  {
    title: 'Support',
    icon: FaHeadset,
    path: '/admin/support',
    requiredPermissions: ['view-users', 'view-system-settings']
  },
  {
    title: 'Users',
    icon: FaUser,
    path: '/admin/users',
    requiredPermissions: ['view-users']
  },
  {
    title: 'Roles',
    icon: FaUsers,
    children: [
      { title: 'Manage Roles', icon: FaUsers, path: '/admin/roles', requiredPermissions: ['assign-roles'] },
      { title: 'Assign Roles', icon: FaUsers, path: '/admin/roles/assign', requiredPermissions: ['assign-roles'] },
      { title: 'Role Permissions', icon: FaUsers, path: '/admin/roles/permissions', requiredPermissions: ['assign-roles'] },
    ],
  },
  { title: 'Profile', icon: FaUser, path: '/admin/profile' },
  {
    title: 'Settings',
    icon: FaCog,
    requiredPermissions: ['manage-system-settings', 'view-system-settings'],
    children: [
      { title: 'Courier Configuration', icon: FaCog, path: '/admin/settings/courier-configuration' },
      { title: 'Printer Settings', icon: FaPrint, path: '/admin/settings/printer', requiredPermissions: ['manage-system-settings'] },
      { title: 'Manage Modules', icon: FaCog, path: '/admin/settings/manage-modules', requiredPermissions: ['manage-system-settings'] },
    ],
  },
];

const iconMap: Record<string, any> = {
  FaTachometerAlt,
  FaBoxes,
  FaShoppingCart,
  FaUsers,
  FaWarehouse,
  FaShoppingBag,
  FaUserTie,
  FaBook,
  FaBullseye,
  FaHandshake,
  FaHeadset,
  FaUser,
  FaCog,
  FaBell,
  FaChartBar,
  FaTags,
  FaGift,
  FaPhone,
  FaImage,
  FaPrint,
};

function iconFromKey(key?: string | null) {
  if (!key) return FaCog;
  return iconMap[String(key)] || FaCog;
}

function ensureManageModulesLink(items: MenuItem[]): MenuItem[] {
  const exists = (arr: MenuItem[]): boolean =>
    arr.some((x) => x.path === '/admin/settings/manage-modules' || (x.children ? exists(x.children) : false));
  if (exists(items)) return items;

  const cloned = items.map((x) => ({ ...x, children: x.children ? ensureManageModulesLink(x.children) : x.children }));
  const settings = cloned.find((x) => x.title === 'Settings');
  const manageModules: MenuItem = {
    title: 'Manage Modules',
    icon: FaCog,
    path: '/admin/settings/manage-modules',
    requiredPermissions: ['manage-system-settings'],
  };

  if (settings) {
    settings.children = [...(settings.children || []), manageModules];
    return cloned;
  }

  return [
    ...cloned,
    {
      title: 'Settings',
      icon: FaCog,
      requiredPermissions: ['manage-system-settings', 'view-system-settings'],
      children: [manageModules],
    },
  ];
}

function stripQuery(path: string) {
  return path.split('?')[0];
}

function isMenuPathMatch(menuPath: string, currentAsPath: string) {
  if (menuPath.includes('?')) {
    return menuPath === currentAsPath;
  }
  return stripQuery(menuPath) === stripQuery(currentAsPath);
}

function filterMenuItems(items: MenuItem[], hasAnyPermission: (slugs: string[]) => boolean, inheritedPermissions: string[] = []): MenuItem[] {
  const filtered: MenuItem[] = [];
  for (const item of items) {
    const effectivePermissions = item.requiredPermissions ?? inheritedPermissions;
    const isAllowed = hasAnyPermission(effectivePermissions);

    if (item.children && item.children.length > 0) {
      const nextChildren = filterMenuItems(item.children, hasAnyPermission, effectivePermissions);
      if (nextChildren.length > 0 && isAllowed) {
        filtered.push({ ...item, children: nextChildren });
      }
      continue;
    }

    if (isAllowed) {
      filtered.push(item);
    }
  }
  return filtered;
}

function findLeafByPath(items: MenuItem[], currentAsPath: string, inheritedPermissions: string[] = []): { item: MenuItem; required: string[] } | null {
  for (const item of items) {
    const effectivePermissions = item.requiredPermissions ?? inheritedPermissions;

    if (item.path && isMenuPathMatch(item.path, currentAsPath) && (!item.children || item.children.length === 0)) {
      return { item, required: effectivePermissions };
    }

    if (item.children) {
      const found = findLeafByPath(item.children, currentAsPath, effectivePermissions);
      if (found) return found;
    }
  }
  return null;
}

function flattenSingleChildMenus(items: MenuItem[]): MenuItem[] {
  return items.map((item) => {
    const children = item.children ? flattenSingleChildMenus(item.children) : undefined;

    // Special-case: If Users has only Manage Users, render as a single link like Customers.
    if (item.title === 'Users' && !item.path && children && children.length === 1 && children[0].path) {
      const only = children[0];
      return {
        ...item,
        path: only.path,
        requiredPermissions: (only.requiredPermissions && only.requiredPermissions.length > 0)
          ? only.requiredPermissions
          : item.requiredPermissions,
        children: undefined,
      };
    }

    return { ...item, ...(children ? { children } : {}) };
  });
}

function getPanelTitleFromRoleSlugs(roleSlugs: Set<string>): string {
  const has = (slug: string) => roleSlugs.has(slug);

  if (has('super-admin') || has('admin')) return 'Admin Panel';
  if (has('sales-team-leader') || has('sales-executive')) return 'Sales Panel';
  if (has('inventory-manager')) return 'Inventory Panel';
  if (has('purchase-manager')) return 'Purchase Panel';
  if (has('accounts')) return 'Accounts Panel';
  if (has('hr-manager') || has('recruiter')) return 'HR Panel';
  if (has('delivery-partner')) return 'Delivery Panel';
  if (has('brand-manager')) return 'Marketing Panel';

  return 'Admin Panel';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [dbMenuItems, setDbMenuItems] = useState<MenuItem[] | null>(null);
  const router = useRouter();
  const { user, roles, isLoading, hasAnyPermission, logout } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/settings/admin-menu', { params: { includeInactive: false } });
        const data = Array.isArray(res.data) ? res.data : [];
        if (cancelled) return;
        if (data.length === 0) {
          setDbMenuItems(null);
          return;
        }

        const mapNode = (n: any): MenuItem => {
          return {
            title: String(n.title || ''),
            icon: iconFromKey(n.icon),
            path: n.path || undefined,
            requiredPermissions: Array.isArray(n.requiredPermissions) ? n.requiredPermissions : [],
            children: Array.isArray(n.children) ? n.children.map(mapNode) : undefined,
          };
        };

        const mapped = data.map(mapNode);
        setDbMenuItems(ensureManageModulesLink(mapped));
      } catch {
        if (!cancelled) setDbMenuItems(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveMenuItems = useMemo(() => {
    const base = dbMenuItems && dbMenuItems.length > 0 ? dbMenuItems : menuItems;
    return flattenSingleChildMenus(ensureManageModulesLink(base));
  }, [dbMenuItems]);

  const panelTitle = useMemo(() => {
    const slugs = new Set<string>();
    (roles || []).forEach((r: any) => {
      if (r?.slug) slugs.add(String(r.slug));
    });
    if ((user as any)?.roleSlug) slugs.add(String((user as any).roleSlug));
    return getPanelTitleFromRoleSlugs(slugs);
  }, [roles, user]);

  const visibleMenuItems = useMemo(() => {
    return filterMenuItems(effectiveMenuItems, hasAnyPermission);
  }, [effectiveMenuItems, hasAnyPermission]);

  const currentAsPath = useMemo(() => router.asPath || router.pathname, [router.asPath, router.pathname]);
  const currentPath = useMemo(() => stripQuery(currentAsPath), [currentAsPath]);

  const routeRequirement = useMemo(() => {
    return findLeafByPath(effectiveMenuItems, currentAsPath);
  }, [currentAsPath, effectiveMenuItems]);

  const hasRouteAccess = useMemo(() => {
    if (!routeRequirement) return true;
    const required = routeRequirement.required;
    return hasAnyPermission(required);
  }, [hasAnyPermission, routeRequirement]);

  // Helper function to get all parent menu titles for a given path
  const getParentMenuTitles = (items: MenuItem[], currentPath: string, parents: string[] = []): string[] | null => {
    for (const item of items) {
      if (item.path && isMenuPathMatch(item.path, currentPath)) {
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
    const parentTitles = getParentMenuTitles(visibleMenuItems, currentAsPath);
    if (parentTitles && parentTitles.length > 0) {
      setExpandedMenus(parentTitles);
    }
  }, [currentAsPath, visibleMenuItems]);

  const toggleMenu = (title: string) => {
    setExpandedMenus(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleLogout = () => {
    logout();
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
            <img src="/trust-cart-logo-main.png" alt="TrustCart ERP" className="h-12 object-contain" />
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
          {visibleMenuItems.map((item) => (
            <MenuItem
              key={item.title}
              item={item}
              collapsed={sidebarCollapsed}
              expandedMenus={expandedMenus}
              onToggle={toggleMenu}
              currentPath={currentPath}
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
              <h2 className="text-2xl font-bold text-gray-800">{panelTitle}</h2>
            </div>
            <div className="flex items-center space-x-4">
              {/* <QuoteNotifications /> */} {/* DISABLED */}
              <span className="text-sm text-gray-700 font-medium">
                {isLoading ? 'Loading…' : (user?.email || user?.phone || 'User')}
              </span>
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
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {!hasRouteAccess ? (
            <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold text-gray-800">403 - Access denied</h1>
              <p className="text-gray-600 mt-2">Your role does not have permission to view this page.</p>
            </div>
          ) : (
            children
          )}
        </main>
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
  const isActive = item.path ? stripQuery(item.path) === stripQuery(currentPath) : false;
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
                                  grandchild.path && stripQuery(currentPath) === stripQuery(grandchild.path)
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                    : ''
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
                        child.path && stripQuery(currentPath) === stripQuery(child.path)
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                          : ''
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
