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
  uploadPreset,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  showPreview?: boolean;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  uploadPreset?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const endpoint = uploadPreset ? `/upload/image?preset=${encodeURIComponent(uploadPreset)}` : '/upload/image';
      const res = await apiClient.post(endpoint, formData, {
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
          setLinkedName(variantName ? `${name} (${variantName})` : name);
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
      const res = await apiClient.get(`/products/admin/search?q=${encodeURIComponent(q)}`);
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
  type: 'hero' | 'benefits' | 'images' | 'trust' | 'order-form' | 'cta' | 'custom-html' | 'event-rules' | 'event-prizes' | 'event-how-to' | 'event-countdown' | 'phone-cta' | 'spacer';
  title?: string;
  content?: string;
  items?: Array<{ icon?: string; text: string }>;
  images?: string[];
  videoUrl?: string;
  videoTitlePosition?: 'above-video' | 'below-video';
  buttonText?: string;
  buttonLink?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonBorderColor?: string;
  buttonBorderRadius?: number;
  backgroundColor?: string;
  textColor?: string;
  paddingY?: number;
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
  qty?: number;
  sku?: string;
  product_id?: number;
  variant_name?: string;
  is_default: boolean;
  allow_quantity_selector?: boolean;
  is_featured?: boolean;
  featured_label?: string;
}

interface CrossSellProductData {
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  compare_price?: number;
  product_id?: number;
  badge_text?: string;
  suggestion_text?: string;
}

interface FormData {
  title: string;
  slug: string;
  description: string;
  template: string;
  hero_layout: string;
  show_hero_price: boolean;
  hero_subtitle_position: string;
  hero_image_url: string;
  hero_background_image_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_button_text: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  order_form_bg_color: string;
  order_form_card_bg_color: string;
  order_form_title_color: string;
  order_form_text_color: string;
  order_form_accent_color: string;
  order_form_border_color: string;
  order_form_button_bg_color: string;
  order_form_button_text_color: string;
  order_form_button_border_color: string;
  order_form_button_border_radius: number;
  footer_bg_color: string;
  footer_text_color: string;
  footer_link_bg_color: string;
  footer_link_text_color: string;
  footer_link_border_color: string;
  footer_link_border_radius: number;
  footer_border_color: string;
  btn_bg_color: string;
  btn_text_color: string;
  btn_border_color: string;
  btn_border_radius: number;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  sections: LandingPageSection[];
  products: LandingPageProduct[];
  phone_number: string;
  whatsapp_number: string;
  floating_whatsapp_color: string;
  floating_phone_color: string;
  show_order_form: boolean;
  cash_on_delivery: boolean;
  free_delivery: boolean;
  delivery_charge: number;
  delivery_charge_outside: number;
  delivery_note: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  cross_sell_product: CrossSellProductData | null;
}

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero Banner' },
  { value: 'benefits', label: 'Benefits / Features List' },
  { value: 'images', label: 'Image Gallery' },
  { value: 'trust', label: 'Trust / Why Choose Us' },
  { value: 'cta', label: 'Call to Action' },
  { value: 'custom-html', label: 'Custom HTML / Text' },
  { value: 'phone-cta', label: '📞 Phone / WhatsApp CTA' },
  { value: 'spacer', label: '↕️ Spacer / Gap' },
  { value: 'event-rules', label: '📋 Event Rules' },
  { value: 'event-prizes', label: '🏆 Event Prizes' },
  { value: 'event-how-to', label: '🎯 Event How-To Steps' },
  { value: 'event-countdown', label: '⏰ Event Countdown' },
];

const DEFAULT_SECTION: Omit<LandingPageSection, 'id' | 'order'> = {
  type: 'cta',
  title: '',
  content: '',
  items: [],
  images: [],
    buttonText: '',
    buttonColor: '',
    buttonTextColor: '',
    buttonBorderColor: 'transparent',
    buttonBorderRadius: 16,
    backgroundColor: '#FFFFFF',
  textColor: '#1a1a2e',
  paddingY: undefined,
  is_visible: true,
};

const VESHOJ_ASSET_BASE = 'https://beshoj.com/wp-content/uploads';

