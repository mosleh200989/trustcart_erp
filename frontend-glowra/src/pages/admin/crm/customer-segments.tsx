import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import Pagination from '@/components/admin/Pagination';
import apiClient from '@/services/api';
import { useRouter } from 'next/router';
import { FaSearch, FaUsers, FaGlobe, FaExchangeAlt, FaEye } from 'react-icons/fa';
import { useToast } from '@/contexts/ToastContext';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';

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
  latestOrderId: number | null;
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
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

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

  const handleViewOrder = (customerId: number, latestOrderId: number | null) => {
    if (!latestOrderId) {
      toast.error('No orders found for this customer');
      return;
    }
    setSelectedOrderId(latestOrderId);
    setShowOrderModal(true);
  };

  return (
    <AdminLayout>
      <div className="px-2 sm:px-0">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Customer Segments</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Categorize customers by order source — new (SO-), legacy (LEG-), or converted (both)
          </p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const colors = tabColorMap[tab.color];
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 rounded-lg border-2 transition-all text-left ${
                  isActive
                    ? `${colors.bg} ${colors.border} ${colors.text}`
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{tab.label}</div>
                  <div className="text-xs opacity-75 truncate hidden sm:block">{tab.description}</div>
                </div>
                <span
                  className={`text-sm font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full flex-shrink-0 ${
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 mb-4">
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
          <div className="flex items-center justify-between sm:justify-end gap-3">
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

        {/* Desktop Table (hidden on mobile) */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">SO</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">LEG</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Spent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
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
                        <div className="font-medium text-gray-900 text-sm">{c.name} {c.lastName || ''}</div>
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">{c.soCount}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">{c.legCount}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">{c.totalOrders}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">৳{Number(c.totalSpent || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.agentName || <span className="text-gray-400">Unassigned</span>}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleViewOrder(c.id, c.latestOrderId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <FaEye size={12} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Desktop Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>

        {/* Mobile Cards (hidden on desktop) */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-12 text-center text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            </div>
          ) : customers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-12 text-center text-gray-500">
              No customers found in this segment
            </div>
          ) : (
            customers.map((c) => (
              <div key={c.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {/* Name + ID */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{c.name} {c.lastName || ''}</div>
                    <div className="text-xs text-gray-400">#{c.id}</div>
                  </div>
                  <button
                    onClick={() => handleViewOrder(c.id, c.latestOrderId)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors flex-shrink-0"
                  >
                    <FaEye size={12} />
                    View Order
                  </button>
                </div>

                {/* Contact + Location */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <div className="text-xs text-gray-400">Phone</div>
                    <div className="text-gray-700">{c.phone || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Location</div>
                    <div className="text-gray-700">{[c.district, c.city].filter(Boolean).join(', ') || '-'}</div>
                  </div>
                </div>

                {/* Order Stats */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    SO: {c.soCount}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700">
                    LEG: {c.legCount}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    Total: {c.totalOrders}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                    ৳{Number(c.totalSpent || 0).toLocaleString()}
                  </span>
                  {c.agentName && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700">
                      {c.agentName}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {showOrderModal && selectedOrderId && (
          <AdminOrderDetailsModal
            orderId={selectedOrderId}
            onClose={() => {
              setShowOrderModal(false);
              setSelectedOrderId(null);
            }}
            onUpdate={() => {}}
          />
        )}
      </div>
    </AdminLayout>
  );
}
