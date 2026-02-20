import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import FormInput from '@/components/admin/FormInput';
import { FaSearch, FaFilter, FaExclamationTriangle, FaShoppingCart, FaGlobe, FaCheckCircle, FaTimesCircle, FaRedo, FaEye, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import apiClient from '@/services/api';

interface IncompleteOrder {
  id: number;
  customerId?: number | null;
  customer_id?: number | null;
  sessionId?: string | null;
  session_id?: string | null;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  address?: string | null;
  note?: string | null;
  cartData?: any;
  cart_data?: any;
  totalAmount?: number | string | null;
  total_amount?: number | string | null;
  abandonedStage?: string | null;
  abandoned_stage?: string | null;
  source?: string | null;
  landingPageId?: number | null;
  landing_page_id?: number | null;
  landingPageSlug?: string | null;
  landing_page_slug?: string | null;
  landingPageTitle?: string | null;
  landing_page_title?: string | null;
  deliveryZone?: string | null;
  delivery_zone?: string | null;
  deliveryCharge?: number | null;
  delivery_charge?: number | null;
  convertedToOrder?: boolean;
  converted_to_order?: boolean;
  contactedDone?: boolean;
  contacted_done?: boolean;
  recoveryEmailSent?: boolean;
  recovery_email_sent?: boolean;
  recoverySmsSent?: boolean;
  recovery_sms_sent?: boolean;
  recovered?: boolean;
  recoveredOrderId?: number | null;
  recovered_order_id?: number | null;
  referrerUrl?: string | null;
  referrer_url?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

interface LandingPageOption {
  slug: string;
  title: string;
}

interface ApiResponse {
  data: IncompleteOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    totalAll: number;
    landingPageCount: number;
    notConvertedCount: number;
  };
  landingPages: LandingPageOption[];
}

const INITIAL_FILTERS = {
  q: '',
  source: '',
  landingPageSlug: '',
  abandonedStage: '',
  recovered: '',
  convertedToOrder: '',
  createdFrom: '',
  createdTo: '',
};

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  form_started: { label: 'Form Started', color: 'bg-gray-100 text-gray-700' },
  name_entered: { label: 'Name Entered', color: 'bg-blue-100 text-blue-700' },
  phone_entered: { label: 'Phone Entered', color: 'bg-indigo-100 text-indigo-700' },
  form_filled: { label: 'Form Filled', color: 'bg-yellow-100 text-yellow-800' },
  product_changed: { label: 'Product Changed', color: 'bg-purple-100 text-purple-700' },
  cart: { label: 'Cart', color: 'bg-orange-100 text-orange-700' },
  checkout: { label: 'Checkout', color: 'bg-amber-100 text-amber-700' },
  payment: { label: 'Payment', color: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
};

export default function AdminSalesIncompleteOrders() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showFilters, setShowFilters] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.source) params.set('source', filters.source);
      if (filters.landingPageSlug) params.set('landingPageSlug', filters.landingPageSlug);
      if (filters.abandonedStage) params.set('abandonedStage', filters.abandonedStage);
      if (filters.recovered) params.set('recovered', filters.recovered);
      if (filters.convertedToOrder) params.set('convertedToOrder', filters.convertedToOrder);
      if (filters.createdFrom) params.set('createdFrom', filters.createdFrom);
      if (filters.createdTo) params.set('createdTo', filters.createdTo);
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));

      const res = await apiClient.get(`/lead-management/incomplete-order?${params.toString()}`);
      setResponse(res.data);
    } catch (e) {
      console.error('Failed to load incomplete orders:', e);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, itemsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const rows = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const stats = response?.stats || { totalAll: 0, landingPageCount: 0, notConvertedCount: 0 };
  const landingPages = response?.landingPages || [];

  const getVal = <T,>(row: IncompleteOrder, camel: keyof IncompleteOrder, snake: keyof IncompleteOrder, fallback?: T): T => {
    return (row[camel] ?? row[snake] ?? fallback) as T;
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (_: any, row: IncompleteOrder) => (
        <span className="text-sm font-mono text-gray-500">#{row.id}</span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (_: any, row: IncompleteOrder) => {
        const name = row.name || '-';
        const phone = row.phone || '';
        const address = row.address || '';
        return (
          <div className="min-w-[180px]">
            <div className="font-semibold text-gray-900">{name}</div>
            {phone && (
              <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                <FaPhone className="text-[10px]" /> {phone}
              </div>
            )}
            {address && (
              <div className="flex items-start gap-1 text-xs text-gray-500 mt-0.5 max-w-[220px]">
                <FaMapMarkerAlt className="text-[10px] mt-0.5 flex-shrink-0" />
                <span className="truncate">{address}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'source',
      label: 'Source',
      render: (_: any, row: IncompleteOrder) => {
        const source = row.source || 'website';
        const lpTitle = getVal<string>(row, 'landingPageTitle', 'landing_page_title' as any, '');
        const lpSlug = getVal<string>(row, 'landingPageSlug', 'landing_page_slug' as any, '');
        if (source === 'landing_page') {
          return (
            <div className="min-w-[120px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                <FaGlobe className="text-[10px]" /> Landing Page
              </span>
              {(lpTitle || lpSlug) && (
                <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]" title={lpTitle || lpSlug}>
                  {lpTitle || lpSlug}
                </div>
              )}
            </div>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <FaShoppingCart className="text-[10px]" /> {source || 'Website'}
          </span>
        );
      },
    },
    {
      key: 'abandonedStage',
      label: 'Stage',
      render: (_: any, row: IncompleteOrder) => {
        const stage = getVal<string>(row, 'abandonedStage', 'abandoned_stage' as any, '');
        const info = STAGE_LABELS[stage] || { label: stage || '-', color: 'bg-gray-100 text-gray-600' };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${info.color}`}>
            {info.label}
          </span>
        );
      },
    },
    {
      key: 'products',
      label: 'Products',
      render: (_: any, row: IncompleteOrder) => {
        const cart = getVal<any>(row, 'cartData', 'cart_data' as any, null);
        if (!cart || !Array.isArray(cart) || cart.length === 0) return <span className="text-gray-400 text-sm">-</span>;
        return (
          <div className="min-w-[140px]">
            {cart.slice(0, 2).map((item: any, idx: number) => (
              <div key={idx} className="text-xs text-gray-700">
                {item.name || item.product_name || 'Product'} &times; {item.quantity || 1}
              </div>
            ))}
            {cart.length > 2 && (
              <div className="text-xs text-gray-400">+{cart.length - 2} more</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      render: (_: any, row: IncompleteOrder) => {
        const amt = getVal<any>(row, 'totalAmount', 'total_amount' as any, null);
        const n = amt == null ? 0 : Number(amt);
        return (
          <span className="font-semibold text-gray-800">
            &#2547;{Number.isFinite(n) ? n.toLocaleString() : '0'}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, row: IncompleteOrder) => {
        const converted = getVal<boolean>(row, 'convertedToOrder', 'converted_to_order' as any, false);
        const recovered = row.recovered ?? false;
        if (converted || recovered) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              <FaCheckCircle className="text-[10px]" /> Converted
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <FaTimesCircle className="text-[10px]" /> Abandoned
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (_: any, row: IncompleteOrder) => {
        const v = getVal<string>(row, 'createdAt', 'created_at' as any, '');
        if (!v) return <span className="text-gray-400">-</span>;
        const d = new Date(v);
        return (
          <div className="text-sm whitespace-nowrap">
            <div className="font-medium text-gray-800">{d.toLocaleDateString('en-GB')}</div>
            <div className="text-xs text-gray-500">{d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (_: any, row: IncompleteOrder) => {
        const isDone = row.contactedDone ?? row.contacted_done ?? false;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                try {
                  await apiClient.put(`/lead-management/incomplete-order/${row.id}/toggle-done`);
                  load();
                } catch (e) { console.error(e); }
              }}
              className={`p-2 rounded-lg transition-colors ${
                isDone
                  ? 'text-green-600 bg-green-50 hover:bg-green-100'
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              }`}
              title={isDone ? 'Contacted / Done' : 'Mark as Done'}
            >
              <FaCheckCircle />
            </button>
            <button
              onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View Details"
            >
              <FaEye />
            </button>
          </div>
        );
      },
    },
  ];

  const activeFilterCount = Object.values(filters).filter((v) => String(v).trim() !== '').length;

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Incomplete Orders</h1>
            <p className="text-sm text-gray-500 mt-0.5">Landing page form submissions that didn&apos;t convert to orders</p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FaRedo className="text-xs" /> Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <FaShoppingCart className="text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.totalAll}</div>
                <div className="text-xs text-gray-500">Total Incomplete</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <FaGlobe className="text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.landingPageCount}</div>
                <div className="text-xs text-gray-500">From Landing Pages</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.notConvertedCount}</div>
                <div className="text-xs text-gray-500">Not Converted</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-t-xl transition-colors"
            onClick={() => setShowFilters(!showFilters)}
          >
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-500 text-sm" />
              <span className="font-semibold text-gray-700">Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); resetFilters(); }}
                  className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Clear All
                </button>
              )}
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {showFilters && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-4">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="q"
                      value={filters.q}
                      onChange={handleFilterChange}
                      placeholder="Search by name, phone, email, address, landing page..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Source */}
                <FormInput
                  label="Source"
                  name="source"
                  type="select"
                  value={filters.source}
                  onChange={handleFilterChange}
                  options={[
                    { value: 'landing_page', label: 'Landing Page' },
                    { value: 'website', label: 'Website' },
                    { value: 'checkout', label: 'Checkout' },
                  ]}
                />

                {/* Landing Page */}
                <FormInput
                  label="Landing Page"
                  name="landingPageSlug"
                  type="select"
                  value={filters.landingPageSlug}
                  onChange={handleFilterChange}
                  options={landingPages.map((lp) => ({
                    value: lp.slug,
                    label: lp.title || lp.slug,
                  }))}
                />

                {/* Stage */}
                <FormInput
                  label="Abandoned Stage"
                  name="abandonedStage"
                  type="select"
                  value={filters.abandonedStage}
                  onChange={handleFilterChange}
                  options={[
                    { value: 'form_started', label: 'Form Started' },
                    { value: 'name_entered', label: 'Name Entered' },
                    { value: 'phone_entered', label: 'Phone Entered' },
                    { value: 'form_filled', label: 'Form Filled' },
                    { value: 'product_changed', label: 'Product Changed' },
                    { value: 'cart', label: 'Cart' },
                    { value: 'checkout', label: 'Checkout' },
                    { value: 'payment', label: 'Payment' },
                  ]}
                />

                {/* Converted */}
                <FormInput
                  label="Conversion"
                  name="convertedToOrder"
                  type="select"
                  value={filters.convertedToOrder}
                  onChange={handleFilterChange}
                  options={[
                    { value: 'false', label: 'Not Converted' },
                    { value: 'true', label: 'Converted' },
                  ]}
                />

                {/* Date Range */}
                <FormInput label="Date From" name="createdFrom" type="date" value={filters.createdFrom} onChange={handleFilterChange} />
                <FormInput label="Date To" name="createdTo" type="date" value={filters.createdTo} onChange={handleFilterChange} />
              </div>
            </div>
          )}
        </div>

        {/* Results header */}
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm text-gray-600">
            {response ? (
              <>Showing <span className="font-semibold">{rows.length}</span> of <span className="font-semibold">{response.total}</span> results</>
            ) : null}
          </div>
          <PageSizeSelector
            value={itemsPerPage}
            onChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <DataTable
            columns={columns}
            data={rows}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Expanded Row Detail Modal */}
        {expandedRow && (() => {
          const row = rows.find((r) => r.id === expandedRow);
          if (!row) return null;
          const cart = getVal<any>(row, 'cartData', 'cart_data' as any, null);
          const converted = getVal<boolean>(row, 'convertedToOrder', 'converted_to_order' as any, false);

          return (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setExpandedRow(null)}>
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                  <h3 className="text-lg font-bold text-gray-800">Incomplete Order #{row.id}</h3>
                  <button
                    onClick={() => setExpandedRow(null)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    &#10005;
                  </button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  {/* Customer Info */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customer Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Name:</span> <span className="font-medium">{row.name || '-'}</span></div>
                      <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{row.phone || '-'}</span></div>
                      <div className="col-span-2"><span className="text-gray-500">Email:</span> <span className="font-medium">{row.email || '-'}</span></div>
                      <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{row.address || '-'}</span></div>
                      {row.note && <div className="col-span-2"><span className="text-gray-500">Note:</span> <span className="font-medium">{row.note}</span></div>}
                    </div>
                  </div>

                  {/* Source Info */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Source &amp; Tracking</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Source:</span> <span className="font-medium">{row.source || '-'}</span></div>
                      <div>
                        <span className="text-gray-500">Stage:</span>{' '}
                        <span className="font-medium">{(STAGE_LABELS[getVal(row, 'abandonedStage', 'abandoned_stage' as any, '')] || {}).label || getVal(row, 'abandonedStage', 'abandoned_stage' as any, '-')}</span>
                      </div>
                      {(getVal(row, 'landingPageTitle', 'landing_page_title' as any, '') || getVal(row, 'landingPageSlug', 'landing_page_slug' as any, '')) && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Landing Page:</span>{' '}
                          <span className="font-medium">{getVal(row, 'landingPageTitle', 'landing_page_title' as any, '') || getVal(row, 'landingPageSlug', 'landing_page_slug' as any, '')}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Delivery Zone:</span>{' '}
                        <span className="font-medium">{getVal(row, 'deliveryZone', 'delivery_zone' as any, '-')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>{' '}
                        {converted || row.recovered ? (
                          <span className="text-green-600 font-semibold">Converted</span>
                        ) : (
                          <span className="text-red-600 font-semibold">Abandoned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cart Products */}
                  {cart && Array.isArray(cart) && cart.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Products in Cart</h4>
                      <div className="space-y-2">
                        {cart.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5">
                            {item.image_url && (
                              <img src={item.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">{item.name || item.product_name}</div>
                              <div className="text-xs text-gray-500">Qty: {item.quantity || 1}</div>
                            </div>
                            <div className="text-sm font-semibold text-gray-700">
                              &#2547;{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-right text-sm font-bold text-gray-800">
                        Total: &#2547;{Number(getVal(row, 'totalAmount', 'total_amount' as any, 0)).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Timeline</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Created: {new Date(getVal(row, 'createdAt', 'created_at' as any, '')).toLocaleString('en-GB')}</div>
                      <div>Updated: {new Date(getVal(row, 'updatedAt', 'updated_at' as any, '')).toLocaleString('en-GB')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </AdminLayout>
  );
}