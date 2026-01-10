import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

type ReportTab = 'overview' | 'sales' | 'customers' | 'products' | 'inventory' | 'marketing';

type SalesOrder = {
  id: number;
  status?: string;
  totalAmount?: number;
  total_amount?: number;
  orderDate?: string;
  order_date?: string;
  createdAt?: string;
  created_at?: string;
  customerName?: string | null;
  customer_name?: string | null;
  customerPhone?: string | null;
  customer_phone?: string | null;
  courierCompany?: string | null;
  courier_company?: string | null;
  courierOrderId?: string | null;
  courier_order_id?: string | null;
  courierStatus?: string | null;
  courier_status?: string | null;
  thankYouOfferAccepted?: boolean;
  thank_you_offer_accepted?: boolean;
};

type Customer = {
  id: string | number;
  name?: string | null;
  lastName?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  district?: string | null;
  city?: string | null;
  gender?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
};

type Product = {
  id: string | number;
  name?: string | null;
  name_en?: string | null;
  categoryId?: number | null;
  category_id?: number | null;
  base_price?: any;
  selling_price?: any;
  price?: any;
  status?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
};

const CHART_COLORS = [
  'var(--info)',
  'var(--success)',
  'var(--warning)',
  'var(--danger)',
  'var(--primary)',
  'var(--secondary)',
];

