import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Pagination from '@/components/admin/Pagination';
import apiClient from '@/services/api';
import { useRouter } from 'next/router';
import { FaSearch, FaUsers, FaGlobe, FaExchangeAlt, FaEye } from 'react-icons/fa';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

type TabType = 'new' | 'legacy' | 'mixed';

interface SegmentCustomer {
  id: number;
  name: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  district: string | null;
  city: string | null;
  status: string | null;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
  soCount: number;
  legCount: number;
  agentName: string | null;
}

const TABS: { key: TabType; label: string; icon: typeof FaUsers; color: string; description: string }[] = [
  {
    key: 'new',
    label: 'New Customers',
    icon: FaUsers,
    color: 'blue',
    description: 'Customers with only SO- orders (purchased directly from our website)',
  },
  {
    key: 'legacy',
    label: 'Legacy Customers',
    icon: FaGlobe,
    color: 'amber',
    description: 'Customers with only LEG- orders (imported from the previous website)',
  },
  {
    key: 'mixed',
    label: 'Converted Customers',
    icon: FaExchangeAlt,
    color: 'green',
    description: 'Customers with both SO- and LEG- orders (legacy customers who also ordered from us)',
  },
];

export default function CustomerSegmentsPage() {
  const toast = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [customers, setCustomers] = useState<SegmentCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [counts, setCounts] = useState({ newCount: 0, legacyCount: 0, mixedCount: 0 });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load counts on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/crm/customer-segments/counts');
        setCounts(res.data || { newCount: 0, legacyCount: 0, mixedCount: 0 });
      } catch {
        // silent
      }
    })();
  }, []);

  // Reset page on tab change
  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm('');
    setSearchDebounced('');
  }, [activeTab]);

  // Load customers
  useEffect(() => {
    loadCustomers();
  }, [activeTab, currentPage, itemsPerPage, searchDebounced]);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        type: activeTab,
        page: currentPage,
        limit: itemsPerPage,
      };
      if (searchDebounced) params.search = searchDebounced;

      const res = await apiClient.get('/crm/customer-segments', { params });
      const body = res.data;
      setCustomers(Array.isArray(body.data) ? body.data : []);
      setTotalCount(body.total || 0);
      setTotalPages(body.totalPages || 1);
    } catch (e) {
      console.error('Failed to load customer segments:', e);
      toast.error('Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, itemsPerPage, searchDebounced]);

  // Refresh counts after load
  useEffect(() => {
    if (!loading) {
      (async () => {
        try {
          const res = await apiClient.get('/crm/customer-segments/counts');
          setCounts(res.data || { newCount: 0, legacyCount: 0, mixedCount: 0 });
        } catch {}
      })();
    }
  }, [loading]);

  const tabCountMap: Record<TabType, number> = {
    new: counts.newCount,
    legacy: counts.legacyCount,
    mixed: counts.mixedCount,
  };

  const tabColorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-500',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-700',
    },
  };

  const activeTabInfo = TABS.find((t) => t.key === activeTab)!;

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Customer Segments</h1>
          <p className="text-gray-600 mt-1">
            Categorize customers by their order source — new (SO-), legacy (LEG-), or converted (both)
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const colors = tabColorMap[tab.color];
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center gap-3 px-5 py-4 rounded-lg border-2 transition-all text-left ${
                  isActive
                    ? `${colors.bg} ${colors.border} ${colors.text}`
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{tab.label}</div>
                  <div className="text-xs opacity-75 truncate">{tab.description}</div>
                </div>
                <span
                  className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                    isActive ? colors.badge : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tabCountMap[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Page Size */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="relative w-full sm:w-96">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {totalCount} customer{totalCount !== 1 ? 's' : ''}
            </span>
            <PageSizeSelector
              value={itemsPerPage}
              onChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    SO Orders
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    LEG Orders
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total Orders
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      No customers found in this segment
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">
                          {c.name} {c.lastName || ''}
                        </div>
                        <div className="text-xs text-gray-400">#{c.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">{c.phone || '-'}</div>
                        <div className="text-xs text-gray-400">{c.email || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {[c.district, c.city].filter(Boolean).join(', ') || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {c.soCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                          {c.legCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                        {c.totalOrders}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        ৳{Number(c.totalSpent || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {c.agentName || <span className="text-gray-400">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/admin/crm/customer/${c.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <FaEye size={12} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