const createVeshojDefaultSections = (): LandingPageSection[] => [
  {
    id: 'veshoj-video',
    type: 'custom-html',
    title: 'আলহামদুলিল্লাহ্‌, ইতোমধ্যেই ১ লক্ষেরও বেশি মা–বোন সাদা স্রা-ব সমস্যার কার্যকর ও নিরাপদ সমাধান পেয়েছেন লিউকোন ফিমেল গার্ড ব্যবহারের মাধ্যমে।',
    content: '',
    images: [`${VESHOJ_ASSET_BASE}/2025/05/facebook-cover-veshoj-5.jpg.jpeg`],
    videoUrl: '',
    videoTitlePosition: 'below-video',
    buttonText: 'অর্ডার করুন',
    buttonLink: '#order-form',
    order: 1,
    is_visible: true,
  },
  {
    id: 'veshoj-symptoms',
    type: 'trust',
    title: 'এই লক্ষণগুলো কি আপনাকেও ভুগাচ্ছে?',
    content: 'এই লক্ষণগুলো অবহেলা করলে সাদা স্রা-ব বাড়তে পারে এবং জরায়ুর জটিল রোগের ঝুঁকি তৈরি হতে পারে।',
    items: [],
    order: 2,
    is_visible: true,
  },
  {
    id: 'veshoj-benefit-images',
    type: 'images',
    title: 'লিউকোন সেবনে যেসব সমস্যা দূর হবেঃ',
    images: [
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-1.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-2.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-3.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-4.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-5.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/for-web-infographic-6.jpg`,
    ],
    order: 3,
    is_visible: true,
  },
  {
    id: 'veshoj-usage',
    type: 'custom-html',
    title: 'খাওয়ার নিয়ম ও সময়',
    content: '<div class="veshoj-usage-main">প্রতিদিন - সকাল, দুপুর এবং রাতের খাবারের ৩০ মিনিট পর ২ টা করে বড়ি সেবন করতে হবে। রুচিলতা সেবনের নিয়ম: প্রতিদিন সকাল ও রাতে আধা চামচ রুচিলতা আধা গ্লাস পানিতে মিশিয়ে পান করুন।</div><div class="veshoj-usage-note">বি. দ্র: ঠান্ডা পানি, অতিরিক্ত ঝাল-মিষ্টি ও তেলযুক্ত খাবার খাওয়া থেকে বিরত থাকতে হবে।</div><div class="veshoj-usage-safe">আপনার ব্যবহারের জন্য সম্পূর্ণ নিরাপদ ও পরীক্ষিত – এখনই নিশ্চিত ব্যবহার করুন।</div>',
    order: 4,
    is_visible: true,
  },
  {
    id: 'veshoj-comments',
    type: 'images',
    title: 'সম্মানিত গ্রাহকের মন্তব্য',
    content: 'সম্মানিত কাস্টমারদের মতামত',
    images: [
      `${VESHOJ_ASSET_BASE}/2025/05/5.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/6.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/7-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/8-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/9.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/10-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/11-1-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/12-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/13-1024x1024.jpg`,
      `${VESHOJ_ASSET_BASE}/2025/05/14-1024x1024.jpg`,
    ],
    order: 5,
    is_visible: true,
  },
  {
    id: 'veshoj-phone',
    type: 'phone-cta',
    title: 'কল করে অর্ডার করতে চাই',
    buttonText: '01973-298146',
    order: 6,
    is_visible: true,
  },
];

export default function LandingPageEditor() {
  const router = useRouter();
  const { id } = router.query;
  const isEditing = id && id !== 'create';

  const [activeTab, setActiveTab] = useState<'general' | 'sections' | 'products' | 'order-form' | 'footer' | 'settings' | 'seo'>('general');
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Drag-and-drop state for sections
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    title: '',
    slug: '',
    description: '',
    template: 'classic',
    hero_layout: 'image-first',
    show_hero_price: true,
    hero_subtitle_position: 'above-image',
    hero_image_url: '',
    hero_background_image_url: '',
    hero_title: '',
    hero_subtitle: '',
    hero_button_text: 'অর্ডার করুন',
    primary_color: '#2d6a4f',
    secondary_color: '#FFFFFF',
    background_color: '#f0f4f0',
    order_form_bg_color: '#ffffff',
    order_form_card_bg_color: '#ffffff',
    order_form_title_color: '#1f2937',
    order_form_text_color: '#374151',
    order_form_accent_color: '#2d6a4f',
    order_form_border_color: '#e5e7eb',
    order_form_button_bg_color: '#16a34a',
    order_form_button_text_color: '#ffffff',
    order_form_button_border_color: 'transparent',
    order_form_button_border_radius: 16,
    footer_bg_color: '#111827',
    footer_text_color: '#ffffff',
    footer_link_bg_color: '#f59e0b',
    footer_link_text_color: '#111827',
    footer_link_border_color: 'transparent',
    footer_link_border_radius: 999,
    footer_border_color: '#1f2937',
    btn_bg_color: '#2d6a4f',
    btn_text_color: '#ffffff',
    btn_border_color: 'transparent',
    btn_border_radius: 16,
    meta_title: '',
    meta_description: '',
    og_image_url: '',
    sections: [],
    products: [],
    phone_number: '',
    whatsapp_number: '',
    floating_whatsapp_color: '#25D366',
    floating_phone_color: '#FF6B35',
    show_order_form: true,
    cash_on_delivery: true,
    free_delivery: false,
    delivery_charge: 80,
    delivery_charge_outside: 130,
    delivery_note: '',
    is_active: true,
    start_date: '',
    end_date: '',
    cross_sell_product: null,
  });

  useEffect(() => {
    if (isEditing) {
      apiClient.get(`/landing-pages/${id}`).then((res) => {
        const data = res.data;
        setForm({
          ...data,
          order_form_bg_color: data.order_form_bg_color || '#ffffff',
          order_form_card_bg_color: data.order_form_card_bg_color || '#ffffff',
          order_form_title_color: data.order_form_title_color || '#1f2937',
          order_form_text_color: data.order_form_text_color || '#374151',
          order_form_accent_color: data.order_form_accent_color || data.primary_color || '#2d6a4f',
          order_form_border_color: data.order_form_border_color || '#e5e7eb',
          order_form_button_bg_color: data.order_form_button_bg_color || data.btn_bg_color || '#16a34a',
          order_form_button_text_color: data.order_form_button_text_color || data.btn_text_color || '#ffffff',
          order_form_button_border_color: data.order_form_button_border_color || data.btn_border_color || 'transparent',
          order_form_button_border_radius: data.order_form_button_border_radius ?? data.btn_border_radius ?? 16,
          footer_bg_color: data.footer_bg_color || '#111827',
          footer_text_color: data.footer_text_color || '#ffffff',
          footer_link_bg_color: data.footer_link_bg_color || data.primary_color || '#f59e0b',
          footer_link_text_color: data.footer_link_text_color || '#111827',
          footer_link_border_color: data.footer_link_border_color || 'transparent',
          footer_link_border_radius: data.footer_link_border_radius ?? 999,
          footer_border_color: data.footer_border_color || '#1f2937',
          hero_background_image_url: data.hero_background_image_url || '',
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
        const res = await apiClient.put(`/landing-pages/${id}`, payload);
        setForm((prev) => ({ ...prev, ...res.data, start_date: prev.start_date, end_date: prev.end_date }));
      } else {
        const res = await apiClient.post('/landing-pages', payload);
        const newId = res.data?.id;
        if (newId) {
          router.replace(`/admin/landing-pages/${newId}`);
        }
      }
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

  const loadVeshojDefaultSections = () => {
    const shouldReplace = form.sections.length === 0 || window.confirm('Replace current sections with the default Veshoj editable sections?');
    if (!shouldReplace) return;

    const sections = createVeshojDefaultSections();
    setForm((prev) => ({ ...prev, sections }));
    setExpandedSections(new Set([sections[0].id]));
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

  // Drag-and-drop handlers for sections
  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSectionId(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);
    // Make the drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedSectionId(null);
    setDragOverSectionId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (sectionId !== draggedSectionId) {
      setDragOverSectionId(sectionId);
    }
  };

  const handleDragLeave = () => {
    setDragOverSectionId(null);
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (!draggedSectionId || draggedSectionId === targetSectionId) {
      setDraggedSectionId(null);
      setDragOverSectionId(null);
      return;
    }
    setForm((prev) => {
      const newSections = [...prev.sections];
      const dragIdx = newSections.findIndex((s) => s.id === draggedSectionId);
      const dropIdx = newSections.findIndex((s) => s.id === targetSectionId);
      if (dragIdx === -1 || dropIdx === -1) return prev;
      const [draggedSection] = newSections.splice(dragIdx, 1);
      newSections.splice(dropIdx, 0, draggedSection);
      return { ...prev, sections: newSections.map((s, i) => ({ ...s, order: i + 1 })) };
    });
    setDraggedSectionId(null);
    setDragOverSectionId(null);
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
          qty: 1,
          is_default: prev.products.length === 0,
          allow_quantity_selector: true,
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
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
          <div
            onClick={() => setForm((prev) => ({ ...prev, template: 'special-event' }))}
            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
              form.template === 'special-event'
                ? 'border-red-600 bg-white shadow-md ring-2 ring-red-300'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-700 to-yellow-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">🔥</div>
              <div>
                <div className="font-semibold text-gray-800">Special Event</div>
                <div className="text-xs text-gray-500">Challenge / Event — dark fiery theme</div>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-red-600 to-yellow-500"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-red-500 to-yellow-400"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-red-400 to-yellow-300"></div>
            </div>
          </div>
          <div
            onClick={() => setForm((prev) => ({ ...prev, template: 'free-offer' }))}
            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
              form.template === 'free-offer'
                ? 'border-yellow-500 bg-white shadow-md ring-2 ring-yellow-200'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-lg flex items-center justify-center text-white font-bold text-lg">F</div>
              <div>
                <div className="font-semibold text-gray-800">Free Offer</div>
                <div className="text-xs text-gray-500">Dark high-converting offer theme</div>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-yellow-600 to-yellow-500"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-yellow-500 to-yellow-400"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-yellow-400 to-yellow-300"></div>
            </div>
          </div>
          <div
            onClick={() => setForm((prev) => ({ ...prev, template: 'veshoj' }))}
            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
              form.template === 'veshoj'
                ? 'border-fuchsia-500 bg-white shadow-md ring-2 ring-fuchsia-200'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-700 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">V</div>
              <div>
                <div className="font-semibold text-gray-800">Veshoj</div>
                <div className="text-xs text-gray-500">Veshoj clone — purple Bengali checkout</div>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-fuchsia-600 to-orange-500"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-fuchsia-400 to-orange-400"></div>
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-fuchsia-200 to-orange-200"></div>
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

        {/* Hero Layout & Price Toggle */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hero Layout Order */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Hero Layout Order</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, hero_layout: 'image-first' }))}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-all flex flex-col items-center gap-1 ${
                    form.hero_layout === 'image-first'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">🖼️</span>
                  <span>Image First</span>
                  <span className="text-[10px] text-gray-400">Elegant style</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, hero_layout: 'title-first' }))}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-all flex flex-col items-center gap-1 ${
                    form.hero_layout === 'title-first'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">📝</span>
                  <span>Title First</span>
                  <span className="text-[10px] text-gray-400">Free Offer style</span>
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Controls whether the image or the title/subtitle appears first in the hero</p>
            </div>
            {/* Show Price in Hero */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Hero Price Display</label>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, show_hero_price: !prev.show_hero_price }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.show_hero_price ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.show_hero_price ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    {form.show_hero_price ? 'Price shown in hero' : 'Price hidden in hero'}
                  </div>
                  <p className="text-xs text-gray-400">Show product price preview in the hero section (Elegant template)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtitle Position — only visible when Title First */}
        {form.hero_layout === 'title-first' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Subtitle Position (Title First layout)</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, hero_subtitle_position: 'above-image' }))}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all flex items-center justify-center gap-2 ${
                  form.hero_subtitle_position === 'above-image'
                    ? 'border-blue-500 bg-blue-100 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span>⬆️</span>
                <span>Subtitle Above Image</span>
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, hero_subtitle_position: 'below-image' }))}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all flex items-center justify-center gap-2 ${
                  form.hero_subtitle_position === 'below-image'
                    ? 'border-blue-500 bg-blue-100 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span>⬇️</span>
                <span>Subtitle Below Image</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">When &quot;Title First&quot; is selected, choose where the subtitle text appears relative to the hero image</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <ImageUploadField
              label="Hero Image URL"
              value={form.hero_image_url}
              onChange={(url) => setForm((prev) => ({ ...prev, hero_image_url: url }))}
              placeholder="/seed-mix.jpg or https://..."
            />
            <div className="mt-4">
              <ImageUploadField
                label="Hero Background Image URL"
                value={form.hero_background_image_url || ''}
                onChange={(url) => setForm((prev) => ({ ...prev, hero_background_image_url: url }))}
                placeholder="/hero-bg.jpg or https://..."
                uploadPreset="hero-background"
              />
              <p className="text-xs text-gray-400 mt-1">Used as the hero section background for all templates. Upload a wide image, ideally 1920px or wider.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
              <textarea
                value={form.hero_title}
                onChange={(e) => setForm((prev) => ({ ...prev, hero_title: e.target.value }))}
                rows={2}
                className="w-full border rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-400 mt-1">Supports HTML: use <code className="bg-gray-100 px-1 rounded">&lt;small&gt;text&lt;/small&gt;</code> for smaller text, <code className="bg-gray-100 px-1 rounded">&lt;br /&gt;</code> for line breaks</p>
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
          <p className="text-xs text-gray-400 mt-1">Supports HTML: use <code className="bg-gray-100 px-1 rounded">&lt;small&gt;text&lt;/small&gt;</code> for smaller text, <code className="bg-gray-100 px-1 rounded">&lt;b&gt;text&lt;/b&gt;</code> for bold</p>
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

      {/* ── Button Style ── */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-1">Button Style</h3>
        <p className="text-xs text-gray-400 mb-3">All CTA and order buttons on this landing page will follow these settings.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Button Background</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.btn_bg_color}
                onChange={(e) => setForm((prev) => ({ ...prev, btn_bg_color: e.target.value }))}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={form.btn_bg_color}
                onChange={(e) => setForm((prev) => ({ ...prev, btn_bg_color: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Button Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.btn_text_color}
                onChange={(e) => setForm((prev) => ({ ...prev, btn_text_color: e.target.value }))}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={form.btn_text_color}
                onChange={(e) => setForm((prev) => ({ ...prev, btn_text_color: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Border Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.btn_border_color === 'transparent' ? '#000000' : form.btn_border_color}
                onChange={(e) => setForm((prev) => ({ ...prev, btn_border_color: e.target.value }))}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={form.btn_border_color}
                onChange={(e) => setForm((prev) => ({ ...prev, btn_border_color: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="transparent or #hex"
              />
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Border Radius: <span className="font-semibold">{form.btn_border_radius}px</span>
          </label>
          <input
            type="range"
            min={0}
            max={50}
            value={form.btn_border_radius}
            onChange={(e) => setForm((prev) => ({ ...prev, btn_border_radius: Number(e.target.value) }))}
            className="w-full accent-green-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>0px (square)</span><span>25px</span><span>50px (pill)</span></div>
        </div>
        {/* Live preview */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">Preview</p>
          <button
            type="button"
            style={{
              backgroundColor: form.btn_bg_color,
              color: form.btn_text_color,
              borderColor: form.btn_border_color,
              borderWidth: form.btn_border_color === 'transparent' ? 0 : 2,
              borderStyle: 'solid',
              borderRadius: form.btn_border_radius + 'px',
            }}
            className="px-8 py-3 font-bold text-base shadow transition-all"
          >
            অর্ডার করুন
          </button>
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
          {form.template === 'veshoj' && (
            <button
              type="button"
              onClick={loadVeshojDefaultSections}
              className="px-3 py-2 text-sm font-semibold rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-700"
            >
              Load Veshoj Sections
            </button>
          )}
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
        form.sections.map((section, sectionIndex) => (
          <div
            key={section.id}
            draggable
            onDragStart={(e) => handleDragStart(e, section.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, section.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, section.id)}
            className={`border rounded-lg transition-all duration-200 ${
              section.is_visible ? 'bg-white' : 'bg-gray-50 opacity-60'
            } ${
              draggedSectionId === section.id ? 'opacity-50 scale-[0.98]' : ''
            } ${
              dragOverSectionId === section.id && draggedSectionId !== section.id
                ? 'ring-2 ring-blue-400 ring-offset-2 border-blue-400'
                : ''
            }`}
          >
            {/* Drop indicator line */}
            {dragOverSectionId === section.id && draggedSectionId !== section.id && (
              <div className="h-0.5 bg-blue-500 rounded-full mx-2 -mt-px" />
            )}
            {/* Section Header */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-t-lg cursor-pointer select-none"
              onClick={() => toggleExpanded(section.id)}
            >
              <div className="flex items-center gap-3">
                <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 -ml-1" title="Drag to reorder">
                  <FaGripVertical />
                </div>
                <span className="text-xs font-bold text-gray-400 w-5 text-center">{sectionIndex + 1}</span>
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

                {/* ─── Spacer section: only height control ─── */}
                {section.type === 'spacer' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-800 mb-3">⬆️⬇️ Spacer / Gap Settings</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Height (px)</label>
                        <input
                          type="number"
                          min={4}
                          max={500}
                          value={section.paddingY ?? 40}
                          onChange={(e) => updateSection(section.id, { paddingY: parseInt(e.target.value) || 40 })}
                          className="w-full border rounded-lg px-3 py-2"
                          placeholder="40"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">Total height of the spacer in pixels (default: 40px)</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Background Color (optional)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={section.backgroundColor || '#FFFFFF'}
                            onChange={(e) => updateSection(section.id, { backgroundColor: e.target.value })}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={section.backgroundColor || ''}
                            onChange={(e) => updateSection(section.id, { backgroundColor: e.target.value })}
                            className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
                            placeholder="#FFFFFF or transparent"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 rounded border-2 border-dashed border-blue-300 bg-white text-center text-xs text-blue-500">
                      This renders as empty space of {section.paddingY ?? 40}px height between sections
                    </div>
                  </div>
                )}

                {/* ─── Phone CTA section ─── */}
                {section.type === 'phone-cta' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-green-800 mb-2">📞 Phone / WhatsApp CTA Section</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Headline Text</label>
                      <input
                        type="text"
                        value={section.title || ''}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="e.g. প্রশ্ন আছে? এখনই কল করুন অথবা হোয়াটসঅ্যাপ করুন!"
                      />
                      <p className="text-xs text-gray-400 mt-0.5">The text shown above the phone number link</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={section.backgroundColor || form.primary_color}
                            onChange={(e) => updateSection(section.id, { backgroundColor: e.target.value })}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={section.backgroundColor || form.primary_color}
                            onChange={(e) => updateSection(section.id, { backgroundColor: e.target.value })}
                            className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Text / Link Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={section.textColor || form.secondary_color || '#FFFFFF'}
                            onChange={(e) => updateSection(section.id, { textColor: e.target.value })}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={section.textColor || form.secondary_color || '#FFFFFF'}
                            onChange={(e) => updateSection(section.id, { textColor: e.target.value })}
                            className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      className="mt-2 p-3 rounded-lg text-center text-sm"
                      style={{ backgroundColor: section.backgroundColor || form.primary_color }}
                    >
                      <p className="opacity-80 text-xs mb-1" style={{ color: section.textColor || form.secondary_color || '#FFFFFF' }}>
                        {section.title || 'Headline text will appear here'}
                      </p>
                      <span className="font-bold text-base" style={{ color: section.textColor || form.secondary_color || '#FFFFFF' }}>
                        📞 {form.phone_number || '01XXXXXXXXX'}
                      </span>
                    </div>
                  </div>
                )}

                {/* ─── Standard section fields (not spacer, not phone-cta) ─── */}
                {section.type !== 'spacer' && section.type !== 'phone-cta' && (
                <>
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
                {(section.type === 'hero' || section.type === 'cta' || section.type === 'custom-html' || section.type === 'event-countdown') && (
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

                {form.template === 'veshoj' && section.type === 'custom-html' && (section.id === 'veshoj-video' || section.videoUrl !== undefined || (section.images || []).length > 0) && (
                  <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-fuchsia-900 mb-1">YouTube Video URL</label>
                      <input
                        type="url"
                        value={section.videoUrl || ''}
                        onChange={(e) => updateSection(section.id, { videoUrl: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      <p className="text-xs text-fuchsia-700 mt-1">For the Veshoj video/banner section, this renders as a playable embedded video.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-fuchsia-900 mb-2">Video Title Position</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => updateSection(section.id, { videoTitlePosition: 'above-video' })}
                          className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
                            section.videoTitlePosition === 'above-video'
                              ? 'border-fuchsia-600 bg-fuchsia-100 text-fuchsia-900'
                              : 'border-white bg-white text-gray-700 hover:border-fuchsia-200'
                          }`}
                        >
                          Title Above Video
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSection(section.id, { videoTitlePosition: 'below-video' })}
                          className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
                            (section.videoTitlePosition || 'below-video') === 'below-video'
                              ? 'border-fuchsia-600 bg-fuchsia-100 text-fuchsia-900'
                              : 'border-white bg-white text-gray-700 hover:border-fuchsia-200'
                          }`}
                        >
                          Title Below Video
                        </button>
                      </div>
                      <p className="text-xs text-fuchsia-700 mt-1">Uses the Section Title field above as the video title.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Video Thumbnail Image URL</label>
                      <input
                        type="text"
                        value={(section.images || [])[0] || ''}
                        onChange={(e) => updateSection(section.id, { images: e.target.value ? [e.target.value] : [] })}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="https://beshoj.com/wp-content/uploads/..."
                      />
                      <p className="text-xs text-gray-500 mt-1">Used when no YouTube URL is set.</p>
                    </div>
                  </div>
                )}

                {/* Button Text */}
                {(section.type === 'hero' || section.type === 'cta' || section.type === 'event-countdown') && (
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

                {/* Items (for benefits, trust, event sections) */}
                {(section.type === 'benefits' || section.type === 'trust' || section.type === 'event-rules' || section.type === 'event-prizes' || section.type === 'event-how-to') && (
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

                {/* Optional Button for Section */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Optional Button</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Button Text</label>
                      <input
                        type="text"
                        value={section.buttonText || ''}
                        onChange={(e) => updateSection(section.id, { buttonText: e.target.value })}
                        className="w-full border rounded px-3 py-1.5 text-sm"
                        placeholder="Leave empty to hide button"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Button Link</label>
                      <input
                        type="text"
                        value={section.buttonLink || ''}
                        onChange={(e) => updateSection(section.id, { buttonLink: e.target.value })}
                        className="w-full border rounded px-3 py-1.5 text-sm"
                        placeholder="#order-form or https://..."
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 italic">Leave colors empty to use the General tab's default button style.</p>
                  {section.buttonText && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Button Background</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={section.buttonColor || form.btn_bg_color || '#2d6a4f'}
                              onChange={(e) => updateSection(section.id, { buttonColor: e.target.value })}
                              className="w-9 h-9 rounded border cursor-pointer"
                            />
                            <input
                              type="text"
                              value={section.buttonColor || ''}
                              onChange={(e) => updateSection(section.id, { buttonColor: e.target.value })}
                              className="flex-1 border rounded px-3 py-1.5 text-sm"
                              placeholder={form.btn_bg_color || '#2d6a4f'}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Button Text Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={section.buttonTextColor || form.btn_text_color || '#ffffff'}
                              onChange={(e) => updateSection(section.id, { buttonTextColor: e.target.value })}
                              className="w-9 h-9 rounded border cursor-pointer"
                            />
                            <input
                              type="text"
                              value={section.buttonTextColor || ''}
                              onChange={(e) => updateSection(section.id, { buttonTextColor: e.target.value })}
                              className="flex-1 border rounded px-3 py-1.5 text-sm"
                              placeholder={form.btn_text_color || '#ffffff'}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Button Border Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={section.buttonBorderColor && section.buttonBorderColor !== 'transparent' ? section.buttonBorderColor : '#000000'}
                              onChange={(e) => updateSection(section.id, { buttonBorderColor: e.target.value })}
                              className="w-9 h-9 rounded border cursor-pointer"
                            />
                            <input
                              type="text"
                              value={section.buttonBorderColor || ''}
                              onChange={(e) => updateSection(section.id, { buttonBorderColor: e.target.value })}
                              className="flex-1 border rounded px-3 py-1.5 text-sm"
                              placeholder="transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Button Radius: {section.buttonBorderRadius ?? form.btn_border_radius ?? 16}px</label>
                          <input
                            type="range"
                            min="0"
                            max="48"
                            value={section.buttonBorderRadius ?? form.btn_border_radius ?? 16}
                            onChange={(e) => updateSection(section.id, { buttonBorderRadius: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mt-3 px-5 py-2 font-bold"
                        style={{
                          backgroundColor: section.buttonColor || form.btn_bg_color,
                          color: section.buttonTextColor || form.btn_text_color,
                          borderColor: section.buttonBorderColor || form.btn_border_color || 'transparent',
                          borderWidth: section.buttonBorderColor && section.buttonBorderColor !== 'transparent' ? 2 : 0,
                          borderStyle: 'solid',
                          borderRadius: `${section.buttonBorderRadius ?? form.btn_border_radius ?? 16}px`,
                        }}
                      >
                        {section.buttonText}
                      </button>
                    </div>
                  )}
                </div>
                </>
                )} {/* end: not spacer / not phone-cta */}
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
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={product.allow_quantity_selector !== false}
                      onChange={(e) => updateProduct(product.id, { allow_quantity_selector: e.target.checked })}
                      className="sr-only peer"
                    />
                    <span className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-colors" />
                    <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                  </span>
                  Qty +/-
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
              <div>
                <label className="block text-xs text-gray-500 mb-1">Qty (per order)</label>
                <input
                  type="number"
                  min="1"
                  value={product.qty || 1}
                  onChange={(e) => updateProduct(product.id, { qty: parseInt(e.target.value) || 1 })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="1"
                />
                <p className="text-xs text-gray-400 mt-0.5">How many units per selection (e.g. 2 for double pack)</p>
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

      {/* ─── Cross-Sell Product Suggestion ─── */}
      <div className="mt-8 border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              🎁 Cross-Sell Product Suggestion
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Add an optional product suggestion with a checkbox. When checked by the customer, it gets added to their order.
            </p>
          </div>
          {form.cross_sell_product ? (
            <button
              onClick={() => setForm((prev) => ({ ...prev, cross_sell_product: null }))}
              className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition"
            >
              <FaTrash className="text-xs" /> Remove
            </button>
          ) : (
            <button
              onClick={() => setForm((prev) => ({
                ...prev,
                cross_sell_product: {
                  name: '',
                  description: '',
                  image_url: '',
                  price: 0,
                  compare_price: 0,
                  badge_text: '🎁 সাথে নিন',
                  suggestion_text: 'এটিও সাথে নিতে চাই',
                },
              }))}
              className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-green-700 transition"
            >
              <FaPlus /> Add Cross-Sell Product
            </button>
          )}
        </div>

        {form.cross_sell_product && (
          <div className="border-2 border-green-200 rounded-xl p-5 bg-green-50/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={form.cross_sell_product.name}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    cross_sell_product: { ...prev.cross_sell_product!, name: e.target.value },
                  }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="e.g. হারবোরা ফুল কোর্স"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price (৳) *</label>
                <input
                  type="number"
                  value={form.cross_sell_product.price}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    cross_sell_product: { ...prev.cross_sell_product!, price: parseFloat(e.target.value) || 0 },
                  }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Compare Price (৳)</label>
                <input
                  type="number"
                  value={form.cross_sell_product.compare_price || ''}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    cross_sell_product: { ...prev.cross_sell_product!, compare_price: parseFloat(e.target.value) || 0 },
                  }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <ImageUploadField
                label="Image URL"
                value={form.cross_sell_product.image_url || ''}
                onChange={(url) => setForm((prev) => ({
                  ...prev,
                  cross_sell_product: { ...prev.cross_sell_product!, image_url: url },
                }))}
                placeholder="/product-image.jpg"
                inputClassName="w-full border rounded px-3 py-2 text-sm"
                labelClassName="block text-xs text-gray-500 mb-1"
              />
              <ProductSearchField
                productId={form.cross_sell_product.product_id}
                onSelect={(data) => setForm((prev) => ({
                  ...prev,
                  cross_sell_product: {
                    ...prev.cross_sell_product!,
                    product_id: data.product_id,
                    ...(data.name ? { name: data.name } : {}),
                    ...(data.price ? { price: data.price } : {}),
                    ...(data.compare_price ? { compare_price: data.compare_price } : {}),
                    ...(data.image_url ? { image_url: data.image_url } : {}),
                  },
                }))}
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  value={form.cross_sell_product.description || ''}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    cross_sell_product: { ...prev.cross_sell_product!, description: e.target.value },
                  }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Short product description"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Badge Text</label>
                <input
                  type="text"
                  value={form.cross_sell_product.badge_text || ''}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    cross_sell_product: { ...prev.cross_sell_product!, badge_text: e.target.value },
                  }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="e.g. 🎁 সাথে নিন"
                />
                <p className="text-xs text-gray-400 mt-0.5">Badge shown on the card corner</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Checkbox Label</label>
                <input
                  type="text"
                  value={form.cross_sell_product.suggestion_text || ''}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    cross_sell_product: { ...prev.cross_sell_product!, suggestion_text: e.target.value },
                  }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="e.g. এটিও সাথে নিতে চাই"
                />
                <p className="text-xs text-gray-400 mt-0.5">Text shown next to the checkbox</p>
              </div>
            </div>
          </div>
        )}
      </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Button Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form.floating_phone_color || '#FF6B35'}
                onChange={(e) => setForm((prev) => ({ ...prev, floating_phone_color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border"
              />
              <input
                type="text"
                value={form.floating_phone_color || '#FF6B35'}
                onChange={(e) => setForm((prev) => ({ ...prev, floating_phone_color: e.target.value }))}
                className="flex-1 border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Button Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form.floating_whatsapp_color || '#25D366'}
                onChange={(e) => setForm((prev) => ({ ...prev, floating_whatsapp_color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border"
              />
              <input
                type="text"
                value={form.floating_whatsapp_color || '#25D366'}
                onChange={(e) => setForm((prev) => ({ ...prev, floating_whatsapp_color: e.target.value }))}
                className="flex-1 border rounded-lg px-3 py-2"
              />
            </div>
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

            {/* Same / Different toggle */}
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium text-gray-700">Charge Type:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // When switching to same, sync outside to inside value
                    setForm((prev) => ({ ...prev, delivery_charge_outside: prev.delivery_charge }));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                    Number(form.delivery_charge) === Number(form.delivery_charge_outside)
                      ? 'border-orange-500 bg-orange-100 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Same Everywhere
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // When switching to different, set outside to a higher default if they're the same
                    if (Number(form.delivery_charge) === Number(form.delivery_charge_outside)) {
                      setForm((prev) => ({ ...prev, delivery_charge_outside: prev.delivery_charge + 50 }));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                    Number(form.delivery_charge) !== Number(form.delivery_charge_outside)
                      ? 'border-orange-500 bg-orange-100 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Inside / Outside Dhaka
                </button>
              </div>
            </div>

            {Number(form.delivery_charge) === Number(form.delivery_charge_outside) ? (
              /* Same charge — single input */
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charge (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.delivery_charge}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setForm((prev) => ({ ...prev, delivery_charge: val, delivery_charge_outside: val }));
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g. 100"
                />
                <p className="text-xs text-gray-500 mt-1">Same delivery charge for all areas</p>
              </div>
            ) : (
              /* Different charges — two inputs */
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
            )}
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
  type ColorFormField =
    | 'order_form_bg_color'
    | 'order_form_card_bg_color'
    | 'order_form_title_color'
    | 'order_form_text_color'
    | 'order_form_accent_color'
    | 'order_form_border_color'
    | 'order_form_button_bg_color'
    | 'order_form_button_text_color'
    | 'order_form_button_border_color'
    | 'footer_bg_color'
    | 'footer_text_color'
    | 'footer_link_bg_color'
    | 'footer_link_text_color'
    | 'footer_link_border_color'
    | 'footer_border_color';

  const renderColorControl = (
    label: string,
    field: ColorFormField,
    description?: string,
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={form[field] || '#000000'}
          onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
          className="w-10 h-10 rounded cursor-pointer border"
        />
        <input
          type="text"
          value={form[field] || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
          className="flex-1 border rounded-lg px-3 py-2"
        />
      </div>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  );

  const renderOrderFormTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Order Form Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderColorControl('Section Background', 'order_form_bg_color', 'Outer background behind the order form.')}
          {renderColorControl('Card Background', 'order_form_card_bg_color', 'Background for form/product/summary cards.')}
          {renderColorControl('Title Color', 'order_form_title_color', 'Main order form headings and section titles.')}
          {renderColorControl('Font Color', 'order_form_text_color', 'Labels, product text, and summary text.')}
          {renderColorControl('Accent Color', 'order_form_accent_color', 'Selected states, badges, totals, and small accents.')}
          {renderColorControl('Border Color', 'order_form_border_color', 'Card/input borders and dividers.')}
          {renderColorControl('Submit Button Background', 'order_form_button_bg_color')}
          {renderColorControl('Submit Button Text', 'order_form_button_text_color')}
          {renderColorControl('Submit Button Border', 'order_form_button_border_color')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Submit Button Radius: <span className="font-semibold">{form.order_form_button_border_radius}px</span>
            </label>
            <input
              type="range"
              min="0"
              max="48"
              value={form.order_form_button_border_radius}
              onChange={(e) => setForm((prev) => ({ ...prev, order_form_button_border_radius: Number(e.target.value) }))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="border rounded-xl p-4" style={{ backgroundColor: form.order_form_bg_color }}>
        <div
          className="rounded-lg p-4 border"
          style={{
            backgroundColor: form.order_form_card_bg_color,
            borderColor: form.order_form_border_color,
            color: form.order_form_text_color,
          }}
        >
          <h4 className="font-bold mb-2" style={{ color: form.order_form_title_color }}>Order Form Preview</h4>
          <p className="text-sm mb-3">This preview shows how the order form color scheme will read on the landing page.</p>
          <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: form.order_form_border_color }}>
            <span className="font-medium">Total</span>
            <span className="font-extrabold" style={{ color: form.order_form_accent_color }}>৳ 1,250</span>
          </div>
          <button
            type="button"
            className="mt-4 w-full py-3 font-bold"
            style={{
              backgroundColor: form.order_form_button_bg_color,
              color: form.order_form_button_text_color,
              borderColor: form.order_form_button_border_color,
              borderWidth: form.order_form_button_border_color && form.order_form_button_border_color !== 'transparent' ? 2 : 0,
              borderStyle: 'solid',
              borderRadius: `${form.order_form_button_border_radius}px`,
            }}
          >
            Confirm Order
          </button>
        </div>
      </div>
    </div>
  );

  const renderFooterTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Footer Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderColorControl('Footer Background', 'footer_bg_color', 'Main footer background color.')}
          {renderColorControl('Footer Text Color', 'footer_text_color', 'Footer message and copyright text.')}
          {renderColorControl('Link Button Background', 'footer_link_bg_color', 'Background color for the website link button.')}
          {renderColorControl('Link Button Text', 'footer_link_text_color', 'Text color for the website link button.')}
          {renderColorControl('Link Button Border', 'footer_link_border_color', 'Border color for the website link button.')}
          {renderColorControl('Footer Border Color', 'footer_border_color', 'Top border/divider color.')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link Button Radius: <span className="font-semibold">{form.footer_link_border_radius}px</span>
            </label>
            <input
              type="range"
              min="0"
              max="999"
              value={form.footer_link_border_radius}
              onChange={(e) => setForm((prev) => ({ ...prev, footer_link_border_radius: Number(e.target.value) }))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border p-6 text-center space-y-4"
        style={{ backgroundColor: form.footer_bg_color, borderColor: form.footer_border_color, color: form.footer_text_color }}
      >
        <p className="font-semibold">আমাদের আরো প্রোডাক্ট পেতে ভিজিট করুন</p>
        <span
          className="inline-flex items-center px-6 py-2.5 rounded-full font-bold text-sm"
          style={{
            backgroundColor: form.footer_link_bg_color,
            color: form.footer_link_text_color,
            borderColor: form.footer_link_border_color,
            borderWidth: form.footer_link_border_color && form.footer_link_border_color !== 'transparent' ? 2 : 0,
            borderStyle: 'solid',
            borderRadius: `${form.footer_link_border_radius}px`,
          }}
        >
          trustcart.com.bd
        </span>
        <p className="text-sm opacity-75">© {new Date().getFullYear()} TrustCart. All rights reserved.</p>
      </div>
    </div>
  );

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
    { key: 'order-form', label: 'Order Form' },
    { key: 'footer', label: 'Footer' },
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
          {activeTab === 'order-form' && renderOrderFormTab()}
          {activeTab === 'footer' && renderFooterTab()}
          {activeTab === 'settings' && renderSettingsTab()}
          {activeTab === 'seo' && renderSeoTab()}
        </div>
      </div>
    </AdminLayout>
  );
}