function weekdayLabel(dateKey: string): string {
  if (!dateKey) return 'unknown';
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function toKeyDate(value: any): string {
  if (!value) return '';
  const s = String(value);
  if (s.length >= 10) return s.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function safeNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clampTab(value: any): ReportTab {
  const v = String(value || '').toLowerCase().trim();
  if (v === 'sales') return 'sales';
  if (v === 'customers') return 'customers';
  if (v === 'products') return 'products';
  if (v === 'inventory') return 'inventory';
  if (v === 'marketing') return 'marketing';
  return 'overview';
}

export default function AdminReports() {
  const router = useRouter();

  const [tab, setTab] = useState<ReportTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    courierCompany: '',
    thankYouOfferAccepted: '',
  });

  useEffect(() => {
    setTab(clampTab(router.query.tab));
  }, [router.query.tab]);

  const setTabAndUrl = (next: ReportTab) => {
    setTab(next);
    router.replace(
      {
        pathname: '/admin/reports',
        query: { ...router.query, tab: next },
      },
      undefined,
      { shallow: true },
    );
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredSales = useMemo(() => {
    const fromKey = toKeyDate(filters.dateFrom);
    const toKey = toKeyDate(filters.dateTo);
    return sales.filter((o) => {
      const dateKey = toKeyDate(o.orderDate ?? o.order_date ?? o.createdAt ?? o.created_at);
      if (fromKey && (!dateKey || dateKey < fromKey)) return false;
      if (toKey && (!dateKey || dateKey > toKey)) return false;

      const status = (o.status || '').toLowerCase().trim();
      if (filters.status && status !== filters.status.toLowerCase().trim()) return false;

      const courierCompany = (o.courierCompany ?? o.courier_company ?? '').toString().toLowerCase().trim();
      if (filters.courierCompany && courierCompany !== filters.courierCompany.toLowerCase().trim()) return false;

      if (filters.thankYouOfferAccepted) {
        const accepted = o.thankYouOfferAccepted ?? o.thank_you_offer_accepted;
        if (filters.thankYouOfferAccepted === 'true' && accepted !== true) return false;
        if (filters.thankYouOfferAccepted === 'false' && accepted !== false) return false;
      }

      return true;
    });
  }, [sales, filters]);

  const kpis = useMemo(() => {
    const totalOrders = filteredSales.length;
    const revenue = filteredSales.reduce((sum, o) => sum + safeNumber(o.totalAmount ?? o.total_amount), 0);
    const avgOrder = totalOrders > 0 ? revenue / totalOrders : 0;

    const uniqueCustomers = new Set(
      filteredSales
        .map((o) => (o.customerPhone ?? o.customer_phone ?? '').toString().trim())
        .filter(Boolean),
    ).size;

    return {
      totalOrders,
      revenue,
      avgOrder,
      uniqueCustomers,
      totalCustomers: customers.length,
      totalProducts: products.length,
    };
  }, [filteredSales, customers.length, products.length]);

  const revenueByDay = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; orders: number }>();
    for (const o of filteredSales) {
      const date = toKeyDate(o.orderDate ?? o.order_date ?? o.createdAt ?? o.created_at);
      if (!date) continue;
      const prev = map.get(date) || { date, revenue: 0, orders: 0 };
      prev.revenue += safeNumber(o.totalAmount ?? o.total_amount);
      prev.orders += 1;
      map.set(date, prev);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  const avgOrderByDay = useMemo(() => {
    return revenueByDay.map((d) => ({
      date: d.date,
      avgOrder: d.orders > 0 ? d.revenue / d.orders : 0,
    }));
  }, [revenueByDay]);

  const statusDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of filteredSales) {
      const s = (o.status || 'unknown').toString().toLowerCase().trim() || 'unknown';
      map.set(s, (map.get(s) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSales]);

  const revenueByStatus = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; orders: number }>();
    for (const o of filteredSales) {
      const name = (o.status || 'unknown').toString().toLowerCase().trim() || 'unknown';
      const prev = map.get(name) || { name, revenue: 0, orders: 0 };
      prev.revenue += safeNumber(o.totalAmount ?? o.total_amount);
      prev.orders += 1;
      map.set(name, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const courierDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of filteredSales) {
      const c = (o.courierCompany ?? o.courier_company ?? '').toString().trim() || 'unknown';
      map.set(c, (map.get(c) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [filteredSales]);

  const ordersByWeekday = useMemo(() => {
    const order = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map = new Map<string, number>();
    for (const o of filteredSales) {
      const dateKey = toKeyDate(o.orderDate ?? o.order_date ?? o.createdAt ?? o.created_at);
      const name = weekdayLabel(dateKey);
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }, [filteredSales]);

  const topCustomersByRevenue = useMemo(() => {
    const map = new Map<string, { phone: string; revenue: number; orders: number }>();
    for (const o of filteredSales) {
      const phone = (o.customerPhone ?? o.customer_phone ?? '').toString().trim();
      if (!phone) continue;
      const prev = map.get(phone) || { phone, revenue: 0, orders: 0 };
      prev.revenue += safeNumber(o.totalAmount ?? o.total_amount);
      prev.orders += 1;
      map.set(phone, prev);
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);
  }, [filteredSales]);

  const thankYouOfferRate = useMemo(() => {
    const eligible = filteredSales.filter((o) => (o.thankYouOfferAccepted ?? o.thank_you_offer_accepted) != null);
    if (eligible.length === 0) return { accepted: 0, declined: 0, rate: 0 };
    const accepted = eligible.filter((o) => (o.thankYouOfferAccepted ?? o.thank_you_offer_accepted) === true).length;
    const declined = eligible.length - accepted;
    return { accepted, declined, rate: (accepted / eligible.length) * 100 };
  }, [filteredSales]);

  const thankYouOfferByDay = useMemo(() => {
    const map = new Map<string, { date: string; accepted: number; declined: number }>();
    for (const o of filteredSales) {
      const accepted = o.thankYouOfferAccepted ?? o.thank_you_offer_accepted;
      if (accepted == null) continue;
      const date = toKeyDate(o.orderDate ?? o.order_date ?? o.createdAt ?? o.created_at);
      if (!date) continue;
      const prev = map.get(date) || { date, accepted: 0, declined: 0 };
      if (accepted === true) prev.accepted += 1;
      else prev.declined += 1;
      map.set(date, prev);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  const customersByDistrict = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of customers) {
      const d = (c.district || '').toString().trim() || 'unknown';
      map.set(d, (map.get(d) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [customers]);

  const customersByGender = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of customers) {
      const g = (c.gender || '').toString().trim() || 'unknown';
      map.set(g, (map.get(g) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [customers]);

  const newCustomersByDay = useMemo(() => {
    const map = new Map<string, { date: string; customers: number }>();
    for (const c of customers) {
      const date = toKeyDate(c.createdAt ?? c.created_at);
      if (!date) continue;
      const prev = map.get(date) || { date, customers: 0 };
      prev.customers += 1;
      map.set(date, prev);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [customers]);

  const repeatCustomerStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of filteredSales) {
      const phone = (o.customerPhone ?? o.customer_phone ?? '').toString().trim();
      if (!phone) continue;
      map.set(phone, (map.get(phone) || 0) + 1);
    }
    const total = map.size;
    const repeat = Array.from(map.values()).filter((n) => n > 1).length;
    const rate = total > 0 ? (repeat / total) * 100 : 0;
    return { total, repeat, rate };
  }, [filteredSales]);

  const productsByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const s = (p.status || 'unknown').toString().trim() || 'unknown';
      map.set(s, (map.get(s) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  const newProductsByDay = useMemo(() => {
    const map = new Map<string, { date: string; products: number }>();
    for (const p of products) {
      const date = toKeyDate(p.createdAt ?? p.created_at);
      if (!date) continue;
      const prev = map.get(date) || { date, products: 0 };
      prev.products += 1;
      map.set(date, prev);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [products]);

  const productsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const id = String(p.categoryId ?? p.category_id ?? 'unknown');
      map.set(id, (map.get(id) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [products]);

  const productPriceBuckets = useMemo(() => {
    const buckets = [
      { name: '0-99', value: 0 },
      { name: '100-199', value: 0 },
      { name: '200-499', value: 0 },
      { name: '500-999', value: 0 },
      { name: '1000+', value: 0 },
    ];
    for (const p of products) {
      const price = safeNumber((p as any).selling_price ?? (p as any).base_price ?? (p as any).price);
      if (price < 100) buckets[0].value += 1;
      else if (price < 200) buckets[1].value += 1;
      else if (price < 500) buckets[2].value += 1;
      else if (price < 1000) buckets[3].value += 1;
      else buckets[4].value += 1;
    }
    return buckets;
  }, [products]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [salesRes, customersRes, productsRes] = await Promise.all([
          apiClient.get('/sales').catch(() => ({ data: [] })),
          apiClient.get('/customers').catch(() => ({ data: [] })),
          apiClient.get('/products').catch(() => ({ data: [] })),
        ]);

        setSales(Array.isArray((salesRes as any).data) ? (salesRes as any).data : []);
        setCustomers(Array.isArray((customersRes as any).data) ? (customersRes as any).data : []);
        setProducts(Array.isArray((productsRes as any).data) ? (productsRes as any).data : []);
      } catch (e) {
        console.error('Failed to load reports data:', e);
        setError('Failed to load reports data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const courierOptions = useMemo(() => {
    const set = new Set(
      sales
        .map((o) => (o.courierCompany ?? o.courier_company ?? '').toString().trim())
        .filter(Boolean),
    );
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [sales]);

  const statusOptions = useMemo(() => {
    const set = new Set(sales.map((o) => (o.status || '').toString().trim()).filter(Boolean));
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [sales]);

  const tabs: Array<{ id: ReportTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'sales', label: 'Sales' },
    { id: 'customers', label: 'Customers' },
    { id: 'products', label: 'Products' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'marketing', label: 'Marketing' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-600">Analytics and operational reports across sales, customers, products, inventory, and marketing.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTabAndUrl(t.id)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    tab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Courier Company</label>
                <select
                  name="courierCompany"
                  value={filters.courierCompany}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All</option>
                  {courierOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thank You Offer</label>
                <select
                  name="thankYouOfferAccepted"
                  value={filters.thankYouOfferAccepted}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All</option>
                  <option value="true">Accepted</option>
                  <option value="false">Not Accepted</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-700">Loading reports...</div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-6 text-red-700">{error}</div>
        ) : (
          <>
            {(tab === 'overview' || tab === 'sales' || tab === 'marketing') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-600">Orders</div>
                  <div className="text-2xl font-bold text-gray-800">{kpis.totalOrders}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-600">Revenue</div>
                  <div className="text-2xl font-bold text-gray-800">৳{kpis.revenue.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-600">Avg Order</div>
                  <div className="text-2xl font-bold text-gray-800">৳{kpis.avgOrder.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-600">Unique Customers (by phone)</div>
                  <div className="text-2xl font-bold text-gray-800">{kpis.uniqueCustomers}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-600">Customers (total)</div>
                  <div className="text-2xl font-bold text-gray-800">{kpis.totalCustomers}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-600">Products (total)</div>
                  <div className="text-2xl font-bold text-gray-800">{kpis.totalProducts}</div>
                </div>
              </div>
            )}

            {(tab === 'overview' || tab === 'sales') && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Revenue Over Time</h2>
                      <div className="text-sm text-gray-600">Filtered</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area type="monotone" dataKey="revenue" stroke="var(--info)" fill="var(--info)" fillOpacity={0.2} />
                          <Area type="monotone" dataKey="orders" stroke="var(--success)" fill="var(--success)" fillOpacity={0.15} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Orders by Status</h2>
                      <div className="text-sm text-gray-600">Filtered</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                            {statusDistribution.map((_, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-gray-800">Courier Company Mix (Top)</h2>
                    <div className="text-sm text-gray-600">Filtered</div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={courierDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Orders" fill="var(--info)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Revenue by Status</h2>
                      <div className="text-sm text-gray-600">Filtered</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueByStatus}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue" fill="var(--success)" />
                          <Bar dataKey="orders" name="Orders" fill="var(--warning)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Avg Order Value Over Time</h2>
                      <div className="text-sm text-gray-600">Filtered</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={avgOrderByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="avgOrder" name="Avg Order" stroke="var(--primary)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Orders by Weekday</h2>
                      <div className="text-sm text-gray-600">Filtered</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersByWeekday}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Orders" fill="var(--secondary)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Top Customers by Revenue</h2>
                      <div className="text-sm text-gray-600">Filtered</div>
                    </div>
                    <div className="overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="py-2 pr-4">Phone</th>
                            <th className="py-2 pr-4">Orders</th>
                            <th className="py-2 pr-4">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topCustomersByRevenue.map((c) => (
                            <tr key={c.phone} className="border-t">
                              <td className="py-2 pr-4">{c.phone}</td>
                              <td className="py-2 pr-4">{c.orders}</td>
                              <td className="py-2 pr-4">৳{c.revenue.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Filtered Sales (Sample Table)</h2>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-2 pr-4">ID</th>
                          <th className="py-2 pr-4">Customer</th>
                          <th className="py-2 pr-4">Phone</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4">Courier ID</th>
                          <th className="py-2 pr-4">Courier</th>
                          <th className="py-2 pr-4">Amount</th>
                          <th className="py-2 pr-4">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSales.slice(0, 20).map((o) => {
                          const amount = safeNumber(o.totalAmount ?? o.total_amount);
                          const date = toKeyDate(o.orderDate ?? o.order_date ?? o.createdAt ?? o.created_at);
                          const customer = (o.customerName ?? o.customer_name ?? '').toString().trim() || '-';
                          const phone = (o.customerPhone ?? o.customer_phone ?? '').toString().trim() || '-';
                          const courierId = (o.courierOrderId ?? o.courier_order_id ?? '').toString().trim() || '-';
                          const courier = (o.courierCompany ?? o.courier_company ?? '').toString().trim() || '-';
                          return (
                            <tr key={o.id} className="border-t">
                              <td className="py-2 pr-4">{o.id}</td>
                              <td className="py-2 pr-4">{customer}</td>
                              <td className="py-2 pr-4">{phone}</td>
                              <td className="py-2 pr-4">{o.status || '-'}</td>
                              <td className="py-2 pr-4">{courierId}</td>
                              <td className="py-2 pr-4">{courier}</td>
                              <td className="py-2 pr-4">৳{amount.toFixed(2)}</td>
                              <td className="py-2 pr-4">{date || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {tab === 'customers' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-600">Repeat Customers (filtered)</div>
                    <div className="text-2xl font-bold text-gray-800">{repeatCustomerStats.repeat}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-600">Unique Customers (filtered)</div>
                    <div className="text-2xl font-bold text-gray-800">{repeatCustomerStats.total}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-600">Repeat Rate (filtered)</div>
                    <div className="text-2xl font-bold text-gray-800">{repeatCustomerStats.rate.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">New Customers Over Time</h2>
                      <div className="text-sm text-gray-600">All customers</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={newCustomersByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="customers" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Customers by Gender</h2>
                      <div className="text-sm text-gray-600">All customers</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={customersByGender} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                            {customersByGender.map((_, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-gray-800">Customers by District (Top)</h2>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customersByDistrict}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Customers" fill="var(--success)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Customer Directory (Sample)</h2>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-2 pr-4">ID</th>
                          <th className="py-2 pr-4">Name</th>
                          <th className="py-2 pr-4">Phone</th>
                          <th className="py-2 pr-4">Email</th>
                          <th className="py-2 pr-4">District</th>
                          <th className="py-2 pr-4">City</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.slice(0, 25).map((c) => {
                          const name = `${c.name || ''} ${(c.lastName ?? c.last_name ?? '') || ''}`.trim() || '-';
                          return (
                            <tr key={String(c.id)} className="border-t">
                              <td className="py-2 pr-4">{String(c.id)}</td>
                              <td className="py-2 pr-4">{name}</td>
                              <td className="py-2 pr-4">{c.phone || '-'}</td>
                              <td className="py-2 pr-4">{c.email || '-'}</td>
                              <td className="py-2 pr-4">{c.district || '-'}</td>
                              <td className="py-2 pr-4">{c.city || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {tab === 'products' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">New Products Over Time</h2>
                      <div className="text-sm text-gray-600">All products</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={newProductsByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="products" stroke="var(--info)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Products by Category (Top)</h2>
                      <div className="text-sm text-gray-600">All products</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={productsByCategory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Products" fill="var(--secondary)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Products by Status</h2>
                      <div className="text-sm text-gray-600">All products</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={productsByStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                            {productsByStatus.map((_, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Price Distribution</h2>
                      <div className="text-sm text-gray-600">All products</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={productPriceBuckets}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Products" fill="var(--warning)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Products (Sample)</h2>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-2 pr-4">ID</th>
                          <th className="py-2 pr-4">Name</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4">Price</th>
                          <th className="py-2 pr-4">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.slice(0, 30).map((p) => {
                          const name = (p.name_en ?? p.name ?? '').toString().trim() || '-';
                          const price = safeNumber((p as any).selling_price ?? (p as any).base_price ?? (p as any).price);
                          const created = toKeyDate(p.createdAt ?? p.created_at);
                          return (
                            <tr key={String(p.id)} className="border-t">
                              <td className="py-2 pr-4">{String(p.id)}</td>
                              <td className="py-2 pr-4">{name}</td>
                              <td className="py-2 pr-4">{(p.status || 'unknown') as any}</td>
                              <td className="py-2 pr-4">৳{price.toFixed(2)}</td>
                              <td className="py-2 pr-4">{created || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {tab === 'inventory' && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">Inventory Reports</h2>
                  <p className="text-gray-600">
                    Inventory reporting depends on the available backend endpoints. This section is ready for expansion with stock movement, low-stock,
                    expiry, and purchase-to-sale lead time reports.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">Suggested Inventory Reports (Placeholder)</h2>
                  <ul className="list-disc pl-5 text-gray-700 space-y-1">
                    <li>Low stock items</li>
                    <li>Out of stock items</li>
                    <li>Slow moving products (by recent order frequency)</li>
                    <li>Stock value estimate (requires cost fields)</li>
                    <li>Receiving vs dispatch trend</li>
                  </ul>
                </div>
              </>
            )}

            {tab === 'marketing' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Thank You Offer Acceptance</h2>
                      <div className="text-sm text-gray-600">Filtered</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Accepted', value: thankYouOfferRate.accepted },
                              { name: 'Not Accepted', value: thankYouOfferRate.declined },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={2}
                          >
                            <Cell fill="var(--success)" />
                            <Cell fill="var(--danger)" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      Acceptance rate: <span className="font-semibold">{thankYouOfferRate.rate.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-800">Revenue vs Orders (Trend)</h2>
                      <div className="text-sm text-gray-600">Filtered</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke="var(--info)" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="orders" stroke="var(--warning)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-gray-800">Thank You Offer Trend (By Day)</h2>
                    <div className="text-sm text-gray-600">Filtered</div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={thankYouOfferByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="accepted" stroke="var(--success)" fill="var(--success)" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="declined" stroke="var(--danger)" fill="var(--danger)" fillOpacity={0.12} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Operational Marketing Signals (Based on Orders)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-sm text-gray-600">Orders With Customer Phone</div>
                      <div className="text-2xl font-bold text-gray-800">
                        {filteredSales.filter((o) => String(o.customerPhone ?? o.customer_phone ?? '').trim() !== '').length}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-sm text-gray-600">Orders With Courier ID</div>
                      <div className="text-2xl font-bold text-gray-800">
                        {filteredSales.filter((o) => String(o.courierOrderId ?? o.courier_order_id ?? '').trim() !== '').length}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-sm text-gray-600">Orders With Courier Company</div>
                      <div className="text-2xl font-bold text-gray-800">
                        {filteredSales.filter((o) => String(o.courierCompany ?? o.courier_company ?? '').trim() !== '').length}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
