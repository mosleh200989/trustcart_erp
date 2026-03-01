import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import { wrapCustomerName } from '@/utils/wrapCustomerName';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import FormInput from '@/components/admin/FormInput';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import { FaSearch, FaFilter, FaTimes, FaEye, FaStickyNote } from 'react-icons/fa';
import apiClient from '@/services/api';

interface SalesOrder {
  id: number;
  salesOrderNumber?: string;
  sales_order_number?: string;
  order_number?: string;

  customerName?: string | null;
  customer_name?: string | null;
  customerPhone?: string | null;
  customer_phone?: string | null;

  status?: string;

  shippedAt?: string | null;
  shipped_at?: string | null;
  deliveredAt?: string | null;
  delivered_at?: string | null;

  courierCompany?: string | null;
  courier_company?: string | null;
  courierOrderId?: string | null;
  courier_order_id?: string | null;

  notes?: string | null;
  courier_notes?: string | null;
  internal_notes?: string | null;
  rider_instructions?: string | null;

  items?: { productName: string | null; quantity: number }[];

  createdAt?: string;
  created_at?: string;
  order_date?: string;
  orderDate?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  printing: 'bg-cyan-100 text-cyan-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  hold: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800',
};

const STATUS_OPTIONS = [
  { value: 'processing', label: 'Processing' },
  { value: 'approved', label: 'Approved' },
  { value: 'sent', label: 'Sent' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'picked', label: 'Picked' },
  { value: 'hold', label: 'Hold' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'partial_delivered', label: 'Partial Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
];

const COURIER_COMPANY_OPTIONS = [
  { value: 'steadfast', label: 'Steadfast' },
  { value: 'pathao', label: 'Pathao' },
  { value: 'redx', label: 'RedX' },
  { value: 'paperfly', label: 'Paperfly' },
];

const INITIAL_FILTERS = {
  q: '',
  courierCompany: '',
  shippedFrom: '',
  shippedTo: '',
  status: '',
};

function formatDateTime(raw: any) {
  if (!raw) return { date: '-', time: '' };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { date: '-', time: '' };
  const date = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

function getDaysSinceShipped(shippedAt: any): number | null {
  if (!shippedAt) return null;
  const d = new Date(shippedAt);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function AdminSalesLateDelivery() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/sales/late-deliveries');
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load late deliveries:', e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const filtered = useMemo(() => {
    const normalize = (v: any) => (v ?? '').toString().toLowerCase().trim();
    const includes = (field: any, needle: string) => {
      const n = normalize(needle);
      if (!n) return true;
      return normalize(field).includes(n);
    };

    const dateKey = (v: any): string => {
      if (!v) return '';
      if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
      const s = String(v);
      if (s.length >= 10) return s.slice(0, 10);
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 10);
    };
    const inDateRange = (field: any, from: string, to: string) => {
      const fromKey = dateKey(from);
      const toKey = dateKey(to);
      if (!fromKey && !toKey) return true;
      const valueKey = dateKey(field);
      if (!valueKey) return false;
      const fromOk = fromKey ? valueKey >= fromKey : true;
      const toOk = toKey ? valueKey <= toKey : true;
      return fromOk && toOk;
    };

    return orders.filter((o) => {
      const customerName = o.customerName ?? o.customer_name ?? '';
      const customerPhone = o.customerPhone ?? o.customer_phone ?? '';
      const courierCompany = o.courierCompany ?? o.courier_company ?? '';
      const shippedAt = o.shippedAt ?? o.shipped_at ?? null;

      const q = normalize(filters.q);
      if (q) {
        const haystack = [o.id, customerName, customerPhone, courierCompany, o.status, o.notes, o.internal_notes]
          .map((v) => normalize(v))
          .join(' ');
        if (!haystack.includes(q)) return false;
      }

      if (filters.status && normalize(o.status) !== normalize(filters.status)) return false;
      if (!includes(courierCompany, filters.courierCompany)) return false;
      if (!inDateRange(shippedAt, filters.shippedFrom, filters.shippedTo)) return false;

      return true;
    });
  }, [orders, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'customer_name',
      label: 'Customer',
      render: (_: any, row: SalesOrder) => {
        return <span className="font-medium text-gray-900">{wrapCustomerName(row.customerName ?? row.customer_name)}</span>;
      },
    },
    {
      key: 'customer_phone',
      label: 'Phone',
      render: (_: any, row: SalesOrder) => {
        const phone = row.customerPhone ?? row.customer_phone ?? '-';
        return <span className="text-gray-700">{phone}</span>;
      },
    },
    {
      key: 'courier',
      label: 'Courier',
      render: (_: any, row: SalesOrder) => {
        const company = row.courierCompany ?? row.courier_company ?? '-';
        return (
          <div>
            <div className="font-medium text-gray-900">{company}</div>
          </div>
        );
      },
    },
    {
      key: 'shippedAt',
      label: 'Shipped Date & Time',
      render: (_: any, row: SalesOrder) => {
        const raw = row.shippedAt ?? row.shipped_at;
        const { date, time } = formatDateTime(raw);
        const days = getDaysSinceShipped(raw);
        return (
          <div>
            <div>{date}</div>
            <div className="text-xs text-gray-500">{time}</div>
            {days !== null && (
              <div className={`text-xs font-semibold mt-0.5 ${days > 5 ? 'text-red-600' : days > 3 ? 'text-orange-600' : 'text-yellow-600'}`}>
                {days} day{days !== 1 ? 's' : ''} ago
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'items',
      label: 'Products',
      render: (_: any, row: SalesOrder) => {
        const items = row.items ?? [];
        if (items.length === 0) return <span className="text-gray-400 text-xs">-</span>;
        return (
          <div className="max-w-[220px]">
            {items.slice(0, 3).map((item, i) => (
              <div key={i} className="text-xs text-gray-700 truncate" title={`${item.productName ?? 'Unknown'} x${item.quantity}`}>
                <span className="font-medium">{item.quantity}x</span>{' '}
                {item.productName ?? 'Unknown'}
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-xs text-blue-600 font-medium">+{items.length - 3} more</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (_: any, row: SalesOrder) => {
        const notes = row.notes || row.internal_notes || row.courier_notes || row.rider_instructions || '';
        if (!notes) return <span className="text-gray-400 text-xs">-</span>;
        return (
          <div className="max-w-[200px]" title={notes}>
            <div className="flex items-start gap-1">
              <FaStickyNote className="text-yellow-500 mt-0.5 flex-shrink-0" size={12} />
              <span className="text-xs text-gray-700 line-clamp-2">{notes}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Details',
      render: (_: any, row: SalesOrder) => (
        <button
          type="button"
          onClick={() => {
            setSelectedOrderId(row.id);
            setShowOrderDetails(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <FaEye size={12} />
          Details
        </button>
      ),
    },
  ];

  const activeFilterCount = Object.values(filters).filter((v) => String(v).trim() !== '').length;

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Late Delivery</h1>
            <p className="text-gray-600 mt-1">
              Orders shipped but not delivered within the SLA
              {!loading && <span className="ml-2 text-sm font-medium text-gray-500">({filtered.length} order{filtered.length !== 1 ? 's' : ''})</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FaFilter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-500" size={14} />
                <h2 className="text-sm font-semibold text-gray-700">Filter Orders</h2>
                {activeFilterCount > 0 && (
                  <span className="text-xs text-gray-500">({activeFilterCount} active)</span>
                )}
              </div>
              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FaTimes size={10} />
                Clear All
              </button>
            </div>

            <div className="p-5">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    name="q"
                    value={filters.q}
                    onChange={handleFilterChange}
                    placeholder="Search by customer name, phone, courier, status..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Filter grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormInput
                  label="Order Status"
                  name="status"
                  type="select"
                  value={filters.status}
                  onChange={handleFilterChange}
                  options={STATUS_OPTIONS}
                />
                <FormInput
                  label="Courier Company"
                  name="courierCompany"
                  type="select"
                  value={filters.courierCompany}
                  onChange={handleFilterChange}
                  options={COURIER_COMPANY_OPTIONS}
                />
                <FormInput label="Shipped From" name="shippedFrom" type="date" value={filters.shippedFrom} onChange={handleFilterChange} />
                <FormInput label="Shipped To" name="shippedTo" type="date" value={filters.shippedTo} onChange={handleFilterChange} />
              </div>
            </div>
          </div>
        )}

        {/* Page size */}
        <div className="mb-4 flex justify-end">
          <PageSizeSelector
            value={itemsPerPage}
            onChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={paginated}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrderId && (
          <AdminOrderDetailsModal
            orderId={selectedOrderId}
            onClose={() => {
              setShowOrderDetails(false);
              setSelectedOrderId(null);
            }}
            onUpdate={() => load()}
          />
        )}
      </div>
    </AdminLayout>
  );
}
