// Public renderer for LP Maker pages (landing_pages.template === 'builder').
// Static blocks render through the shared BlockRenderer; the order-form
// block becomes a real checkout that posts to the main Sales module with
// order_source 'landing_page' — identical to the other landing page flows.
import { useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import apiClient from '@/services/api';
import { TrackingService } from '@/utils/tracking';
import { Block, BuilderProduct } from './blocks';
import BlockRenderer, { taka } from './BlockRenderer';

interface BuilderPageData {
  id: number;
  title: string;
  slug: string;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  background_color?: string;
  builder_blocks?: Block[];
  free_delivery?: boolean;
  delivery_charge?: number;
  delivery_charge_outside?: number;
  delivery_note?: string;
  phone_number?: string;
  whatsapp_number?: string;
  floating_whatsapp_color?: string;
  floating_phone_color?: string;
}

export default function BuilderTemplate({ page }: { page: BuilderPageData }) {
  const router = useRouter();
  const orderFormRef = useRef<HTMLDivElement | null>(null);
  const blocks: Block[] = useMemo(
    () => (Array.isArray(page.builder_blocks) ? page.builder_blocks : []),
    [page.builder_blocks],
  );

  const scrollToOrderForm = () =>
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div style={{ background: page.background_color || '#ffffff', minHeight: '100vh' }}>
      <Head>
        <title>{page.meta_title || page.title}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        <meta property="og:title" content={page.meta_title || page.title} />
        {page.meta_description && <meta property="og:description" content={page.meta_description} />}
        {page.og_image_url && <meta property="og:image" content={page.og_image_url} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {blocks.map((block) =>
        block.type === 'order-form' ? (
          <div key={block.id} ref={orderFormRef}>
            <LiveOrderForm block={block} page={page} onDone={(id) => router.push(`/thank-you?order=${id}`)} />
          </div>
        ) : (
          <BlockRenderer key={block.id} block={block} onCta={scrollToOrderForm} />
        ),
      )}

      {/* Floating contact buttons — same behaviour as classic landing pages */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3">
        {page.whatsapp_number && (
          <a
            href={`https://wa.me/${String(page.whatsapp_number).replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-13 h-13 rounded-full shadow-lg flex items-center justify-center text-white text-2xl w-14 h-14"
            style={{ background: page.floating_whatsapp_color || '#25D366' }}
            aria-label="WhatsApp"
          >
            💬
          </a>
        )}
        {page.phone_number && (
          <a
            href={`tel:${page.phone_number}`}
            className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl"
            style={{ background: page.floating_phone_color || '#FF6B35' }}
            aria-label="Call"
          >
            📞
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Interactive order form ──────────────────────────────────

function LiveOrderForm({
  block, page, onDone,
}: {
  block: Block;
  page: BuilderPageData;
  onDone: (orderId: number | string) => void;
}) {
  const p = block.props;
  const products: BuilderProduct[] = p.products || [];
  const defaultProduct = products.find((x) => x.is_default) || products[0] || null;

  const [selected, setSelected] = useState<BuilderProduct | null>(defaultProduct);
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [zone, setZone] = useState<'inside' | 'outside'>('inside');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const subtotal = selected ? Number(selected.price) * quantity : 0;
  const deliveryCharge = page.free_delivery
    ? 0
    : zone === 'inside'
      ? Number(page.delivery_charge || 0)
      : Number(page.delivery_charge_outside || 0);
  const total = subtotal + deliveryCharge;

  const validPhone = /^01[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ''));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selected) { setError('প্রোডাক্ট নির্বাচন করুন।'); return; }
    if (!form.name.trim()) { setError('আপনার নাম লিখুন।'); return; }
    if (!validPhone) { setError('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)।'); return; }
    if (!form.address.trim()) { setError('সম্পূর্ণ ঠিকানা লিখুন।'); return; }

    try {
      setSubmitting(true);
      // Same payload shape as lp/[slug].tsx — orders land in the main Sales module
      const orderPayload = {
        customer_name: form.name.trim(),
        customer_phone: form.phone.replace(/[\s-]/g, ''),
        shipping_address: form.address.trim(),
        notes: form.note.trim() || '',
        payment_method: 'cash',
        items: [{
          product_id: selected.product_id || null,
          product_name: selected.name,
          product_image: selected.image_url || null,
          quantity,
          unit_price: Number(selected.price),
          total_price: Number(selected.price) * quantity,
        }],
        subtotal,
        delivery_charge: deliveryCharge,
        total_amount: total,
        status: 'processing',
        order_source: 'landing_page',
        traffic_source: 'landing_page',
        referrer_url: typeof window !== 'undefined' ? window.location.href : undefined,
        utm_source: page.slug,
        utm_medium: 'landing_page',
        utm_campaign: page.title,
        ...TrackingService.collectMetaAttribution(),
      };

      const res = await apiClient.post('/sales', orderPayload);
      const orderId = res.data?.id || res.data?.data?.id || '';

      // Keep the landing page order counter in sync (fire and forget)
      apiClient.post(`/landing-pages/${page.id}/increment-order`).catch(() => {});

      onDone(orderId);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'অর্ডার সম্পন্ন হয়নি। আবার চেষ্টা করুন অথবা কল করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full border rounded-lg px-3.5 py-3 text-sm outline-none bg-white';
  const inputStyle = { borderColor: '#e5e7eb', color: '#111827' };

  return (
    <section className="px-6 py-8" style={{ background: p.background }}>
      <form
        onSubmit={submit}
        className="max-w-xl mx-auto p-6 border border-gray-200 shadow-sm"
        style={{ background: p.card_background, borderRadius: p.radius }}
      >
        <h3 className="text-xl font-bold text-center mb-5" style={{ color: p.text_color }}>{p.heading}</h3>

        {/* Product choice */}
        {products.length > 0 && (
          <div className="space-y-2 mb-5">
            {products.map((prod) => {
              const active = selected?.id === prod.id;
              return (
                <button
                  type="button"
                  key={prod.id}
                  onClick={() => setSelected(prod)}
                  className="w-full flex items-center gap-3 rounded-lg p-2.5 border text-left transition-colors"
                  style={active
                    ? { borderColor: p.accent, background: '#ffffff', boxShadow: `0 0 0 1px ${p.accent}` }
                    : { borderColor: '#e5e7eb', background: '#ffffff' }}
                >
                  {prod.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={prod.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-100" />
                  )}
                  <span className="flex-1 text-sm font-medium" style={{ color: p.text_color }}>{prod.name}</span>
                  <span className="text-sm font-bold whitespace-nowrap" style={{ color: p.accent }}>
                    {taka(Number(prod.price))}
                    {prod.compare_price ? (
                      <span className="ml-1 text-xs text-gray-400 line-through font-normal">{taka(Number(prod.compare_price))}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quantity */}
        {p.show_quantity && selected && (
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-medium" style={{ color: p.text_color }}>পরিমাণ</span>
            <div className="flex items-center border border-gray-200 rounded-lg bg-white">
              <button type="button" className="px-4 py-2 text-lg" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
              <span className="px-3 font-semibold text-sm">{quantity}</span>
              <button type="button" className="px-4 py-2 text-lg" onClick={() => setQuantity((q) => q + 1)}>+</button>
            </div>
          </div>
        )}

        {/* Customer details */}
        <div className="space-y-3">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="আপনার নাম *"
            className={inputClass}
            style={inputStyle}
          />
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="মোবাইল নম্বর (01XXXXXXXXX) *"
            inputMode="tel"
            className={inputClass}
            style={inputStyle}
          />
          {form.phone && !validPhone && (
            <p className="text-xs text-red-500">১১ ডিজিটের সঠিক মোবাইল নম্বর দিন।</p>
          )}
          <textarea
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="সম্পূর্ণ ঠিকানা (বাসা, রোড, এলাকা, জেলা) *"
            rows={2}
            className={inputClass}
            style={inputStyle}
          />

          {/* Delivery zone — charges come from the page settings */}
          {!page.free_delivery && (
            <div className="grid grid-cols-2 gap-2">
              {([
                ['inside', 'ঢাকার ভিতরে', Number(page.delivery_charge || 0)],
                ['outside', 'ঢাকার বাইরে', Number(page.delivery_charge_outside || 0)],
              ] as ['inside' | 'outside', string, number][]).map(([key, label, charge]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setZone(key)}
                  className="rounded-lg border px-3 py-2.5 text-sm text-left bg-white"
                  style={zone === key
                    ? { borderColor: p.accent, boxShadow: `0 0 0 1px ${p.accent}` }
                    : { borderColor: '#e5e7eb' }}
                >
                  <span className="font-medium block" style={{ color: p.text_color }}>{label}</span>
                  <span className="text-xs text-gray-500">ডেলিভারি {taka(charge)}</span>
                </button>
              ))}
            </div>
          )}

          <input
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="নোট (ঐচ্ছিক)"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* Totals */}
        <div className="mt-5 space-y-1.5 text-sm border-t border-gray-200 pt-4" style={{ color: p.text_color }}>
          <div className="flex justify-between"><span>সাবটোটাল</span><span>{taka(subtotal)}</span></div>
          <div className="flex justify-between">
            <span>ডেলিভারি চার্জ</span>
            <span>{page.free_delivery || deliveryCharge === 0 ? 'ফ্রি' : taka(deliveryCharge)}</span>
          </div>
          {page.delivery_note && <p className="text-xs text-gray-500">{page.delivery_note}</p>}
          <div className="flex justify-between text-lg font-bold pt-1.5">
            <span>মোট</span><span style={{ color: p.accent }}>{taka(total)}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 mt-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !selected}
          className="w-full font-bold py-4 mt-5 text-base shadow-md transition-transform hover:scale-[1.02] disabled:opacity-50"
          style={{ background: p.button_bg, color: p.button_color, borderRadius: p.radius }}
        >
          {submitting ? 'অর্ডার হচ্ছে…' : `${p.button_text} — ${taka(total)}`}
        </button>
        <p className="text-xs text-center text-gray-500 mt-3">💵 ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন</p>
      </form>
    </section>
  );
}
