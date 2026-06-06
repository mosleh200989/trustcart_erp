import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaBoxOpen, FaChartBar, FaDownload, FaSearch, FaSyncAlt, FaTimes } from 'react-icons/fa';

interface ProductOption {
  id: number;
  name_en?: string | null;
  name_bn?: string | null;
  sku?: string | null;
  product_code?: string | null;
  image_url?: string | null;
  status?: string | null;
}

interface CrossSellProductRow {
  productId: number | null;
  productName: string;
  slug: string | null;
  sku: string | null;
  imageUrl: string | null;
  totalOrders: number;
  totalQty: number;
  totalRevenue: number;
  attachRate: number;
  avgQtyPerOrder: number;
}

interface CrossSellAnalysisReport {
  selectedProduct: {
    id: number;
    name: string;
    nameBn: string | null;
    slug: string | null;
    sku: string | null;
    imageUrl: string | null;
  };
  summary: {
    selectedDeliveredOrders: number;
    crossSellOrders: number;
    crossSellQty: number;
    crossSellRevenue: number;
    attachRate: number;
  };
  products: CrossSellProductRow[];
}

const fmt = (value: number) => new Intl.NumberFormat('en-BD').format(Math.round(Number(value) || 0));
const money = (value: number) => `BDT ${fmt(value)}`;
const productLabel = (product: ProductOption) =>
  product.name_en || product.name_bn || product.sku || product.product_code || `Product #${product.id}`;

export default function CrossSellAnalysisPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [showProductResults, setShowProductResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<CrossSellAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchProducts = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setProductResults([]);
      setShowProductResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await apiClient.get(`/products/admin/search?q=${encodeURIComponent(q)}`);
      setProductResults(Array.isArray(res.data) ? res.data : []);
      setShowProductResults(true);
    } catch (err) {
      console.error('Failed to search products', err);
      setProductResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleProductQueryChange = (value: string) => {
    setProductQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchProducts(value), 250);
  };

  const fetchReport = useCallback(async () => {
    if (!selectedProduct?.id) {
      setData(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ productId: String(selectedProduct.id) });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await apiClient.get(`/sales/cross-sell-analysis?${params.toString()}`);
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load cross sell analysis');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedProduct?.id, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const sortedProducts = useMemo(
    () => [...(data?.products || [])].sort((a, b) => b.totalQty - a.totalQty || b.totalOrders - a.totalOrders),
    [data?.products],
  );

  const handleExportCSV = () => {
    if (!data || !sortedProducts.length) return;
    const headers = ['Cross Sell Product', 'SKU', 'Orders', 'Qty', 'Revenue', 'Attach Rate', 'Avg Qty Per Order'];
    const rows = sortedProducts.map((row) => [
      `"${row.productName.replace(/"/g, '""')}"`,
      `"${String(row.sku || '').replace(/"/g, '""')}"`,
      row.totalOrders,
      row.totalQty,
      row.totalRevenue,
      `${row.attachRate}%`,
      row.avgQtyPerOrder,
    ].join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cross-sell-analysis-${data.selectedProduct.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectProduct = (product: ProductOption) => {
    setSelectedProduct(product);
    setProductQuery(productLabel(product));
    setProductResults([]);
    setShowProductResults(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 md:text-3xl">
              <span className="rounded-lg bg-emerald-600 p-2 text-white"><FaChartBar /></span>
              Cross Sell Analysis
            </h1>
            <p className="mt-1 text-sm text-gray-500">Delivered cross-sell products sold together with a selected product.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchReport}
              disabled={!selectedProduct || loading}
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!sortedProducts.length}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaDownload /> Export CSV
            </button>
          </div>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-gray-700">Select Product</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={productQuery}
                  onChange={(e) => {
                    setSelectedProduct(null);
                    handleProductQueryChange(e.target.value);
                  }}
                  onFocus={() => productResults.length > 0 && setShowProductResults(true)}
                  placeholder="Search by product name or SKU..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                />
                {productQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductQuery('');
                      setSelectedProduct(null);
                      setProductResults([]);
                      setData(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              {showProductResults && (
                <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                  {searching && <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>}
                  {!searching && productResults.length === 0 && <div className="px-4 py-3 text-sm text-gray-500">No products found</div>}
                  {!searching && productResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectProduct(product)}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-emerald-50"
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-10 w-10 rounded-md border border-gray-200 object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400"><FaBoxOpen /></span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{productLabel(product)}</span>
                        <span className="block truncate text-xs text-gray-500">{product.sku || product.product_code || 'No SKU'}{product.status ? ` - ${product.status}` : ''}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </section>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {!selectedProduct && (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
            Select a product to see delivered cross-sell performance.
          </div>
        )}

        {selectedProduct && loading && !data && (
          <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500">
            Loading cross sell analysis...
          </div>
        )}

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Selected Delivered Orders" value={fmt(data.summary.selectedDeliveredOrders)} />
              <MetricCard label="Cross Sell Orders" value={fmt(data.summary.crossSellOrders)} />
              <MetricCard label="Cross Sell Qty" value={fmt(data.summary.crossSellQty)} />
              <MetricCard label="Cross Sell Revenue" value={money(data.summary.crossSellRevenue)} />
              <MetricCard label="Attach Rate" value={`${data.summary.attachRate}%`} />
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Cross-sell products with {data.selectedProduct.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">Only delivered orders are included.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Orders</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qty</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Revenue</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Attach Rate</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Avg Qty/Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {sortedProducts.map((row) => (
                      <tr key={`${row.productId || 'custom'}-${row.productName}`} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {row.imageUrl ? (
                              <img src={row.imageUrl} alt="" className="h-11 w-11 rounded-md border border-gray-200 object-cover" />
                            ) : (
                              <span className="flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400"><FaBoxOpen /></span>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-gray-900">{row.productName}</div>
                              <div className="text-xs text-gray-500">{row.sku || (row.productId ? `Product #${row.productId}` : 'Custom product')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">{fmt(row.totalOrders)}</td>
                        <td className="px-5 py-3 text-right font-medium text-emerald-700">{fmt(row.totalQty)}</td>
                        <td className="px-5 py-3 text-right text-gray-900">{money(row.totalRevenue)}</td>
                        <td className="px-5 py-3 text-right text-gray-900">{row.attachRate}%</td>
                        <td className="px-5 py-3 text-right text-gray-900">{row.avgQtyPerOrder}</td>
                      </tr>
                    ))}
                    {sortedProducts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                          No delivered cross-sell products found with this selected product.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
