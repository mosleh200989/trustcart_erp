import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaSave, FaArrowLeft, FaPlus, FaTrash, FaEye, FaGripVertical, FaChevronDown, FaChevronUp, FaUpload, FaSpinner, FaTimes, FaSearch, FaLink, FaUnlink } from 'react-icons/fa';

// Simple unique ID generator (no uuid dependency needed)
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// ─── Reusable Image Upload Field ───
function ImageUploadField({
  label,
  value,
  onChange,
  placeholder = '/image.jpg or https://...',
  showPreview = true,
  className = '',
  inputClassName = 'w-full border rounded-lg px-3 py-2',
  labelClassName = 'block text-sm font-medium text-gray-700 mb-1',
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  showPreview?: boolean;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.url;
      if (url) onChange(url);
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Image upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={className}>
      <label className={labelClassName}>{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClassName} flex-1`}
          placeholder={placeholder}
        />
        <label
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${
            uploading
              ? 'bg-gray-300 text-gray-500 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {uploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
          <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Upload'}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-2 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
            title="Clear image"
          >
            <FaTimes />
          </button>
        )}
      </div>
      {showPreview && value && (
        <img src={value} alt="Preview" className="mt-2 w-40 h-28 object-cover rounded border" />
      )}
    </div>
  );
}

// ─── Section Images Upload Button ───
function SectionImageUploadButton({
  currentImages,
  onImagesChange,
}: {
  currentImages: string[];
  onImagesChange: (images: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const res = await apiClient.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) newUrls.push(res.data.url);
      }
      onImagesChange([...currentImages, ...newUrls]);
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Image upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <label
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium cursor-pointer transition ${
        uploading
          ? 'bg-gray-300 text-gray-500 cursor-wait'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {uploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
      {uploading ? 'Uploading...' : 'Upload Images'}
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        disabled={uploading}
        className="hidden"
      />
    </label>
  );
}

// ─── Product Search Field (type-ahead with variant support) ───
function ProductSearchField({
  productId,
  variantName,
  onSelect,
}: {
  productId?: number;
  variantName?: string;
  onSelect: (data: { product_id?: number; variant_name?: string; name?: string; price?: number; compare_price?: number; image_url?: string }) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [linkedName, setLinkedName] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch product name on mount if product_id exists
  useEffect(() => {
    if (productId) {
      apiClient.get(`/products/${productId}`)
        .then((res) => {
          const p = res.data;
          const name = p?.name_en || p?.name || `Product #${productId}`;
          setLinkedName(variantName ? `${name} — ${variantName}` : name);
        })
        .catch(() => setLinkedName(`Product #${productId}`));
    } else {
      setLinkedName('');
    }
  }, [productId, variantName]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchProducts = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setShowDropdown(false); return; }
    setLoading(true);
    try {
      const res = await apiClient.get(`/products/search?q=${encodeURIComponent(q)}`);
      const products = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setResults(products.slice(0, 10));
      setShowDropdown(products.length > 0);
    } catch { setResults([]); } finally { setLoading(false); }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchProducts(value), 300);
  };

  const handleSelect = (product: any, variant?: { name: string; price: number }) => {
    const vName = variant?.name || '';
    const price = variant ? Number(variant.price) : Number(product.sale_price || product.base_price || product.price || 0);
    const basePrice = Number(product.base_price || product.price || 0);
    const displayName = vName
      ? `${product.name_en || product.name} — ${vName}`
      : (product.name_en || product.name || '');
    onSelect({
      product_id: product.id,
      variant_name: vName || undefined,
      name: vName ? `${product.name_en || product.name} - ${vName}` : (product.name_en || product.name),
      price: price,
      compare_price: price < basePrice ? basePrice : undefined,
      image_url: product.image_url || product.image || undefined,
    });
    setLinkedName(displayName);
    setQuery('');
    setShowDropdown(false);
    setResults([]);
    setExpandedId(null);
  };

  const handleUnlink = () => {
    onSelect({ product_id: undefined, variant_name: undefined });
    setLinkedName('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs text-gray-500 mb-1">Link Product</label>
      {/* Show linked product badge */}
      {productId && linkedName && (
        <div className="flex items-center gap-2 mb-1.5 px-2 py-1.5 bg-green-50 border border-green-200 rounded text-sm">
          <FaLink className="text-green-500 flex-shrink-0" />
          <span className="flex-1 truncate text-green-800 font-medium">{linkedName}</span>
          <span className="text-xs text-green-500">ID: {productId}</span>
          <button type="button" onClick={handleUnlink} className="text-red-400 hover:text-red-600 ml-1" title="Unlink product">
            <FaUnlink />
          </button>
        </div>
      )}
      {/* Search input */}
      <div className="relative">
        <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          className="w-full border rounded px-3 py-2 pl-7 text-sm"
          placeholder="Type to search products..."
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <FaSpinner className="animate-spin text-blue-500 text-xs" />
          </div>
        )}
      </div>
      {/* Dropdown */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((p: any) => {
            const salePrice = Number(p.sale_price || p.base_price || p.price || 0);
            const basePrice = Number(p.base_price || p.price || 0);
            const hasDiscount = p.sale_price && salePrice < basePrice;
            const variants: Array<{ name: string; price: number }> = Array.isArray(p.size_variants) && p.size_variants.length > 0 ? p.size_variants : [];
            const isExp = expandedId === p.id;
            return (
              <div key={p.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => variants.length > 0 ? setExpandedId(isExp ? null : p.id) : handleSelect(p)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                >
                  {(p.image_url || p.image) && (
                    <img src={p.image_url || p.image} alt="" className="w-8 h-8 object-contain rounded border flex-shrink-0" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                      {variants.length > 0 && <span className={`text-xs transition-transform inline-block ${isExp ? 'rotate-90' : ''}`}>▶</span>}
                      {p.name_en || p.name}
                    </div>
                    {variants.length > 0 && <div className="text-xs text-blue-500">{variants.length} variant{variants.length > 1 ? 's' : ''}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {variants.length === 0 && (
                      <>
                        <div className="text-xs font-semibold text-blue-600">৳{salePrice.toFixed(2)}</div>
                        {hasDiscount && <div className="text-xs text-gray-400 line-through">৳{basePrice.toFixed(2)}</div>}
                      </>
                    )}
                  </div>
                </button>
                {variants.length > 0 && isExp && (
                  <div className="bg-gray-50 border-t">
                    {variants.map((v, vi) => (
                      <button
                        key={vi}
                        type="button"
                        onClick={() => handleSelect(p, v)}
                        className="w-full text-left pl-8 pr-3 py-1.5 hover:bg-blue-100 flex items-center gap-2 transition-colors border-b last:border-b-0 border-gray-100"
                      >
                        <span className="text-gray-400 text-xs">├─</span>
                        <span className="flex-1 text-sm text-gray-800">{v.name}</span>
                        <span className="text-xs font-semibold text-green-600">৳{Number(v.price).toFixed(2)}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleSelect(p)}
                      className="w-full text-left pl-8 pr-3 py-1.5 hover:bg-yellow-50 flex items-center gap-2 transition-colors border-t border-gray-200"
                    >
                      <span className="text-gray-400 text-xs">└─</span>
                      <span className="flex-1 text-sm text-gray-500 italic">Base product (no variant)</span>
                      <span className="text-xs font-semibold text-blue-600">৳{salePrice.toFixed(2)}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-0.5">Search &amp; link a real product for order tracking. Fills name, price &amp; image.</p>
    </div>
  );
}

interface LandingPageSection {
  id: string;
  type: 'hero' | 'benefits' | 'images' | 'trust' | 'order-form' | 'cta' | 'custom-html';
  title?: string;
  content?: string;
  items?: Array<{ icon?: string; text: string }>;
  images?: string[];
  buttonText?: string;
  buttonLink?: string;
  backgroundColor?: string;
  textColor?: string;
  order: number;
  is_visible: boolean;
}

interface LandingPageProduct {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  compare_price?: number;
  sku?: string;
  product_id?: number;
  variant_name?: string;
  is_default: boolean;
  is_featured?: boolean;
  featured_label?: string;
}

interface FormData {
  title: string;
  slug: string;
  description: string;
  template: string;
  hero_image_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_button_text: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  sections: LandingPageSection[];
  products: LandingPageProduct[];
  phone_number: string;
  whatsapp_number: string;
  show_order_form: boolean;
  cash_on_delivery: boolean;
  free_delivery: boolean;
  delivery_charge: number;
  delivery_charge_outside: number;
  delivery_note: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero Banner' },
  { value: 'benefits', label: 'Benefits / Features List' },
  { value: 'images', label: 'Image Gallery' },
  { value: 'trust', label: 'Trust / Why Choose Us' },
  { value: 'cta', label: 'Call to Action' },
  { value: 'custom-html', label: 'Custom HTML / Text' },
];

const DEFAULT_SECTION: Omit<LandingPageSection, 'id' | 'order'> = {
  type: 'cta',
  title: '',
  content: '',
  items: [],
  images: [],
  buttonText: '',
  backgroundColor: '#FFFFFF',
  textColor: '#1a1a2e',
  is_visible: true,
};

export default function LandingPageEditor() {
  const router = useRouter();
  const { id } = router.query;
  const isEditing = id && id !== 'create';

  const [activeTab, setActiveTab] = useState<'general' | 'sections' | 'products' | 'settings' | 'seo'>('general');
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const [form, setForm] = useState<FormData>({
    title: '',
    slug: '',
    description: '',
    template: 'classic',
    hero_image_url: '',
    hero_title: '',
    hero_subtitle: '',
    hero_button_text: 'অর্ডার করুন',
    primary_color: '#2d6a4f',
    secondary_color: '#FFFFFF',
    background_color: '#f0f4f0',
    meta_title: '',
    meta_description: '',
    og_image_url: '',
    sections: [],
    products: [],
    phone_number: '',
    whatsapp_number: '',
    show_order_form: true,
    cash_on_delivery: true,
    free_delivery: false,
    delivery_charge: 80,
    delivery_charge_outside: 130,
    delivery_note: '',
    is_active: true,
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (isEditing) {
      apiClient.get(`/landing-pages/${id}`).then((res) => {
        const data = res.data;
        setForm({
          ...data,
          start_date: data.start_date ? data.start_date.split('T')[0] : '',
          end_date: data.end_date ? data.end_date.split('T')[0] : '',
        });
      });
    }
  }, [id, isEditing]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: isEditing ? prev.slug : generateSlug(title),
    }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.slug) {
      alert('Title and slug are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      if (isEditing) {
        await apiClient.put(`/landing-pages/${id}`, payload);
      } else {
        await apiClient.post('/landing-pages', payload);
      }
      router.push('/admin/landing-pages');
    } catch (err: any) {
      console.error('Save error:', err);
      alert(err?.response?.data?.message || 'Failed to save landing page');
    } finally {
      setSaving(false);
    }
  };

  // ─── Section Management ───

  const addSection = (type: LandingPageSection['type']) => {
    const newSection: LandingPageSection = {
      ...DEFAULT_SECTION,
      type,
      id: generateId(),
      order: form.sections.length + 1,
    };
    setForm((prev) => ({ ...prev, sections: [...prev.sections, newSection] }));
    setExpandedSections((prev) => new Set(prev).add(newSection.id));
  };

  const updateSection = (sectionId: string, updates: Partial<LandingPageSection>) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    }));
  };

  const removeSection = (sectionId: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections
        .filter((s) => s.id !== sectionId)
        .map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setForm((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === sectionId);
      if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === prev.sections.length - 1)) return prev;
      const newSections = [...prev.sections];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];
      return { ...prev, sections: newSections.map((s, i) => ({ ...s, order: i + 1 })) };
    });
  };

  const addSectionItem = (sectionId: string) => {
    updateSection(sectionId, {
      items: [...(form.sections.find((s) => s.id === sectionId)?.items || []), { icon: '✅', text: '' }],
    });
  };

  const updateSectionItem = (sectionId: string, itemIdx: number, updates: Partial<{ icon: string; text: string }>) => {
    const section = form.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const newItems = [...(section.items || [])];
    newItems[itemIdx] = { ...newItems[itemIdx], ...updates };
    updateSection(sectionId, { items: newItems });
  };

  const removeSectionItem = (sectionId: string, itemIdx: number) => {
    const section = form.sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { items: (section.items || []).filter((_, i) => i !== itemIdx) });
  };

  // ─── Product Management ───

  const addProduct = () => {
    setForm((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          id: generateId(),
          name: '',
          description: '',
          image_url: '',
          price: 0,
          compare_price: 0,
          is_default: prev.products.length === 0,
        },
      ],
    }));
  };

  const updateProduct = (productId: string, updates: Partial<LandingPageProduct>) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      ),
    }));
  };

  const removeProduct = (productId: string) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
    }));
  };

  const toggleExpanded = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // ─── Tab: General ───
  const renderGeneralTab = () => (
    <div className="space-y-6">
      {/* Template Selector */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
        <label className="block text-sm font-semibold text-gray-800 mb-2">Page Template</label>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div
            onClick={() => setForm((prev) => ({ ...prev, template: 'classic' }))}
            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
              form.template === 'classic'
                ? 'border-blue-500 bg-white shadow-md ring-2 ring-blue-200'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-lg">C</div>
              <div>
                <div className="font-semibold text-gray-800">Classic</div>
                <div className="text-xs text-gray-500">Original layout — hero + sections</div>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="h-1 flex-1 rounded bg-blue-300"></div>
              <div className="h-1 flex-1 rounded bg-blue-200"></div>
              <div className="h-1 flex-1 rounded bg-blue-100"></div>
            </div>
          </div>
          <div
            onClick={() => setForm((prev) => ({ ...prev, template: 'elegant' }))}
            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
              form.template === 'elegant'
                ? 'border-purple-500 bg-white shadow-md ring-2 ring-purple-200'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">E</div>
              <div>
                <div className="font-semibold text-gray-800">Elegant</div>
                <div className="text-xs text-gray-500">Premium design — glassmorphism & animations</div>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-purple-400 to-pink-400"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-purple-300 to-pink-300"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-purple-200 to-pink-200"></div>
            </div>
          </div>
          <div
            onClick={() => setForm((prev) => ({ ...prev, template: 'ghee' }))}
            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
              form.template === 'ghee'
                ? 'border-amber-500 bg-white shadow-md ring-2 ring-amber-200'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">G</div>
              <div>
                <div className="font-semibold text-gray-800">Ghee</div>
                <div className="text-xs text-gray-500">Ghee product — elegant style variant</div>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-amber-400 to-yellow-400"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-amber-300 to-yellow-300"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-amber-200 to-yellow-200"></div>
            </div>
          </div>
          <div
            onClick={() => setForm((prev) => ({ ...prev, template: 'pickle' }))}
            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
              form.template === 'pickle'
                ? 'border-red-500 bg-white shadow-md ring-2 ring-red-200'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">P</div>
              <div>
                <div className="font-semibold text-gray-800">Pickle</div>
                <div className="text-xs text-gray-500">Achar/Pickle — spicy warm theme</div>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-red-400 to-orange-400"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-red-300 to-orange-300"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-red-200 to-orange-200"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Page Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Premium Seed Mix"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug *</label>
          <div className="flex items-center">
            <span className="bg-gray-100 border border-r-0 rounded-l-lg px-3 py-2 text-sm text-gray-500">/products/</span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              className="w-full border rounded-r-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="seed-mix"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Brief description for internal use"
        />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Hero Section</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <ImageUploadField
              label="Hero Image URL"
              value={form.hero_image_url}
              onChange={(url) => setForm((prev) => ({ ...prev, hero_image_url: url }))}
              placeholder="/seed-mix.jpg or https://..."
            />
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
              <input
                type="text"
                value={form.hero_title}
                onChange={(e) => setForm((prev) => ({ ...prev, hero_title: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Button Text</label>
              <input
                type="text"
                value={form.hero_button_text}
                onChange={(e) => setForm((prev) => ({ ...prev, hero_button_text: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
          <textarea
            value={form.hero_subtitle}
            onChange={(e) => setForm((prev) => ({ ...prev, hero_subtitle: e.target.value }))}
            rows={2}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Colors</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm((prev) => ({ ...prev, primary_color: e.target.value }))}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={(e) => setForm((prev) => ({ ...prev, primary_color: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.secondary_color}
                onChange={(e) => setForm((prev) => ({ ...prev, secondary_color: e.target.value }))}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={form.secondary_color}
                onChange={(e) => setForm((prev) => ({ ...prev, secondary_color: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.background_color}
                onChange={(e) => setForm((prev) => ({ ...prev, background_color: e.target.value }))}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={form.background_color}
                onChange={(e) => setForm((prev) => ({ ...prev, background_color: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Tab: Sections Builder ───
  const renderSectionsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Page Sections</h3>
        <div className="flex items-center gap-2">
          <select
            id="section-type-select"
            className="border rounded-lg px-3 py-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                addSection(e.target.value as LandingPageSection['type']);
                e.target.value = '';
              }
            }}
          >
            <option value="" disabled>+ Add Section</option>
            {SECTION_TYPES.map((st) => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        </div>
      </div>

      {form.sections.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed">
          No sections yet. Add a section from the dropdown above.
        </div>
      ) : (
        form.sections.map((section) => (
          <div key={section.id} className={`border rounded-lg ${section.is_visible ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
            {/* Section Header */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-t-lg cursor-pointer"
              onClick={() => toggleExpanded(section.id)}
            >
              <div className="flex items-center gap-3">
                <FaGripVertical className="text-gray-400" />
                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {SECTION_TYPES.find((t) => t.value === section.type)?.label || section.type}
                </span>
                <span className="font-medium text-gray-700">{section.title || '(untitled)'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }} className="text-gray-400 hover:text-gray-600 p-1" title="Move up"><FaChevronUp /></button>
                <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }} className="text-gray-400 hover:text-gray-600 p-1" title="Move down"><FaChevronDown /></button>
                <button onClick={(e) => { e.stopPropagation(); updateSection(section.id, { is_visible: !section.is_visible }); }} className={`p-1 ${section.is_visible ? 'text-green-500' : 'text-gray-400'}`} title="Toggle visibility"><FaEye /></button>
                <button onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} className="text-red-400 hover:text-red-600 p-1" title="Remove"><FaTrash /></button>
                {expandedSections.has(section.id) ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
              </div>
            </div>

            {/* Section Body (expandable) */}
            {expandedSections.has(section.id) && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                    <input
                      type="text"
                      value={section.title || ''}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">BG Color</label>
                      <input
                        type="color"
                        value={section.backgroundColor || '#FFFFFF'}
                        onChange={(e) => updateSection(section.id, { backgroundColor: e.target.value })}
                        className="w-full h-10 rounded border cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                      <input
                        type="color"
                        value={section.textColor || '#1a1a2e'}
                        onChange={(e) => updateSection(section.id, { textColor: e.target.value })}
                        className="w-full h-10 rounded border cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Content */}
                {(section.type === 'hero' || section.type === 'cta' || section.type === 'custom-html') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea
                      value={section.content || ''}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      rows={section.type === 'custom-html' ? 8 : 3}
                      className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                      placeholder={section.type === 'custom-html' ? 'Enter HTML content...' : 'Section content...'}
                    />
                  </div>
                )}

                {/* Button Text */}
                {(section.type === 'hero' || section.type === 'cta') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                    <input
                      type="text"
                      value={section.buttonText || ''}
                      onChange={(e) => updateSection(section.id, { buttonText: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                )}

                {/* Items (for benefits, trust) */}
                {(section.type === 'benefits' || section.type === 'trust') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Items</label>
                      <button
                        onClick={() => addSectionItem(section.id)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1"
                      >
                        <FaPlus /> Add Item
                      </button>
                    </div>
                    {(section.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={item.icon || ''}
                          onChange={(e) => updateSectionItem(section.id, idx, { icon: e.target.value })}
                          className="w-16 border rounded px-2 py-1 text-center"
                          placeholder="🌟"
                        />
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => updateSectionItem(section.id, idx, { text: e.target.value })}
                          className="flex-1 border rounded px-3 py-1"
                          placeholder="Benefit or feature text..."
                        />
                        <button
                          onClick={() => removeSectionItem(section.id, idx)}
                          className="text-red-400 hover:text-red-600 px-2"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Images (for images type) */}
                {section.type === 'images' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Image URLs (one per line)</label>
                      <SectionImageUploadButton
                        currentImages={section.images || []}
                        onImagesChange={(imgs) => updateSection(section.id, { images: imgs })}
                      />
                    </div>
                    <textarea
                      value={(section.images || []).join('\n')}
                      onChange={(e) => updateSection(section.id, { images: e.target.value.split('\n').filter(Boolean) })}
                      rows={4}
                      className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                      placeholder="/image1.jpg&#10;/image2.jpg"
                    />
                    {(section.images || []).length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {(section.images || []).map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={img} alt={`Section image ${idx + 1}`} className="w-20 h-16 object-cover rounded border" />
                            <button
                              type="button"
                              onClick={() => {
                                const newImages = [...(section.images || [])];
                                newImages.splice(idx, 1);
                                updateSection(section.id, { images: newImages });
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  // ─── Tab: Products ───
  const renderProductsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Products for this Landing Page</h3>
        <button
          onClick={addProduct}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"
        >
          <FaPlus /> Add Product
        </button>
      </div>

      {form.products.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed">
          No products added yet. Add products that will appear on the landing page order form.
        </div>
      ) : (
        form.products.map((product, idx) => (
          <div key={product.id} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600">Product #{idx + 1}</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="default-product"
                    checked={product.is_default}
                    onChange={() => {
                      setForm((prev) => ({
                        ...prev,
                        products: prev.products.map((p) => ({
                          ...p,
                          is_default: p.id === product.id,
                        })),
                      }));
                    }}
                  />
                  Default
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={!!product.is_featured}
                    onChange={(e) => updateProduct(product.id, { is_featured: e.target.checked })}
                    className="accent-orange-500"
                  />
                  <span className="text-orange-600">⭐ Featured</span>
                </label>
                <button
                  onClick={() => removeProduct(product.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Product Name</label>
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="e.g. Seed Mix - 250g"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price (৳)</label>
                <input
                  type="number"
                  value={product.price}
                  onChange={(e) => updateProduct(product.id, { price: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Compare Price (৳)</label>
                <input
                  type="number"
                  value={product.compare_price || ''}
                  onChange={(e) => updateProduct(product.id, { compare_price: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <ImageUploadField
                label="Image URL"
                value={product.image_url || ''}
                onChange={(url) => updateProduct(product.id, { image_url: url })}
                placeholder="/seed-mix.jpg or https://..."
                inputClassName="w-full border rounded px-3 py-2 text-sm"
                labelClassName="block text-xs text-gray-500 mb-1"
              />
              <ProductSearchField
                productId={product.product_id}
                variantName={product.variant_name}
                onSelect={(data) => updateProduct(product.id, {
                  product_id: data.product_id,
                  variant_name: data.variant_name,
                  ...(data.name ? { name: data.name } : {}),
                  ...(data.price ? { price: data.price } : {}),
                  ...(data.compare_price ? { compare_price: data.compare_price } : {}),
                  ...(data.image_url ? { image_url: data.image_url } : {}),
                })}
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  value={product.description || ''}
                  onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              {product.is_featured && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Featured Badge Label</label>
                  <input
                    type="text"
                    value={product.featured_label || ''}
                    onChange={(e) => updateProduct(product.id, { featured_label: e.target.value })}
                    className="w-full border border-orange-300 rounded px-3 py-2 text-sm bg-orange-50"
                    placeholder="e.g. 🔥 বিশেষ অফার"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Leave empty for default: "🔥 বিশেষ অফার"</p>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ─── Tab: Settings ───
  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Order & Delivery Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={form.phone_number}
              onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
            <input
              type="text"
              value={form.whatsapp_number}
              onChange={(e) => setForm((prev) => ({ ...prev, whatsapp_number: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="8801XXXXXXXXX"
            />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.show_order_form}
              onChange={(e) => setForm((prev) => ({ ...prev, show_order_form: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Show Order Form on Page</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.cash_on_delivery}
              onChange={(e) => setForm((prev) => ({ ...prev, cash_on_delivery: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Enable Cash on Delivery</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.free_delivery}
              onChange={(e) => setForm((prev) => ({ ...prev, free_delivery: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Free Delivery</span>
          </label>
        </div>

        {/* Delivery Charge Settings */}
        {!form.free_delivery && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="text-sm font-semibold text-orange-800 mb-3">Delivery Charge Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inside Dhaka (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.delivery_charge}
                  onChange={(e) => setForm((prev) => ({ ...prev, delivery_charge: Number(e.target.value) || 0 }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g. 80"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outside Dhaka (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.delivery_charge_outside}
                  onChange={(e) => setForm((prev) => ({ ...prev, delivery_charge_outside: Number(e.target.value) || 0 }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g. 130"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Set to 0 for free delivery in that zone. These charges will be shown to the customer on the landing page.</p>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Note</label>
          <input
            type="text"
            value={form.delivery_note}
            onChange={(e) => setForm((prev) => ({ ...prev, delivery_note: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="e.g. সারা বাংলাদেশে ফ্রি হোম ডেলিভারি"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Scheduling</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (optional)</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Page is Active</span>
        </label>
      </div>
    </div>
  );

  // ─── Tab: SEO ───
  const renderSeoTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-3">SEO & Social Sharing</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
        <input
          type="text"
          value={form.meta_title}
          onChange={(e) => setForm((prev) => ({ ...prev, meta_title: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Custom page title for search engines"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
        <textarea
          value={form.meta_description}
          onChange={(e) => setForm((prev) => ({ ...prev, meta_description: e.target.value }))}
          rows={3}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Description for search engine results"
        />
      </div>
      <div>
        <ImageUploadField
          label="OG Image URL"
          value={form.og_image_url}
          onChange={(url) => setForm((prev) => ({ ...prev, og_image_url: url }))}
          placeholder="Social sharing image URL"
        />
      </div>
    </div>
  );

  const TABS = [
    { key: 'general', label: 'General' },
    { key: 'sections', label: 'Page Sections' },
    { key: 'products', label: 'Products' },
    { key: 'settings', label: 'Settings' },
    { key: 'seo', label: 'SEO' },
  ] as const;

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/landing-pages')} className="text-gray-500 hover:text-gray-700">
              <FaArrowLeft />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Landing Page' : 'Create Landing Page'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isEditing && form.slug && (
              <a
                href={`/products/${form.slug}/?landing_page=${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50"
              >
                <FaEye /> Preview
              </a>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              <FaSave /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'sections' && renderSectionsTab()}
          {activeTab === 'products' && renderProductsTab()}
          {activeTab === 'settings' && renderSettingsTab()}
          {activeTab === 'seo' && renderSeoTab()}
        </div>
      </div>
    </AdminLayout>
  );
}
