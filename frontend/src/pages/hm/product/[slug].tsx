// Handsome Man — product detail
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import HMLayout, { Reveal, HM_COLORS } from '@/components/storefronts/handsomeman/HMLayout';
import HMProductCard from '@/components/storefronts/handsomeman/HMProductCard';
import {
  HMStorefront, HMProduct, fetchHMConfig, fetchHMProduct, fetchHMProducts,
  hmPrice, taka, useHMCart, hmTrack,
} from '@/components/storefronts/handsomeman/hm';

export default function HMProductDetail() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';

  const [config, setConfig] = useState<HMStorefront | null>(null);
  const [product, setProduct] = useState<HMProduct | null>(null);
  const [related, setRelated] = useState<HMProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [variant, setVariant] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const cart = useHMCart();

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setNotFound(false);
        const [cfg, prod] = await Promise.all([fetchHMConfig(), fetchHMProduct(slug)]);
        if (cancelled) return;
        setConfig(cfg);
        setProduct(prod);
        setVariant('');
        setQty(1);
        hmTrack('ViewContent', {
          content_ids: [String(prod.product_id)],
          content_name: prod.name,
          content_type: 'product',
          value: hmPrice(prod).price,
          currency: 'BDT',
        });
        // Related: same category first, otherwise anything else
        const all = await fetchHMProducts();
        if (cancelled) return;
        const sameCat = all.filter(
          (p) => p.product_id !== prod.product_id &&
            p.storefront_category_id != null &&
            p.storefront_category_id === prod.storefront_category_id,
        );
        const others = all.filter(
          (p) => p.product_id !== prod.product_id && !sameCat.some((s) => s.id === p.id),
        );
        setRelated([...sameCat, ...others].slice(0, 4));
      } catch (err: any) {
        if (!cancelled && err?.response?.status === 404) setNotFound(true);
        console.error('Failed to load product:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <HMLayout config={config}>
        <div className="pt-40 pb-32 text-center" style={{ color: HM_COLORS.textDim }}>Loading…</div>
      </HMLayout>
    );
  }

  if (notFound || !product) {
    return (
      <HMLayout config={config} title="Not found">
        <div className="pt-40 pb-32 text-center px-6">
          <h1 className="hm-display text-3xl mb-4">Product not found</h1>
          <Link href="/hm/products" className="hm-btn hm-btn-gold inline-block px-8 py-3 text-sm rounded-sm">
            Back to the shop
          </Link>
        </div>
      </HMLayout>
    );
  }

  const variants = product.size_variants || [];
  const selectedVariant = variants.find((v) => v.name === variant) || null;
  const base = hmPrice(product);
  const price = selectedVariant ? Number(selectedVariant.price) : base.price;
  const compare = selectedVariant
    ? (selectedVariant.compare_price ? Number(selectedVariant.compare_price) : null)
    : base.compare;
  const out = product.stock_quantity != null && product.stock_quantity <= 0;
  const needsVariant = variants.length > 0 && !selectedVariant;

  const addToCart = () => {
    if (out || needsVariant) return;
    cart.add(
      {
        product_id: product.product_id,
        slug: product.slug,
        name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
        image_url: product.image_url,
        unit_price: price,
        variant: selectedVariant?.name,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    hmTrack('AddToCart', {
      content_ids: [String(product.product_id)],
      content_name: product.name,
      content_type: 'product',
      value: price * qty,
      currency: 'BDT',
    });
  };

  const buyNow = () => {
    if (out || needsVariant) return;
    addToCart();
    router.push('/hm/checkout');
  };

  return (
    <HMLayout config={config} title={product.name} description={product.short_description || undefined}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-20">
        {/* Breadcrumb */}
        <Reveal>
          <nav className="text-xs mb-8 flex gap-2" style={{ color: HM_COLORS.textDim }}>
            <Link href="/hm" className="hm-link">Home</Link>
            <span>/</span>
            <Link href="/hm/products" className="hm-link">Shop</Link>
            <span>/</span>
            <span style={{ color: HM_COLORS.text }}>{product.name}</span>
          </nav>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Image */}
          <Reveal>
            <div
              className="rounded-sm overflow-hidden"
              style={{ border: `1px solid ${HM_COLORS.line}`, background: HM_COLORS.panel }}
            >
              <div style={{ aspectRatio: '4 / 5' }}>
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center hm-display text-5xl" style={{ color: HM_COLORS.line }}>
                    HM
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* Info */}
          <div>
            <Reveal delay={80}>
              <h1 className="hm-display text-3xl sm:text-4xl font-semibold leading-tight mb-4">
                {product.name}
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <div className="flex items-baseline gap-3 mb-6">
                <span className="hm-gold text-3xl font-bold">{taka(price * qty)}</span>
                {compare && (
                  <span className="text-lg line-through" style={{ color: HM_COLORS.textDim }}>
                    {taka(compare * qty)}
                  </span>
                )}
                {qty > 1 && (
                  <span className="text-xs" style={{ color: HM_COLORS.textDim }}>({taka(price)} each)</span>
                )}
              </div>
            </Reveal>

            {product.short_description && (
              <Reveal delay={180}>
                <p className="text-sm leading-relaxed mb-6" style={{ color: HM_COLORS.textDim }}>
                  {product.short_description}
                </p>
              </Reveal>
            )}

            {/* Variants */}
            {variants.length > 0 && (
              <Reveal delay={220}>
                <div className="mb-6">
                  <p className="hm-display text-xs mb-3" style={{ color: HM_COLORS.textDim }}>Choose option</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => (
                      <button
                        key={v.name}
                        onClick={() => setVariant(v.name === variant ? '' : v.name)}
                        className="hm-display text-xs px-4 py-2.5 rounded-sm transition-all"
                        style={
                          variant === v.name
                            ? { background: HM_COLORS.gold, color: '#0c0c0e' }
                            : { border: `1px solid ${HM_COLORS.line}`, color: HM_COLORS.text }
                        }
                      >
                        {v.name} · {taka(Number(v.price))}
                      </button>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* Quantity + CTAs */}
            <Reveal delay={260}>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center rounded-sm" style={{ border: `1px solid ${HM_COLORS.line}` }}>
                  <button className="px-4 py-3 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                  <span className="px-4 font-semibold">{qty}</span>
                  <button className="px-4 py-3 text-lg" onClick={() => setQty((q) => q + 1)}>+</button>
                </div>
                {out ? (
                  <span className="hm-display text-sm" style={{ color: '#e05d5d' }}>Out of stock</span>
                ) : product.stock_quantity != null && product.stock_quantity <= 5 ? (
                  <span className="text-xs" style={{ color: HM_COLORS.gold }}>
                    Only {product.stock_quantity} left
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={buyNow}
                  disabled={out || needsVariant}
                  className="hm-btn hm-btn-gold flex-1 py-4 text-sm rounded-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Buy Now — Cash on Delivery
                </button>
                <button
                  onClick={addToCart}
                  disabled={out || needsVariant}
                  className="hm-btn hm-btn-outline flex-1 py-4 text-sm rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {added ? '✓ Added to Cart' : 'Add to Cart'}
                </button>
              </div>
              {needsVariant && (
                <p className="text-xs mt-3" style={{ color: HM_COLORS.gold }}>Select an option first.</p>
              )}
            </Reveal>

            {/* Trust rows */}
            <Reveal delay={320}>
              <div className="mt-8 space-y-3 text-sm" style={{ color: HM_COLORS.textDim }}>
                {[
                  ['🚚', `Delivery: ${taka(Number(config?.delivery_charge_inside ?? 60))} inside Dhaka · ${taka(Number(config?.delivery_charge_outside ?? 110))} outside`],
                  ['💵', 'Cash on delivery — pay when you receive'],
                  ['📞', config?.contact_phone ? `Questions? Call ${config.contact_phone}` : 'Order confirmed by phone before dispatch'],
                ].map(([icon, text]) => (
                  <div key={text as string} className="flex items-center gap-3 py-3 px-4 rounded-sm" style={{ background: HM_COLORS.panel, border: `1px solid ${HM_COLORS.line}` }}>
                    <span>{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <Reveal>
            <div className="mt-16 max-w-3xl">
              <h2 className="hm-display text-xl mb-4">
                About this <span className="hm-gold">product</span>
              </h2>
              <div
                className="text-sm leading-7 whitespace-pre-line"
                style={{ color: HM_COLORS.textDim }}
              >
                {product.description}
              </div>
            </div>
          </Reveal>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-20">
            <Reveal>
              <h2 className="hm-display text-2xl mb-8">
                You may also <span className="hm-gold">like</span>
              </h2>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 80}>
                  <HMProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
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
