// LP Maker — drag-and-drop landing page builder.
// Pages are ordinary landing_pages rows with template='builder'; blocks
// live in builder_blocks and render on the public site at /lp/<slug>.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import {
  FaArrowLeft, FaSave, FaExternalLinkAlt, FaTrash, FaCopy, FaArrowUp, FaArrowDown,
  FaDesktop, FaMobileAlt, FaGripVertical, FaPlus, FaTimes, FaSearch,
} from 'react-icons/fa';
import {
  Block, BLOCK_DEFS, BLOCK_MAP, Field, newBlock, starterBlocks, BuilderProduct,
} from '@/components/lp-maker/blocks';
import BlockRenderer from '@/components/lp-maker/BlockRenderer';

interface PageMeta {
  title: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  background_color: string;
  free_delivery: boolean;
  delivery_charge: number;
  delivery_charge_outside: number;
  delivery_note: string;
  phone_number: string;
  whatsapp_number: string;
  is_active: boolean;
}

const EMPTY_META: PageMeta = {
  title: '',
  slug: '',
  meta_title: '',
  meta_description: '',
  og_image_url: '',
  background_color: '#ffffff',
  free_delivery: false,
  delivery_charge: 60,
  delivery_charge_outside: 110,
  delivery_note: '',
  phone_number: '',
  whatsapp_number: '',
  is_active: false,
};

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9ঀ-৿]+/g, '-').replace(/^-+|-+$/g, '');

