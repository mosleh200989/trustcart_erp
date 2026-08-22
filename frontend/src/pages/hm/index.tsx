// Handsome Man — homepage
import { useEffect, useState } from 'react';
import Link from 'next/link';
import HMLayout, { Reveal, HM_COLORS } from '@/components/storefronts/handsomeman/HMLayout';
import HMProductCard from '@/components/storefronts/handsomeman/HMProductCard';
import {
  HMStorefront, HMProduct, fetchHMConfig, fetchHMProducts,
} from '@/components/storefronts/handsomeman/hm';

const MARQUEE_ITEMS = [
  'Cash on delivery nationwide', 'Genuine products only', 'Dhaka delivery 24–48h',
  'Easy returns', 'Premium men’s essentials',
];

export default function HMHome() {
  const [config, setConfig] = useState<HMStorefront | null>(null);
  const [featured, setFeatured] = useState<HMProduct[]>([]);
  const [latest, setLatest] = useState<HMProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cfg, feat, all] = await Promise.all([
          fetchHMConfig(),
          fetchHMProducts({ featured: true }),
          fetchHMProducts(),
        ]);
        setConfig(cfg);
        setFeatured(feat);
        setLatest(all.slice(0, 8));
      } catch (err) {
        console.error('Failed to load storefront:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = config?.categories || [];
  const heroProducts = (featured.length > 0 ? featured : latest).slice(0, 3);

  return (
    <HMLayout config={config}>
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `radial-gradient(1200px 500px at 80% -10%, rgba(200,162,74,0.14), transparent 60%), ${HM_COLORS.bg}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 sm:pt-44 pb-20 sm:pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Reveal>
              <p className="hm-display text-xs sm:text-sm mb-4" style={{ color: HM_COLORS.gold, letterSpacing: '0.35em' }}>
                {config?.name || 'Handsome Man'} · Bangladesh
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="hm-display font-semibold leading-[1.05] text-4xl sm:text-6xl lg:text-7xl">
                {config?.tagline?.split('.')[0] || 'Gear Up'}.
                <br />
                <span className="hm-gold">{config?.tagline?.split('.')[1]?.trim() || 'Look Sharp'}.</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-6 max-w-md text-sm sm:text-base leading-relaxed" style={{ color: HM_COLORS.textDim }}>
                {config?.description ||
                  'Premium grooming, style and everyday essentials — curated for the modern Bangladeshi man. Cash on delivery, nationwide.'}
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="mt-9 flex flex-wrap gap-4">
                <Link href="/hm/products" className="hm-btn hm-btn-gold px-8 py-4 text-sm rounded-sm font-semibold">
                  Shop the Collection
                </Link>
                {categories[0] && (
                  <Link
                    href={`/hm/category/${categories[0].slug}`}
                    className="hm-btn hm-btn-outline px-8 py-4 text-sm rounded-sm"
                  >
                    {categories[0].name} →
                  </Link>
                )}
              </div>
            </Reveal>
          </div>

          {/* Hero product stack */}
          <Reveal delay={250} className="hidden lg:block">
            <div className="grid grid-cols-3 gap-4 items-end">
              {heroProducts.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/hm/product/${p.slug}`}
                  className="hm-card rounded-sm overflow-hidden block"
                  style={{ transform: `translateY(${(1 - i % 2) * 24}px)` }}
                >
                  <div style={{ aspectRatio: '3 / 4', background: HM_COLORS.panelLight }}>
                    {p.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="hm-card-img w-full h-full object-cover" />
                    )}
                  </div>
                </Link>
              ))}
              {heroProducts.length === 0 && !loading && (
                <div className="col-span-3 hm-card rounded-sm p-10 text-center text-sm" style={{ color: HM_COLORS.textDim }}>
                  Products coming soon.
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* Marquee strip */}
        <div
          className="overflow-hidden py-3"
          style={{ borderTop: `1px solid ${HM_COLORS.line}`, borderBottom: `1px solid ${HM_COLORS.line}`, background: HM_COLORS.panel }}
        >
          <div className="hm-marquee-track flex whitespace-nowrap w-max">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex">
                {MARQUEE_ITEMS.map((text, i) => (
                  <span key={`${dup}-${i}`} className="hm-display text-xs mx-8 flex items-center gap-8" style={{ color: HM_COLORS.textDim }}>
                    {text} <span style={{ color: HM_COLORS.gold }}>◆</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <Reveal>
            <div className="flex items-end justify-between mb-10">
              <h2 className="hm-display text-2xl sm:text-4xl font-semibold">
                Shop by <span className="hm-gold">Category</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((c, i) => (
              <Reveal key={c.id} delay={i * 80}>
                <Link
                  href={`/hm/category/${c.slug}`}
                  className="hm-card rounded-sm flex flex-col items-center justify-center py-10 px-4 text-center group"
                >
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image_url} alt="" className="w-14 h-14 object-cover rounded-full mb-4" />
                  ) : (
                    <span
                      className="hm-display w-14 h-14 rounded-full flex items-center justify-center text-lg mb-4 transition-colors"
                      style={{ border: `1px solid ${HM_COLORS.gold}`, color: HM_COLORS.gold }}
                    >
                      {c.name.charAt(0)}
                    </span>
                  )}
                  <span className="hm-display text-sm">{c.name}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured / latest products ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <Reveal>
          <div className="flex items-end justify-between mb-10">
            <h2 className="hm-display text-2xl sm:text-4xl font-semibold">
              {featured.length > 0 ? <>Featured <span className="hm-gold">Gear</span></> : <>New <span className="hm-gold">Arrivals</span></>}
            </h2>
            <Link href="/hm/products" className="hm-link text-sm" style={{ color: HM_COLORS.textDim }}>
              View all →
            </Link>
          </div>
        </Reveal>
        {loading ? (
          <div className="text-center py-16" style={{ color: HM_COLORS.textDim }}>Loading…</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {(featured.length > 0 ? featured : latest).slice(0, 8).map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 90}>
                <HMProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ── Brand promise ── */}
      <section style={{ background: HM_COLORS.panel, borderTop: `1px solid ${HM_COLORS.line}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid md:grid-cols-3 gap-10 text-center">
          {[
            ['Authentic Only', 'Every product is sourced and checked by our own team.'],
            ['Cash on Delivery', 'Pay when the parcel is in your hands — anywhere in Bangladesh.'],
            ['Fast Dispatch', 'Orders confirmed by phone and shipped within 24 hours.'],
          ].map(([title, text], i) => (
            <Reveal key={title} delay={i * 120}>
              <div>
                <div
                  className="hm-display w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 text-lg"
                  style={{ border: `1px solid ${HM_COLORS.gold}`, color: HM_COLORS.gold }}
                >
                  {i + 1}
                </div>
                <h3 className="hm-display text-lg mb-2">{title}</h3>
                <p className="text-sm" style={{ color: HM_COLORS.textDim }}>{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </HMLayout>
  );
}

// Server-rendered so _document can detect the storefront host and omit
// TrustCart branding metadata (static prerendering has no request context).
export async function getServerSideProps() {
  return { props: {} };
}
