import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaSave, FaArrowLeft, FaPlus, FaTrash, FaEye, FaGripVertical, FaChevronDown, FaChevronUp } from 'react-icons/fa';

// Simple unique ID generator (no uuid dependency needed)
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

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
  is_default: boolean;
}

interface FormData {
  title: string;
  slug: string;
  description: string;
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
            <input
              type="text"
              value={form.hero_image_url}
              onChange={(e) => setForm((prev) => ({ ...prev, hero_image_url: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="/seed-mix.jpg or https://..."
            />
            {form.hero_image_url && (
              <img src={form.hero_image_url} alt="Hero preview" className="mt-2 w-40 h-28 object-cover rounded" />
            )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URLs (one per line)</label>
                    <textarea
                      value={(section.images || []).join('\n')}
                      onChange={(e) => updateSection(section.id, { images: e.target.value.split('\n').filter(Boolean) })}
                      rows={4}
                      className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                      placeholder="/image1.jpg&#10;/image2.jpg"
                    />
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
                <label className="block text-xs text-gray-500 mb-1">Image URL</label>
                <input
                  type="text"
                  value={product.image_url || ''}
                  onChange={(e) => updateProduct(product.id, { image_url: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="/seed-mix.jpg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Linked Product ID</label>
                <input
                  type="number"
                  value={product.product_id || ''}
                  onChange={(e) => updateProduct(product.id, { product_id: parseInt(e.target.value) || undefined })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="e.g. 396 (from All Products)"
                />
                <p className="text-xs text-gray-400 mt-0.5">Link to a real product for order tracking &amp; images</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  value={product.description || ''}
                  onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">OG Image URL</label>
        <input
          type="text"
          value={form.og_image_url}
          onChange={(e) => setForm((prev) => ({ ...prev, og_image_url: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2"
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
