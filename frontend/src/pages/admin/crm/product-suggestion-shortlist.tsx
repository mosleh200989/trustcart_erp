import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaCheckCircle, FaPlus, FaSearch, FaTags, FaTimes, FaTrash } from 'react-icons/fa';

type Product = {
  id: number;
  name_en?: string | null;
  name_bn?: string | null;
  sku?: string | null;
  status?: string | null;
  image_url?: string | null;
  base_price?: number | string | null;
  sale_price?: number | string | null;
  size_variants?: any[] | string | null;
};

type ProductEntry = {
  key: string;
  productId: number;
  productName: string;
  variantName: string | null;
  label: string;
  sku?: string | null;
  status?: string | null;
  price?: number | null;
  imageUrl?: string | null;
};

type ShortlistItem = ProductEntry & {
  id: number;
  isActive: boolean;
  displayOrder: number;
};

const parseVariants = (raw: any[] | string | null | undefined) => {
  let variants = raw;
  if (typeof variants === 'string') {
    try {
      variants = JSON.parse(variants);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(variants)) return [];
  return variants.filter((variant) => variant && typeof variant.name === 'string' && variant.name.trim());
};

const money = (value?: number | string | null) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount > 0 ? `Tk ${amount.toFixed(2)}` : 'No price';
};

const imageSrc = (value?: string | null) => {
  const src = String(value || '').trim();
  if (!src) return '';
  if (/^https?:\/\//i.test(src) || src.startsWith('/')) return src;
  return `/assets/uploads/${src}`;
};

export default function ProductSuggestionShortlistPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, shortlistRes] = await Promise.all([
        apiClient.get('/products/admin/all'),
        apiClient.get('/products/admin/suggestion-shortlist'),
      ]);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setShortlist(Array.isArray(shortlistRes.data) ? shortlistRes.data.map((item: any) => ({
        id: Number(item.id),
        key: `${item.productId || item.product_id}::${item.variantName || item.variant_name || ''}`,
        productId: Number(item.productId || item.product_id),
        productName: item.name_en || item.name_bn || `Product #${item.productId || item.product_id}`,
        variantName: item.variantName || item.variant_name || null,
        label: item.suggestionOptionLabel || `${item.name_en || item.name_bn || `Product #${item.productId || item.product_id}`}${item.variantName || item.variant_name ? ` (${item.variantName || item.variant_name})` : ''}`,
        sku: item.sku,
        status: item.status,
        price: Number(item.sale_price || item.base_price || 0),
        imageUrl: imageSrc(item.image_url),
        isActive: item.isActive !== false && item.is_active !== false,
        displayOrder: Number(item.displayOrder ?? item.display_order ?? 0),
      })) : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load product suggestion shortlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const productEntries = useMemo<ProductEntry[]>(() => {
    const entries: ProductEntry[] = [];
    products.forEach((product) => {
      const productId = Number(product.id);
      if (!Number.isFinite(productId)) return;
      const productName = product.name_en || product.name_bn || `Product #${productId}`;
      entries.push({
        key: `${productId}::`,
        productId,
        productName,
        variantName: null,
        label: productName,
        sku: product.sku,
        status: product.status,
        price: Number(product.sale_price || product.base_price || 0),
        imageUrl: imageSrc(product.image_url),
      });
      parseVariants(product.size_variants).forEach((variant: any) => {
        const variantName = String(variant.name || '').trim();
        entries.push({
          key: `${productId}::${variantName}`,
          productId,
          productName,
          variantName,
          label: `${productName} (${variantName})`,
          sku: variant.sku_suffix ? `${product.sku || ''}-${variant.sku_suffix}` : product.sku,
          status: product.status,
          price: Number(variant.price || product.sale_price || product.base_price || 0),
          imageUrl: imageSrc(product.image_url),
        });
      });
    });
    return entries;
  }, [products]);

  const shortlistedKeys = useMemo(() => new Set(shortlist.map((item) => item.key)), [shortlist]);
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productEntries
      .filter((entry) => !shortlistedKeys.has(entry.key))
      .filter((entry) => !q || [entry.label, entry.sku, entry.status].some((value) => String(value || '').toLowerCase().includes(q)))
      .slice(0, 80);
  }, [productEntries, shortlistedKeys, search]);

  const addEntry = async (entry: ProductEntry) => {
    setSavingKey(entry.key);
    try {
      await apiClient.post('/products/admin/suggestion-shortlist', {
        productId: entry.productId,
        variantName: entry.variantName,
      });
      toast.success('Product added to suggestion shortlist');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to add product');
    } finally {
      setSavingKey(null);
    }
  };

  const toggleActive = async (item: ShortlistItem) => {
    setSavingKey(item.key);
    try {
      await apiClient.put(`/products/admin/suggestion-shortlist/${item.id}`, { isActive: !item.isActive });
      setShortlist((current) => current.map((row) => row.id === item.id ? { ...row, isActive: !item.isActive } : row));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update shortlist item');
    } finally {
      setSavingKey(null);
    }
  };

  const removeItem = async (item: ShortlistItem) => {
    if (!confirm(`Remove "${item.label}" from the product suggestion shortlist?`)) return;
    setSavingKey(item.key);
    try {
      await apiClient.delete(`/products/admin/suggestion-shortlist/${item.id}`);
      setShortlist((current) => current.filter((row) => row.id !== item.id));
      toast.success('Product removed from shortlist');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to remove product');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
            <FaTags className="text-indigo-600" /> Product Suggestion Shortlist
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Only active entries in this shortlist appear in the AdminSalesOrdersModal product suggestion dropdown.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-lg bg-white shadow">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold text-gray-900">Available Products & Variants</h2>
              <div className="relative mt-3">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product, variant, SKU..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
            <div className="max-h-[680px] overflow-y-auto p-4">
              {loading ? (
                <div className="py-12 text-center text-sm text-gray-500">Loading products...</div>
              ) : filteredEntries.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">No available entries found.</div>
              ) : (
                <div className="space-y-2">
                  {filteredEntries.map((entry) => (
                    <div key={entry.key} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-gray-50">
                        {entry.imageUrl ? <img src={entry.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-gray-900">{entry.label}</div>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500">
                          {entry.sku && <span>SKU: {entry.sku}</span>}
                          <span>{money(entry.price)}</span>
                          <span className={entry.status === 'active' ? 'text-green-700' : 'text-amber-700'}>{entry.status || 'unknown'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => addEntry(entry)}
                        disabled={savingKey === entry.key}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <FaPlus /> Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg bg-white shadow">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold text-gray-900">Current Shortlist</h2>
              <p className="mt-1 text-xs text-gray-500">{shortlist.filter((item) => item.isActive).length} active / {shortlist.length} total</p>
            </div>
            <div className="max-h-[760px] overflow-y-auto p-4">
              {loading ? (
                <div className="py-12 text-center text-sm text-gray-500">Loading shortlist...</div>
              ) : shortlist.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">No products have been shortlisted yet.</div>
              ) : (
                <div className="space-y-2">
                  {shortlist.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-gray-50">
                        {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-gray-900">{item.label}</div>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500">
                          {item.sku && <span>SKU: {item.sku}</span>}
                          <span>{money(item.price)}</span>
                          <span className={item.status === 'active' ? 'text-green-700' : 'text-amber-700'}>{item.status || 'unknown'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleActive(item)}
                        disabled={savingKey === item.key}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                          item.isActive ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'
                        }`}
                      >
                        {item.isActive ? <FaCheckCircle /> : <FaTimes />} {item.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => removeItem(item)}
                        disabled={savingKey === item.key}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Remove"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
