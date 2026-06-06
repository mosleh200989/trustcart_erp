import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { BACKEND_ORIGIN } from '@/config/backend';
import { FaArrowLeft, FaGripVertical, FaSave, FaSearch, FaSyncAlt } from 'react-icons/fa';

type Product = {
  id: number;
  slug?: string;
  sku?: string;
  name_en?: string;
  name_bn?: string;
  category_name?: string;
  base_price?: number | string;
  sale_price?: number | string | null;
  stock_quantity?: number;
  status?: string;
  image_url?: string | null;
  display_order?: number | null;
};

const SECTIONS = [
  { key: 'homepage_featured', label: 'Homepage Featured', description: 'Controls the Featured Products section on the homepage.' },
  { key: 'products_page', label: 'Products Page', description: 'Controls default ordering on /products when no explicit sort is selected.' },
  { key: 'hot_deals', label: 'Hot Deals', description: 'Controls customer-facing hot deal order after active hot deal settings.' },
  { key: 'combo_products', label: 'Combo Products', description: 'Controls the homepage Combo Products section.' },
  { key: 'featured_products', label: 'Featured Flag', description: 'Controls products returned by the featured-products API section.' },
  { key: 'popular_products', label: 'Popular', description: 'Controls products returned by the popular-products API section.' },
  { key: 'new_arrivals', label: 'New Arrivals', description: 'Controls products returned by the new-arrivals API section.' },
];

const resolveImageUrl = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw;
  return `${BACKEND_ORIGIN}/uploads/${raw}`;
};

export default function ProductSetOrderPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeSection, setActiveSection] = useState(SECTIONS[0].key);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);

  const sectionMeta = SECTIONS.find((section) => section.key === activeSection) || SECTIONS[0];

  const loadSection = async (sectionKey = activeSection) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/products/admin/section-orders/${sectionKey}`);
      setProducts(Array.isArray(res.data?.products) ? res.data.products : []);
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load product order');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSection(activeSection);
  }, [activeSection]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => (
      String(product.name_en || '').toLowerCase().includes(q) ||
      String(product.name_bn || '').toLowerCase().includes(q) ||
      String(product.sku || '').toLowerCase().includes(q) ||
      String(product.category_name || '').toLowerCase().includes(q)
    ));
  }, [products, search]);

  const moveProduct = (fromId: number, toId: number) => {
    if (fromId === toId) return;
    setProducts((current) => {
      const fromIndex = current.findIndex((item) => item.id === fromId);
      const toIndex = current.findIndex((item) => item.id === toId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDirty(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/products/admin/section-orders/${activeSection}`, {
        productIds: products.map((product) => product.id),
      });
      toast.success('Product order saved');
      setDirty(false);
      await loadSection(activeSection);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save product order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push('/admin/products')}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <FaArrowLeft /> Back to products
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Set Product Order</h1>
            <p className="mt-1 text-gray-600">Drag products to control their sequence in frontend sections.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => loadSection(activeSection)}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Reset
            </button>
            <button
              type="button"
              onClick={saveOrder}
              disabled={!dirty || loading || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaSave />
              {saving ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-3">
            <div className="flex gap-2 overflow-x-auto">
              {SECTIONS.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeSection === section.key
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{sectionMeta.label}</h2>
              <p className="text-sm text-gray-500">{sectionMeta.description}</p>
            </div>
            <div className="relative w-full lg:w-80">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products"
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="py-16 text-center text-sm text-gray-500">Loading products...</div>
            ) : visibleProducts.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">No products found for this section.</div>
            ) : (
              <div className="space-y-2">
                {visibleProducts.map((product, index) => {
                  const imageUrl = resolveImageUrl(product.image_url);
                  return (
                    <div
                      key={product.id}
                      draggable
                      onDragStart={() => setDraggedId(product.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggedId != null) moveProduct(draggedId, product.id);
                        setDraggedId(null);
                      }}
                      onDragEnd={() => setDraggedId(null)}
                      className={`grid grid-cols-[auto_56px_1fr_auto] items-center gap-3 rounded-lg border bg-white p-3 transition-shadow ${
                        draggedId === product.id ? 'border-green-500 shadow-md' : 'border-gray-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-green-50 px-2 text-xs font-semibold text-green-700">
                          {index + 1}
                        </span>
                        <FaGripVertical className="cursor-grab text-gray-400" />
                      </div>
                      <div className="h-14 w-14 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                        {imageUrl ? (
                          <img src={imageUrl} alt={product.name_en || 'Product'} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">{product.name_en || product.name_bn || `Product #${product.id}`}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>ID: {product.id}</span>
                          {product.sku && <span>SKU: {product.sku}</span>}
                          {product.category_name && <span>{product.category_name}</span>}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold text-gray-900">৳{Number(product.sale_price || product.base_price || 0).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">Stock {Number(product.stock_quantity || 0)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