export default function LpMakerEditor() {
  const router = useRouter();
  const rawId = router.query.id;
  const isCreate = rawId === 'create';
  const pageId = !isCreate && rawId ? Number(rawId) : null;

  const [meta, setMeta] = useState<PageMeta>(EMPTY_META);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<'block' | 'page'>('page');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const savedIdRef = useRef<number | null>(pageId);

  // Load existing page
  useEffect(() => {
    if (!router.isReady) return;
    if (isCreate) {
      setBlocks(starterBlocks());
      setLoading(false);
      return;
    }
    if (!pageId) return;
    savedIdRef.current = pageId;
    apiClient.get(`/landing-pages/${pageId}`).then((res) => {
      const d = res.data;
      setMeta({
        title: d.title || '',
        slug: d.slug || '',
        meta_title: d.meta_title || '',
        meta_description: d.meta_description || '',
        og_image_url: d.og_image_url || '',
        background_color: d.background_color || '#ffffff',
        free_delivery: !!d.free_delivery,
        delivery_charge: Number(d.delivery_charge || 0),
        delivery_charge_outside: Number(d.delivery_charge_outside || 0),
        delivery_note: d.delivery_note || '',
        phone_number: d.phone_number || '',
        whatsapp_number: d.whatsapp_number || '',
        is_active: !!d.is_active,
      });
      setBlocks(Array.isArray(d.builder_blocks) && d.builder_blocks.length > 0 ? d.builder_blocks : starterBlocks());
    }).catch((err) => {
      console.error('Failed to load page:', err);
      alert('Failed to load the page.');
      router.push('/admin/lp-maker');
    }).finally(() => setLoading(false));
  }, [router.isReady, isCreate, pageId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn about unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const touch = () => setDirty(true);

  const selected = blocks.find((b) => b.id === selectedId) || null;

  // ── Block operations ──
  const addBlock = (type: string) => {
    const b = newBlock(type);
    setBlocks((prev) => [...prev, b]);
    setSelectedId(b.id);
    setPanelTab('block');
    touch();
  };

  const updateSelectedProps = (patch: Record<string, any>) => {
    if (!selectedId) return;
    setBlocks((prev) => prev.map((b) => (b.id === selectedId ? { ...b, props: { ...b.props, ...patch } } : b)));
    touch();
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
    touch();
  };

  const duplicateBlock = (id: string) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      if (i < 0) return prev;
      const copy: Block = { ...newBlock(prev[i].type), props: JSON.parse(JSON.stringify(prev[i].props)) };
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
    touch();
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    touch();
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination!.index, 0, moved);
      return next;
    });
    touch();
  };

  // ── Save ──
  const save = async () => {
    if (!meta.title.trim() || !meta.slug.trim()) {
      setPanelTab('page');
      alert('Give the page a title and a slug first (Page settings).');
      return;
    }
    try {
      setSaving(true);
      const payload = { ...meta, template: 'builder', builder_blocks: blocks };
      if (savedIdRef.current) {
        await apiClient.put(`/landing-pages/${savedIdRef.current}`, payload);
      } else {
        const res = await apiClient.post('/landing-pages', payload);
        const newId = res.data?.id;
        savedIdRef.current = newId;
        router.replace(`/admin/lp-maker/${newId}`, undefined, { shallow: true });
      }
      setDirty(false);
      setSavedAt(new Date());
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Save failed (the slug may already be in use).');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-center py-16 text-gray-500">Loading builder…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* ── Top bar ── */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200">
          <Link href="/admin/lp-maker" className="text-gray-400 hover:text-gray-900 p-1"><FaArrowLeft /></Link>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-gray-900 truncate">{meta.title || 'Untitled page'}</span>
            <span className="ml-2 text-xs text-gray-400 font-mono">/lp/{meta.slug || '…'}</span>
            {dirty && <span className="ml-2 text-xs text-amber-600 font-medium">● unsaved</span>}
            {!dirty && savedAt && <span className="ml-2 text-xs text-green-600">saved ✓</span>}
          </div>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setDevice('desktop')}
              className={`px-3 py-2 text-sm ${device === 'desktop' ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
              title="Desktop preview"
            >
              <FaDesktop />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`px-3 py-2 text-sm ${device === 'mobile' ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
              title="Mobile preview"
            >
              <FaMobileAlt />
            </button>
          </div>
          {savedIdRef.current && meta.slug && (
            <a
              href={`/lp/${meta.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:text-gray-900 flex items-center gap-2"
            >
              <FaExternalLinkAlt /> Preview
            </a>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <FaSave /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* ── Three panes ── */}
        <div className="flex flex-1 min-h-0">
          {/* Palette */}
          <aside className="w-52 shrink-0 bg-white border-r border-gray-200 overflow-y-auto p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Blocks</p>
            <div className="space-y-1.5">
              {BLOCK_DEFS.map((def) => (
                <button
                  key={def.type}
                  onClick={() => addBlock(def.type)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-gray-100 hover:border-brand hover:bg-orange-50 text-left transition-colors"
                  title={def.description}
                >
                  <span className="text-lg leading-none">{def.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{def.label}</span>
                  <FaPlus className="ml-auto text-[10px] text-gray-300" />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
              Click to add. Drag blocks in the canvas to reorder.
            </p>
          </aside>

          {/* Canvas */}
          <main className="flex-1 min-w-0 overflow-y-auto bg-gray-100 p-6">
            <div
              className="mx-auto shadow-xl transition-all duration-300 min-h-full"
              style={{ maxWidth: device === 'mobile' ? 400 : 900, background: meta.background_color }}
            >
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="canvas">
                  {(dropProvided) => (
                    <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                      {blocks.length === 0 && (
                        <div className="p-16 text-center text-gray-400 text-sm">
                          Empty page — add blocks from the left panel.
                        </div>
                      )}
                      {blocks.map((block, index) => (
                        <Draggable key={block.id} draggableId={block.id} index={index}>
                          {(dragProvided, snapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              onClick={() => { setSelectedId(block.id); setPanelTab('block'); }}
                              className="relative group"
                              style={{
                                ...dragProvided.draggableProps.style,
                                outline: selectedId === block.id
                                  ? '2px solid #ea580c'
                                  : snapshot.isDragging ? '2px dashed #fdba74' : undefined,
                                outlineOffset: -2,
                              }}
                            >
                              {/* Hover toolbar */}
                              <div className={`absolute top-1.5 right-1.5 z-10 flex items-center gap-1 bg-gray-900/85 rounded-lg px-1.5 py-1 transition-opacity ${selectedId === block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <span
                                  {...dragProvided.dragHandleProps}
                                  className="text-white/70 hover:text-white cursor-grab px-1"
                                  title="Drag to reorder"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FaGripVertical size={11} />
                                </span>
                                <span className="text-[10px] text-white/60 pr-1 border-r border-white/20">
                                  {BLOCK_MAP[block.type]?.label || block.type}
                                </span>
                                <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, -1); }} className="text-white/70 hover:text-white p-1" title="Move up"><FaArrowUp size={10} /></button>
                                <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 1); }} className="text-white/70 hover:text-white p-1" title="Move down"><FaArrowDown size={10} /></button>
                                <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className="text-white/70 hover:text-white p-1" title="Duplicate"><FaCopy size={10} /></button>
                                <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="text-white/70 hover:text-red-400 p-1" title="Delete"><FaTrash size={10} /></button>
                              </div>
                              {/* Block preview — non-interactive in the canvas */}
                              <div style={{ pointerEvents: 'none' }}>
                                <BlockRenderer block={block} />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {dropProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </main>

          {/* Settings panel */}
          <aside className="w-80 shrink-0 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
              {(['block', 'page'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPanelTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium border-b-2 -mb-px ${panelTab === tab ? 'border-brand text-brand' : 'border-transparent text-gray-500'}`}
                >
                  {tab === 'block' ? 'Block' : 'Page settings'}
                </button>
              ))}
            </div>
            <div className="p-4">
              {panelTab === 'block' ? (
                selected ? (
                  <BlockSettings
                    key={selected.id}
                    block={selected}
                    onChange={updateSelectedProps}
                  />
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Select a block in the canvas to edit it.</p>
                )
              ) : (
                <PageSettings meta={meta} isCreate={!savedIdRef.current} onChange={(patch) => { setMeta((m) => ({ ...m, ...patch })); touch(); }} />
              )}
            </div>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Block settings (schema-driven) ──────────────────────────

function BlockSettings({ block, onChange }: { block: Block; onChange: (patch: Record<string, any>) => void }) {
  const def = BLOCK_MAP[block.type];
  if (!def) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-1">
        <span className="text-lg">{def.icon}</span>
        <span className="font-semibold text-gray-900">{def.label}</span>
      </div>
      {def.fields.map((field) => {
        if (field.showIf && !field.showIf(block.props)) return null;
        return (
          <FieldInput
            key={field.key}
            field={field}
            value={block.props[field.key]}
            onChange={(v) => onChange({ [field.key]: v })}
          />
        );
      })}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const label = <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>;
  const base = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm';

  switch (field.type) {
    case 'text':
      return <div>{label}<input className={base} value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} /></div>;
    case 'textarea':
      return <div>{label}<textarea className={base} rows={4} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></div>;
    case 'number':
      return (
        <div>{label}
          <input
            type="number" className={base} value={value ?? ''} min={field.min} max={field.max}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      );
    case 'color':
      return (
        <div>{label}
          <div className="flex gap-2">
            <input type="color" value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value || '') ? value : '#000000'} onChange={(e) => onChange(e.target.value)} className="w-10 h-9 border border-gray-300 rounded cursor-pointer" />
            <input className={`${base} font-mono`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
          </div>
        </div>
      );
    case 'select':
      return (
        <div>{label}
          <select className={`${base} bg-white`} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            {(field.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    case 'toggle':
      return (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {field.label}
        </label>
      );
    case 'datetime':
      return <div>{label}<input type="datetime-local" className={base} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></div>;
    case 'image':
      return <div>{label}<ImageField value={value ?? ''} onChange={onChange} /></div>;
    case 'images':
      return <div>{label}<ImagesField value={value || []} onChange={onChange} /></div>;
    case 'items':
      return <div>{label}<ItemsField value={value || []} onChange={onChange} /></div>;
    case 'products':
      return <div>{label}<ProductsField value={value || []} onChange={onChange} /></div>;
    default:
      return null;
  }
}

// ─── Image upload field (uses the shared /upload/image endpoint) ──

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data?.url) onChange(res.data.url);
    } catch {
      alert('Image upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <input
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        value={value}
        placeholder="https://…"
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <label className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg cursor-pointer text-gray-600 hover:bg-gray-50">
          {uploading ? 'Uploading…' : '⬆ Upload'}
          <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} />
        </label>
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-9 w-9 rounded object-cover border border-gray-200" />
        )}
      </div>
    </div>
  );
}

function ImagesField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {value.map((url, i) => (
        <div key={i} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-9 w-9 rounded object-cover border border-gray-200" />
          <input
            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-mono"
            value={url}
            onChange={(e) => onChange(value.map((u, j) => (j === i ? e.target.value : u)))}
          />
          <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><FaTimes size={12} /></button>
        </div>
      ))}
      <ImageField value="" onChange={(url) => url && onChange([...value, url])} />
    </div>
  );
}

function ItemsField({ value, onChange }: { value: { icon: string; text: string }[]; onChange: (v: any[]) => void }) {
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            className="w-12 border border-gray-300 rounded-lg px-1.5 py-1.5 text-sm text-center"
            value={item.icon}
            onChange={(e) => onChange(value.map((it, j) => (j === i ? { ...it, icon: e.target.value } : it)))}
          />
          <input
            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
            value={item.text}
            onChange={(e) => onChange(value.map((it, j) => (j === i ? { ...it, text: e.target.value } : it)))}
          />
          <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><FaTimes size={12} /></button>
        </div>
      ))}
      <button
        onClick={() => onChange([...value, { icon: '✅', text: '' }])}
        className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1"
      >
        <FaPlus size={9} /> Add item
      </button>
    </div>
  );
}

// ─── Product picker (from inventory, like landing pages) ─────

function ProductsField({ value, onChange }: { value: BuilderProduct[]; onChange: (v: BuilderProduct[]) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    try {
      const res = await apiClient.get(`/products/admin/search?q=${encodeURIComponent(q)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setResults(list.slice(0, 8));
      setOpen(true);
    } catch { setResults([]); }
  }, []);

  const addProduct = (prod: any) => {
    const price = Number(prod.sale_price ?? prod.base_price ?? prod.price ?? 0);
    const compare = prod.sale_price && Number(prod.sale_price) < Number(prod.base_price) ? Number(prod.base_price) : undefined;
    onChange([
      ...value,
      {
        id: `p_${Date.now().toString(36)}`,
        product_id: prod.id,
        name: prod.name_en || prod.name,
        image_url: prod.image_url || undefined,
        price,
        compare_price: compare,
        is_default: value.length === 0,
      },
    ]);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {value.map((prod, i) => (
        <div key={prod.id} className="border border-gray-200 rounded-lg p-2 space-y-1.5">
          <div className="flex items-center gap-2">
            {prod.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prod.image_url} alt="" className="w-8 h-8 rounded object-cover" />
            ) : <div className="w-8 h-8 rounded bg-gray-100" />}
            <span className="flex-1 text-xs font-medium text-gray-800 truncate">{prod.name}</span>
            <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><FaTimes size={12} /></button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-500">Price ৳</label>
            <input
              type="number"
              className="w-20 border border-gray-300 rounded px-1.5 py-1 text-xs"
              value={prod.price}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) || 0 } : x)))}
            />
            <label className="text-[11px] text-gray-500 flex items-center gap-1 ml-auto">
              <input
                type="radio"
                name="lpmaker-default-product"
                checked={!!prod.is_default}
                onChange={() => onChange(value.map((x, j) => ({ ...x, is_default: j === i })))}
              />
              Default
            </label>
          </div>
        </div>
      ))}
      <div ref={boxRef} className="relative">
        <div className="flex items-center border border-gray-300 rounded-lg px-2">
          <FaSearch className="text-gray-300" size={11} />
          <input
            className="flex-1 px-2 py-1.5 text-sm outline-none"
            value={query}
            placeholder="Search inventory…"
            onChange={(e) => {
              setQuery(e.target.value);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => search(e.target.value), 300);
            }}
          />
        </div>
        {open && results.length > 0 && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {results.map((prod) => (
              <button
                key={prod.id}
                onClick={() => addProduct(prod)}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-gray-50"
              >
                {prod.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={prod.image_url} alt="" className="w-7 h-7 rounded object-cover" />
                ) : <div className="w-7 h-7 rounded bg-gray-100" />}
                <span className="flex-1 text-xs text-gray-800 truncate">{prod.name_en || prod.name}</span>
                <span className="text-[11px] text-gray-500">৳{Number(prod.sale_price ?? prod.base_price ?? 0).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page settings tab ───────────────────────────────────────

function PageSettings({
  meta, isCreate, onChange,
}: {
  meta: PageMeta;
  isCreate: boolean;
  onChange: (patch: Partial<PageMeta>) => void;
}) {
  const base = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm';
  const label = 'block text-xs font-medium text-gray-600 mb-1';
  return (
    <div className="space-y-4">
      <div>
        <label className={label}>Page title *</label>
        <input
          className={base}
          value={meta.title}
          onChange={(e) => onChange({
            title: e.target.value,
            ...(isCreate ? { slug: slugify(e.target.value) } : {}),
          })}
        />
      </div>
      <div>
        <label className={label}>Slug * <span className="text-gray-400 font-normal">(public URL: /lp/…)</span></label>
        <input className={`${base} font-mono`} value={meta.slug} onChange={(e) => onChange({ slug: slugify(e.target.value) })} />
      </div>
      <div>
        <label className={label}>Page background</label>
        <div className="flex gap-2">
          <input type="color" value={meta.background_color} onChange={(e) => onChange({ background_color: e.target.value })} className="w-10 h-9 border border-gray-300 rounded cursor-pointer" />
          <input className={`${base} font-mono`} value={meta.background_color} onChange={(e) => onChange({ background_color: e.target.value })} />
        </div>
      </div>

      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-400 uppercase">Delivery charges</p>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={meta.free_delivery} onChange={(e) => onChange({ free_delivery: e.target.checked })} />
        Free delivery
      </label>
      {!meta.free_delivery && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Inside Dhaka ৳</label>
            <input type="number" className={base} value={meta.delivery_charge} onChange={(e) => onChange({ delivery_charge: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <label className={label}>Outside Dhaka ৳</label>
            <input type="number" className={base} value={meta.delivery_charge_outside} onChange={(e) => onChange({ delivery_charge_outside: Number(e.target.value) || 0 })} />
          </div>
        </div>
      )}
      <div>
        <label className={label}>Delivery note (optional)</label>
        <input className={base} value={meta.delivery_note} onChange={(e) => onChange({ delivery_note: e.target.value })} />
      </div>

      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-400 uppercase">Contact buttons</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Phone</label>
          <input className={base} value={meta.phone_number} placeholder="01…" onChange={(e) => onChange({ phone_number: e.target.value })} />
        </div>
        <div>
          <label className={label}>WhatsApp</label>
          <input className={base} value={meta.whatsapp_number} placeholder="8801…" onChange={(e) => onChange({ whatsapp_number: e.target.value })} />
        </div>
      </div>

      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-400 uppercase">SEO</p>
      <div>
        <label className={label}>Meta title</label>
        <input className={base} value={meta.meta_title} onChange={(e) => onChange({ meta_title: e.target.value })} />
      </div>
      <div>
        <label className={label}>Meta description</label>
        <textarea className={base} rows={2} value={meta.meta_description} onChange={(e) => onChange({ meta_description: e.target.value })} />
      </div>
      <div>
        <label className={label}>Social share image (og:image)</label>
        <ImageField value={meta.og_image_url} onChange={(v) => onChange({ og_image_url: v })} />
      </div>

      <hr className="border-gray-100" />
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={meta.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />
        Page is live (publicly reachable)
      </label>
    </div>
  );
}
