import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import {
  FaArrowLeft, FaPlus, FaTrash, FaSearch, FaStar, FaRegStar, FaEye, FaEyeSlash,
  FaBoxes, FaListUl, FaCog, FaSave, FaExternalLinkAlt,
} from 'react-icons/fa';

interface Storefront {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  extra_domains: string[];
  template: string;
  logo_url: string | null;
  favicon_url: string | null;
  theme: Record<string, any>;
  tagline: string | null;
  description: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  social_links: Record<string, string>;
  meta_pixel_id: string | null;
  meta_capi_access_token: string | null;
  meta_test_event_code: string | null;
  seo_title: string | null;
  seo_description: string | null;
  delivery_charge_inside: number;
  delivery_charge_outside: number;
  free_delivery_threshold: number | null;
  is_active: boolean;
}

interface StorefrontCategory {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
}

interface Listing {
  id: number;
  product_id: number;
  storefront_category_id: number | null;
  sort_order: number;
  is_published: boolean;
  is_featured: boolean;
  product: {
    id: number;
    name_en: string;
    slug: string;
    sku: string;
    image_url: string | null;
    base_price: number;
    sale_price: number | null;
    stock_quantity: number | null;
    status: string;
  };
}

type Tab = 'products' | 'categories' | 'settings';

export default function StorefrontManage() {
  const router = useRouter();
  const id = Number(router.query.id);

  const [tab, setTab] = useState<Tab>('products');
  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [sfRes, catRes, listRes] = await Promise.all([
        apiClient.get(`/storefronts/${id}`),
        apiClient.get(`/storefronts/${id}/categories`),
        apiClient.get(`/storefronts/${id}/products`),
      ]);
      setStorefront(sfRes.data);
      setCategories(catRes.data || []);
      setListings(listRes.data || []);
    } catch (err) {
      console.error('Failed to load storefront:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading || !storefront) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-gray-500 py-16">Loading storefront…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin/storefronts" className="text-gray-400 hover:text-gray-900">
              <FaArrowLeft />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{storefront.name}</h1>
              <p className="text-sm text-gray-500">
                /{storefront.slug}
                {storefront.domain && (
                  <>
                    {' · '}
                    <a
                      href={`https://${storefront.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {storefront.domain} <FaExternalLinkAlt className="inline text-[10px]" />
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-badge font-medium ${
              storefront.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {storefront.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {([
            ['products', 'Products', FaBoxes],
            ['categories', 'Categories', FaListUl],
            ['settings', 'Settings', FaCog],
          ] as [Tab, string, any][]).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                tab === key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon /> {label}
              {key === 'products' && (
                <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-badge">{listings.length}</span>
              )}
              {key === 'categories' && (
                <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-badge">{categories.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'products' && (
          <ProductsTab
            storefrontId={id}
            listings={listings}
            categories={categories}
            onChanged={fetchAll}
          />
        )}
        {tab === 'categories' && (
          <CategoriesTab storefrontId={id} categories={categories} onChanged={fetchAll} />
        )}
        {tab === 'settings' && (
          <SettingsTab storefront={storefront} onSaved={fetchAll} />
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Products tab ────────────────────────────────────────────

function ProductsTab({
  storefrontId, listings, categories, onChanged,
}: {
  storefrontId: number;
  listings: Listing[];
  categories: StorefrontCategory[];
  onChanged: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchProducts = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setShowDropdown(false); return; }
    setSearching(true);
    try {
      const res = await apiClient.get(`/products/admin/search?q=${encodeURIComponent(q)}`);
      const products = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setResults(products.slice(0, 10));
      setShowDropdown(true);
    } catch { setResults([]); } finally { setSearching(false); }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchProducts(value), 300);
  };

  const listedIds = new Set(listings.map((l) => l.product_id));

  const addProduct = async (productId: number) => {
    try {
      await apiClient.post(`/storefronts/${storefrontId}/products`, { product_id: productId });
      setQuery('');
      setResults([]);
      setShowDropdown(false);
      onChanged();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add product');
    }
  };

  const updateListing = async (listingId: number, data: Partial<Listing>) => {
    try {
      await apiClient.put(`/storefronts/${storefrontId}/products/${listingId}`, data);
      onChanged();
    } catch (err) {
      console.error('Failed to update listing:', err);
    }
  };

  const removeListing = async (listingId: number) => {
    if (!confirm('Remove this product from the storefront? (It stays in inventory.)')) return;
    try {
      await apiClient.delete(`/storefronts/${storefrontId}/products/${listingId}`);
      onChanged();
    } catch (err) {
      console.error('Failed to remove listing:', err);
    }
  };

  return (
    <div>
      {/* Search + add from inventory */}
      <div ref={boxRef} className="relative max-w-xl mb-6">
        <div className="flex items-center border border-gray-300 rounded-card bg-white px-3">
          <FaSearch className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search inventory to add a product (min 2 characters)…"
            className="flex-1 px-3 py-2.5 text-sm outline-none"
          />
          {searching && <span className="text-xs text-gray-400">Searching…</span>}
        </div>
        {showDropdown && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-card shadow-lg max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">No products found</div>
            ) : (
              results.map((p) => {
                const already = listedIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    disabled={already}
                    onClick={() => addProduct(p.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm ${
                      already ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                  >
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt="" className="w-9 h-9 rounded object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded bg-gray-100" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{p.name_en || p.name}</div>
                      <div className="text-xs text-gray-500">
                        SKU {p.sku} · ৳{Number(p.sale_price ?? p.base_price ?? p.price ?? 0).toLocaleString()}
                        {typeof p.stock_quantity === 'number' && ` · stock ${p.stock_quantity}`}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-brand">{already ? 'Listed' : '+ Add'}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {listings.length === 0 ? (
        <div className="bg-white rounded-card border border-gray-200 p-12 text-center text-gray-500">
          No products listed yet. Search the inventory above to add some.
        </div>
      ) : (
        <div className="bg-white rounded-card border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Stock</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-center px-4 py-3">Sort</th>
                <th className="text-center px-4 py-3">Featured</th>
                <th className="text-center px-4 py-3">Published</th>
                <th className="text-center px-4 py-3">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listings.map((l) => (
                <tr key={l.id} className={l.is_published ? '' : 'opacity-50'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {l.product?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.product.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{l.product?.name_en}</div>
                        <div className="text-xs text-gray-500">SKU {l.product?.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {l.product?.sale_price ? (
                      <>
                        <span className="font-medium">৳{Number(l.product.sale_price).toLocaleString()}</span>
                        <span className="text-xs text-gray-400 line-through ml-1">
                          ৳{Number(l.product.base_price).toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="font-medium">৳{Number(l.product?.base_price || 0).toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={Number(l.product?.stock_quantity) > 0 ? 'text-gray-700' : 'text-red-600 font-medium'}>
                      {l.product?.stock_quantity ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={l.storefront_category_id ?? ''}
                      onChange={(e) =>
                        updateListing(l.id, {
                          storefront_category_id: e.target.value ? Number(e.target.value) : null,
                        } as any)
                      }
                      className="border border-gray-200 rounded px-2 py-1 text-sm bg-white"
                    >
                      <option value="">— none —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      defaultValue={l.sort_order}
                      onBlur={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (v !== l.sort_order) updateListing(l.id, { sort_order: v } as any);
                      }}
                      className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => updateListing(l.id, { is_featured: !l.is_featured } as any)}
                      className="text-amber-500 hover:text-amber-600"
                      title={l.is_featured ? 'Unfeature' : 'Feature on homepage'}
                    >
                      {l.is_featured ? <FaStar /> : <FaRegStar className="text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => updateListing(l.id, { is_published: !l.is_published } as any)}
                      className="text-gray-500 hover:text-gray-900"
                      title={l.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {l.is_published ? <FaEye className="text-green-600" /> : <FaEyeSlash />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => removeListing(l.id)}
                      className="text-gray-300 hover:text-red-600"
                      title="Remove from storefront"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Categories tab ──────────────────────────────────────────

function CategoriesTab({
  storefrontId, categories, onChanged,
}: {
  storefrontId: number;
  categories: StorefrontCategory[];
  onChanged: () => void;
}) {
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const slugify = (value: string) =>
    value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setAdding(true);
      await apiClient.post(`/storefronts/${storefrontId}/categories`, {
        name: name.trim(),
        slug: slugify(name),
        sort_order: categories.length + 1,
      });
      setName('');
      onChanged();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add category (slug may already exist)');
    } finally {
      setAdding(false);
    }
  };

  const updateCategory = async (catId: number, data: Partial<StorefrontCategory>) => {
    try {
      await apiClient.put(`/storefronts/${storefrontId}/categories/${catId}`, data);
      onChanged();
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const removeCategory = async (catId: number) => {
    if (!confirm('Delete this category? Products in it stay listed, just uncategorised.')) return;
    try {
      await apiClient.delete(`/storefronts/${storefrontId}/categories/${catId}`);
      onChanged();
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={addCategory} className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name…"
          className="flex-1 border border-gray-300 rounded-card px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <FaPlus /> Add
        </button>
      </form>

      {categories.length === 0 ? (
        <div className="bg-white rounded-card border border-gray-200 p-8 text-center text-gray-500">
          No categories yet.
        </div>
      ) : (
        <div className="bg-white rounded-card border border-gray-200 divide-y divide-gray-100">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="number"
                defaultValue={c.sort_order}
                onBlur={(e) => {
                  const v = Number(e.target.value) || 0;
                  if (v !== c.sort_order) updateCategory(c.id, { sort_order: v });
                }}
                className="w-14 border border-gray-200 rounded px-2 py-1 text-sm text-center"
                title="Sort order"
              />
              <input
                defaultValue={c.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== c.name) updateCategory(c.id, { name: v });
                }}
                className="flex-1 border border-transparent hover:border-gray-200 focus:border-gray-300 rounded px-2 py-1 text-sm font-medium"
              />
              <span className="text-xs text-gray-400 font-mono">/{c.slug}</span>
              <button
                onClick={() => updateCategory(c.id, { is_active: !c.is_active })}
                className="text-gray-500 hover:text-gray-900"
                title={c.is_active ? 'Hide' : 'Show'}
              >
                {c.is_active ? <FaEye className="text-green-600" /> : <FaEyeSlash />}
              </button>
              <button
                onClick={() => removeCategory(c.id)}
                className="text-gray-300 hover:text-red-600"
                title="Delete"
              >
                <FaTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings tab ────────────────────────────────────────────

function SettingsTab({ storefront, onSaved }: { storefront: Storefront; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    name: storefront.name,
    domain: storefront.domain || '',
    template: storefront.template,
    logo_url: storefront.logo_url || '',
    favicon_url: storefront.favicon_url || '',
    tagline: storefront.tagline || '',
    description: storefront.description || '',
    contact_phone: storefront.contact_phone || '',
    contact_email: storefront.contact_email || '',
    contact_address: storefront.contact_address || '',
    meta_pixel_id: storefront.meta_pixel_id || '',
    meta_capi_access_token: storefront.meta_capi_access_token || '',
    meta_test_event_code: storefront.meta_test_event_code || '',
    seo_title: storefront.seo_title || '',
    seo_description: storefront.seo_description || '',
    delivery_charge_inside: storefront.delivery_charge_inside ?? 60,
    delivery_charge_outside: storefront.delivery_charge_outside ?? 110,
    free_delivery_threshold: storefront.free_delivery_threshold ?? '',
    is_active: storefront.is_active,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaved(false);
      await apiClient.put(`/storefronts/${storefront.id}`, {
        ...form,
        domain: form.domain || null,
        free_delivery_threshold:
          form.free_delivery_threshold === '' ? null : Number(form.free_delivery_threshold),
        delivery_charge_inside: Number(form.delivery_charge_inside),
        delivery_charge_outside: Number(form.delivery_charge_outside),
      });
      setSaved(true);
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: string, opts: { type?: string; placeholder?: string; mono?: boolean } = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={opts.type || 'text'}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={opts.placeholder}
        className={`w-full border border-gray-300 rounded-card px-3 py-2 text-sm ${opts.mono ? 'font-mono' : ''}`}
      />
    </div>
  );

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <section className="bg-white rounded-card border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">General</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Name', 'name')}
          {field('Domain', 'domain', { placeholder: 'handsomemanbd.com' })}
          {field('Template', 'template', { mono: true })}
          {field('Tagline', 'tagline')}
          {field('Logo URL', 'logo_url')}
          {field('Favicon URL', 'favicon_url')}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-card px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
          />
          Storefront is active (public site is reachable)
        </label>
      </section>

      <section className="bg-white rounded-card border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Phone', 'contact_phone', { placeholder: '01XXXXXXXXX' })}
          {field('Email', 'contact_email')}
        </div>
        {field('Address', 'contact_address')}
      </section>

      <section className="bg-white rounded-card border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Delivery (BDT)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field('Inside Dhaka', 'delivery_charge_inside', { type: 'number' })}
          {field('Outside Dhaka', 'delivery_charge_outside', { type: 'number' })}
          {field('Free delivery from (optional)', 'free_delivery_threshold', { type: 'number', placeholder: 'e.g. 2000' })}
        </div>
      </section>

      <section className="bg-white rounded-card border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Meta / Facebook tracking</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Pixel ID', 'meta_pixel_id', { mono: true })}
          {field('Test event code (optional)', 'meta_test_event_code', { mono: true })}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CAPI access token</label>
          <input
            type="password"
            value={form.meta_capi_access_token}
            onChange={(e) => set('meta_capi_access_token', e.target.value)}
            className="w-full border border-gray-300 rounded-card px-3 py-2 text-sm font-mono"
            placeholder="EAAB…"
          />
          <p className="text-xs text-gray-400 mt-1">
            Used server-side for Conversions API. Never exposed to the public site.
          </p>
        </div>
      </section>

      <section className="bg-white rounded-card border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">SEO</h3>
        {field('SEO title', 'seo_title')}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SEO description</label>
          <textarea
            value={form.seo_description}
            onChange={(e) => set('seo_description', e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-card px-3 py-2 text-sm"
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-button text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <FaSave /> {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved ✓</span>}
      </div>
    </form>
  );
}
