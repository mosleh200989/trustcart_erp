import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import FormInput from '@/components/admin/FormInput';
import { FaSearch } from 'react-icons/fa';
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
  cartData?: any;
  cart_data?: any;
  totalAmount?: number | string | null;
  total_amount?: number | string | null;
  abandonedStage?: string | null;
  abandoned_stage?: string | null;
  recoveryEmailSent?: boolean;
  recovery_email_sent?: boolean;
  recoverySmsSent?: boolean;
  recovery_sms_sent?: boolean;
  recovered?: boolean;
  recoveredOrderId?: number | null;
  recovered_order_id?: number | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

const INITIAL_FILTERS = {
  q: '',
  abandonedStage: '',
  recovered: '',
  createdFrom: '',
  createdTo: '',
};

export default function AdminSalesIncompleteOrders() {
  const [rows, setRows] = useState<IncompleteOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await apiClient.get('/lead-management/incomplete-order');
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load incomplete orders:', e);
      setRows([]);
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

    return rows.filter((r) => {
      const customerId = r.customerId ?? r.customer_id ?? null;
      const sessionId = r.sessionId ?? r.session_id ?? '';
      const name = r.name ?? '';
      const email = r.email ?? '';
      const phone = r.phone ?? '';
      const stage = r.abandonedStage ?? r.abandoned_stage ?? '';
      const recovered = r.recovered ?? false;
      const createdAt = r.createdAt ?? r.created_at ?? null;

      const q = normalize(filters.q);
      if (q) {
        const haystack = [r.id, customerId, sessionId, name, email, phone, stage]
          .map((v) => normalize(v))
          .join(' ');
        if (!haystack.includes(q)) return false;
      }

      if (filters.abandonedStage && normalize(stage) !== normalize(filters.abandonedStage)) return false;
      if (filters.recovered) {
        if (filters.recovered === 'true' && recovered !== true) return false;
        if (filters.recovered === 'false' && recovered !== false) return false;
      }

      if (!inDateRange(createdAt, filters.createdFrom, filters.createdTo)) return false;

      return true;
    });
  }, [rows, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'name',
      label: 'Customer',
      render: (_: any, row: IncompleteOrder) => {
        const name = row.name ?? '-';
        const phone = row.phone ?? '';
        const email = row.email ?? '';
        const line2 = [phone, email].filter(Boolean).join(' • ');
        return (
          <div>
            <div className="font-medium text-gray-900">{name}</div>
            {line2 ? <div className="text-xs text-gray-600">{line2}</div> : null}
          </div>
        );
      },
    },
    {
      key: 'abandonedStage',
      label: 'Stage',
      render: (_: any, row: IncompleteOrder) => row.abandonedStage ?? row.abandoned_stage ?? '-',
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      render: (_: any, row: IncompleteOrder) => {
        const amt = row.totalAmount ?? row.total_amount ?? null;
        const n = amt == null ? 0 : Number(amt);
        return `৳${Number.isFinite(n) ? n.toFixed(2) : '0.00'}`;
      },
    },
    {
      key: 'recovered',
      label: 'Recovered',
      render: (_: any, row: IncompleteOrder) => {
        const recovered = row.recovered ?? false;
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              recovered ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {recovered ? 'Yes' : 'No'}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (_: any, row: IncompleteOrder) => {
        const v = row.createdAt ?? row.created_at ?? '-';
        return String(v).slice(0, 19).replace('T', ' ');
      },
    },
  ];

  const activeFilterCount = Object.values(filters).filter((v) => String(v).trim() !== '').length;

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Incomplete Orders</h1>
            <p className="text-gray-600 mt-1">Abandoned carts / checkout not completed</p>
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

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="q"
                  value={filters.q}
                  onChange={handleFilterChange}
                  placeholder="Search (name/phone/email/session/stage)"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <FormInput
              label="Stage"
              name="abandonedStage"
              type="select"
              value={filters.abandonedStage}
              onChange={handleFilterChange}
              options={[
                { value: 'cart', label: 'Cart' },
                { value: 'checkout', label: 'Checkout' },
                { value: 'payment', label: 'Payment' },
              ]}
            />

            <FormInput
              label="Recovered"
              name="recovered"
              type="select"
              value={filters.recovered}
              onChange={handleFilterChange}
              options={[
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]}
            />

            <FormInput label="Created From" name="createdFrom" type="date" value={filters.createdFrom} onChange={handleFilterChange} />
            <FormInput label="Created To" name="createdTo" type="date" value={filters.createdTo} onChange={handleFilterChange} />
          </div>
        </div>

        <div className="mb-4 flex justify-end">
          <PageSizeSelector
            value={itemsPerPage}
            onChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
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
