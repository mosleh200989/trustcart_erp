// Handsome Man — checkout. Orders POST to the main Sales module
// (same flow as landing pages) with order_source = 'handsomeman'.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import HMLayout, { Reveal, HM_COLORS } from '@/components/storefronts/handsomeman/HMLayout';
import {
  HMStorefront, fetchHMConfig, taka, useHMCart, hmTrack, HM_SLUG,
} from '@/components/storefronts/handsomeman/hm';
import apiClient from '@/services/api';
import { TrackingService } from '@/utils/tracking';

type Zone = 'inside' | 'outside';

export default function HMCheckout() {
  const router = useRouter();
  const cart = useHMCart();
  const [config, setConfig] = useState<HMStorefront | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [zone, setZone] = useState<Zone>('inside');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    fetchHMConfig().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!tracked && cart.items.length > 0) {
      hmTrack('InitiateCheckout', {
        content_ids: cart.items.map((i) => String(i.product_id)),
        value: cart.subtotal,
        currency: 'BDT',
        num_items: cart.count,
      });
      setTracked(true);
    }
  }, [cart.items.length, cart.subtotal, cart.count, tracked]);

  const deliveryCharge = useMemo(() => {
    if (!config) return zone === 'inside' ? 60 : 110;
    const threshold = config.free_delivery_threshold ? Number(config.free_delivery_threshold) : null;
    if (threshold && cart.subtotal >= threshold) return 0;
    return zone === 'inside'
      ? Number(config.delivery_charge_inside ?? 60)
      : Number(config.delivery_charge_outside ?? 110);
  }, [config, zone, cart.subtotal]);

  const total = cart.subtotal + deliveryCharge;

  const validPhone = /^01[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ''));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (cart.items.length === 0) { setError('Your cart is empty.'); return; }
    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    if (!validPhone) { setError('Please enter a valid mobile number (01XXXXXXXXX).'); return; }
    if (!form.address.trim()) { setError('Please enter your delivery address.'); return; }

    try {
      setSubmitting(true);
      const orderPayload = {
        customer_name: form.name.trim(),
        customer_phone: form.phone.replace(/[\s-]/g, ''),
        shipping_address: `${form.address.trim()} (${zone === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'})`,
        notes: form.note.trim() || '',
        payment_method: 'cash',
        items: cart.items.map((item) => ({
          product_id: item.product_id,
          product_name: item.name,
          product_image: item.image_url || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity,
        })),
        subtotal: cart.subtotal,
        delivery_charge: deliveryCharge,
        total_amount: total,
        status: 'processing',
        order_source: HM_SLUG,
        traffic_source: 'website',
        referrer_url: typeof window !== 'undefined' ? window.location.href : undefined,
        ...TrackingService.collectMetaAttribution(),
      };

      const res = await apiClient.post('/sales', orderPayload);
      const orderId = res.data?.id || res.data?.data?.id;

      hmTrack('Purchase', {
        content_ids: cart.items.map((i) => String(i.product_id)),
        value: total,
        currency: 'BDT',
        num_items: cart.count,
      });

      cart.clear();
      router.push(`/hm/thank-you${orderId ? `?order=${orderId}` : ''}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong placing your order. Please try again or call us.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    background: HM_COLORS.panel,
    border: `1px solid ${HM_COLORS.line}`,
    color: HM_COLORS.text,
  };

  return (
    <HMLayout config={config} title="Checkout">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-20">
        <Reveal>
          <h1 className="hm-display text-3xl sm:text-5xl font-semibold mb-10">
            Check<span className="hm-gold">out</span>
          </h1>
        </Reveal>

        {cart.items.length === 0 ? (
          <Reveal>
            <div
              className="rounded-sm p-14 text-center"
              style={{ background: HM_COLORS.panel, border: `1px solid ${HM_COLORS.line}` }}
            >
              <p className="mb-6" style={{ color: HM_COLORS.textDim }}>Your cart is empty.</p>
              <Link href="/hm/products" className="hm-btn hm-btn-gold inline-block px-8 py-3.5 text-sm rounded-sm">
                Browse Products
              </Link>
            </div>
          </Reveal>
        ) : (
          <form onSubmit={submit} className="grid lg:grid-cols-5 gap-8">
            {/* Delivery form */}
            <Reveal className="lg:col-span-3">
              <div
                className="rounded-sm p-6 sm:p-8 space-y-5"
                style={{ background: HM_COLORS.panel, border: `1px solid ${HM_COLORS.line}` }}
              >
                <h2 className="hm-display text-lg mb-1">Delivery details</h2>

                <div>
                  <label className="block text-xs mb-2 hm-display" style={{ color: HM_COLORS.textDim }}>
                    Your name *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 text-sm rounded-sm outline-none focus:border-[#c8a24a]"
                    style={inputStyle}
                    placeholder="আপনার নাম"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-2 hm-display" style={{ color: HM_COLORS.textDim }}>
                    Mobile number *
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-3 text-sm rounded-sm outline-none"
                    style={inputStyle}
                    placeholder="01XXXXXXXXX"
                    inputMode="tel"
                  />
                  {form.phone && !validPhone && (
                    <p className="text-xs mt-1" style={{ color: '#e05d5d' }}>
                      Enter a valid 11-digit mobile number starting with 01.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs mb-2 hm-display" style={{ color: HM_COLORS.textDim }}>
                    Full delivery address *
                  </label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 text-sm rounded-sm outline-none"
                    style={inputStyle}
                    placeholder="বাসা/হোল্ডিং, রোড, এলাকা, জেলা"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-2 hm-display" style={{ color: HM_COLORS.textDim }}>
                    Delivery area *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ['inside', 'Inside Dhaka', config ? Number(config.delivery_charge_inside ?? 60) : 60],
                      ['outside', 'Outside Dhaka', config ? Number(config.delivery_charge_outside ?? 110) : 110],
                    ] as [Zone, string, number][]).map(([key, label, charge]) => (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setZone(key)}
                        className="px-4 py-3.5 rounded-sm text-sm text-left transition-all"
                        style={
                          zone === key
                            ? { border: `1px solid ${HM_COLORS.gold}`, background: 'rgba(200,162,74,0.08)' }
                            : { border: `1px solid ${HM_COLORS.line}` }
                        }
                      >
                        <span className="font-semibold block">{label}</span>
                        <span className="text-xs" style={{ color: HM_COLORS.textDim }}>
                          Delivery {taka(charge)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-2 hm-display" style={{ color: HM_COLORS.textDim }}>
                    Note (optional)
                  </label>
                  <input
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    className="w-full px-4 py-3 text-sm rounded-sm outline-none"
                    style={inputStyle}
                    placeholder="Anything we should know?"
                  />
                </div>
              </div>
            </Reveal>

            {/* Order summary */}
            <Reveal delay={120} className="lg:col-span-2">
              <div
                className="rounded-sm p-6 sm:p-8 lg:sticky lg:top-28"
                style={{ background: HM_COLORS.panel, border: `1px solid ${HM_COLORS.line}` }}
              >
                <h2 className="hm-display text-lg mb-5">Your order</h2>

                <div className="space-y-4 mb-6">
                  {cart.items.map((item) => {
                    const key = cart.itemKey(item);
                    return (
                      <div key={key} className="flex gap-3 items-center">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt="" className="w-12 h-12 object-cover rounded-sm" />
                        ) : (
                          <div className="w-12 h-12 rounded-sm" style={{ background: HM_COLORS.panelLight }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs" style={{ color: HM_COLORS.textDim }}>
                            {item.quantity} × {taka(item.unit_price)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">{taka(item.unit_price * item.quantity)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 text-sm pt-4" style={{ borderTop: `1px solid ${HM_COLORS.line}` }}>
                  <div className="flex justify-between">
                    <span style={{ color: HM_COLORS.textDim }}>Subtotal</span>
                    <span>{taka(cart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: HM_COLORS.textDim }}>Delivery</span>
                    <span>{deliveryCharge === 0 ? <span className="hm-gold">FREE</span> : taka(deliveryCharge)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2" style={{ borderTop: `1px solid ${HM_COLORS.line}` }}>
                    <span>Total</span>
                    <span className="hm-gold">{taka(total)}</span>
                  </div>
                </div>

                {error && (
                  <p
                    className="text-sm mt-4 px-4 py-3 rounded-sm"
                    style={{ background: 'rgba(224,93,93,0.1)', border: '1px solid rgba(224,93,93,0.4)', color: '#e08585' }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="hm-btn hm-btn-gold w-full py-4 mt-6 text-sm rounded-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Placing order…' : `Confirm Order — ${taka(total)}`}
                </button>
                <p className="text-xs text-center mt-3" style={{ color: HM_COLORS.textDim }}>
                  💵 Cash on delivery. We’ll confirm by phone before dispatch.
                </p>
              </div>
            </Reveal>
          </form>
        )}
      </div>
    </HMLayout>
  );
}

// Server-rendered so _document can detect the storefront host and omit
// TrustCart branding metadata (static prerendering has no request context).
export async function getServerSideProps() {
  return { props: {} };
}
