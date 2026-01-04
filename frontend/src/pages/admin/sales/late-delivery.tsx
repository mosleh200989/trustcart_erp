import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import FormInput from '@/components/admin/FormInput';
import { FaSearch } from 'react-icons/fa';
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
  courierStatus?: string | null;
  courier_status?: string | null;

  createdAt?: string;
  created_at?: string;
}

const INITIAL_FILTERS = {
  q: '',
  courierCompany: '',
  courierStatus: '',
  shippedFrom: '',
  shippedTo: '',
  status: '',
};

export default function AdminSalesLateDelivery() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
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
      const orderNumber = o.salesOrderNumber ?? o.sales_order_number ?? o.order_number ?? '';
      const customerName = o.customerName ?? o.customer_name ?? '';
      const customerPhone = o.customerPhone ?? o.customer_phone ?? '';
      const courierCompany = o.courierCompany ?? o.courier_company ?? '';
      const courierStatus = o.courierStatus ?? o.courier_status ?? '';
      const shippedAt = o.shippedAt ?? o.shipped_at ?? null;

      const q = normalize(filters.q);
      if (q) {
        const haystack = [o.id, orderNumber, customerName, customerPhone, courierCompany, courierStatus]
          .map((v) => normalize(v))
          .join(' ');
        if (!haystack.includes(q)) return false;
      }

      if (filters.status && normalize(o.status) !== normalize(filters.status)) return false;
      if (!includes(courierCompany, filters.courierCompany)) return false;
      if (!includes(courierStatus, filters.courierStatus)) return false;
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
      key: 'order',
      label: 'Order',
      render: (_: any, row: SalesOrder) => {
        const orderNumber = row.salesOrderNumber ?? row.sales_order_number ?? row.order_number ?? '-';
        const customer = row.customerName ?? row.customer_name ?? '-';
        const phone = row.customerPhone ?? row.customer_phone ?? '';
        const line2 = [customer, phone].filter(Boolean).join(' • ');
        return (
          <div>
            <div className="font-medium text-gray-900">{orderNumber}</div>
            <div className="text-xs text-gray-600">{line2}</div>
          </div>
        );
      },
    },
    {
      key: 'courier',
      label: 'Courier',
      render: (_: any, row: SalesOrder) => {
        const company = row.courierCompany ?? row.courier_company ?? '-';
        const status = row.courierStatus ?? row.courier_status ?? '-';
        return (
          <div>
            <div className="font-medium text-gray-900">{company}</div>
            <div className="text-xs text-gray-600">{status}</div>
          </div>
        );
      },
    },
    {
      key: 'shippedAt',
      label: 'Shipped',
      render: (_: any, row: SalesOrder) => {
        const v = row.shippedAt ?? row.shipped_at ?? '-';
        return String(v).slice(0, 19).replace('T', ' ');
      },
    },
    {
      key: 'status',
      label: 'Order Status',
      render: (value: string) => {
        const v = value ?? '-';
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              v === 'completed'
                ? 'bg-green-100 text-green-800'
                : v === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            {v}
          </span>
        );
      },
    },
  ];

  const activeFilterCount = Object.values(filters).filter((v) => String(v).trim() !== '').length;

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Late Delivery</h1>
            <p className="text-gray-600 mt-1">Orders shipped but not delivered within the SLA</p>
          </div>
        </div>

        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
              <div className="text-sm text-gray-600">
                Active: <span className="font-semibold">{activeFilterCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="q"
                    value={filters.q}
                    onChange={handleFilterChange}
                    placeholder="Search (order/customer/courier/status)"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <FormInput
                label="Order Status"
                name="status"
                type="select"
                value={filters.status}
                onChange={handleFilterChange}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />

              <FormInput label="Courier Company" name="courierCompany" value={filters.courierCompany} onChange={handleFilterChange} />
              <FormInput label="Courier Status" name="courierStatus" value={filters.courierStatus} onChange={handleFilterChange} />

              <FormInput label="Shipped From" name="shippedFrom" type="date" value={filters.shippedFrom} onChange={handleFilterChange} />
              <FormInput label="Shipped To" name="shippedTo" type="date" value={filters.shippedTo} onChange={handleFilterChange} />
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginated}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </AdminLayout>
  );
}
