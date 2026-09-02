// Layout, theme, navbar, cart drawer and footer for the Handsome Man storefront.
// Design language: near-black charcoal, brushed gold accents, Oswald display
// type with wide tracking, Manrope body. Everything animates subtly.
import { ReactNode, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  HMStorefront, HMCartItem, useHMCart, taka, fetchHMConfig, hmTrack,
} from './hm';

// Gold "H" on charcoal — used until a favicon is uploaded in the admin panel.
const HM_FALLBACK_FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="10" fill="#0c0c0e"/>' +
      '<text x="32" y="45" font-family="Georgia,serif" font-size="40" font-weight="bold" ' +
      'fill="#c8a24a" text-anchor="middle">H</text></svg>',
  );

export const HM_COLORS = {
  bg: '#0c0c0e',
  panel: '#141417',
  panelLight: '#1c1c21',
  line: '#26262c',
  gold: '#c8a24a',
  goldLight: '#e0c37c',
  text: '#f2f0eb',
  textDim: '#9a978f',
};

// ─── Scroll reveal ───────────────────────────────────────────

export function Reveal({
  children, delay = 0, className = '',
}: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setShown(true)),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(26px)',
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Layout ──────────────────────────────────────────────────

export default function HMLayout({
  children, config, title, description,
}: {
  children: ReactNode;
  config?: HMStorefront | null;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [cfg, setCfg] = useState<HMStorefront | null>(config || null);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const cart = useHMCart();

  useEffect(() => {
    if (!cfg) fetchHMConfig().then(setCfg).catch(() => {});
  }, [cfg]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close drawers on route change
  useEffect(() => {
    const done = () => { setCartOpen(false); setMobileNav(false); };
    router.events.on('routeChangeComplete', done);
    return () => router.events.off('routeChangeComplete', done);
  }, [router.events]);

  // Meta Pixel — injected from the storefront's DB config. On handsomemanbd.com
  // _document already initialises the brand pixel server-side, so this only runs
  // on hosts that reach the storefront without that snippet (e.g. /hm previews).
  useEffect(() => {
    const pixelId = cfg?.meta_pixel_id;
    if (!pixelId || typeof window === 'undefined') return;
    const w = window as any;
    if (w.fbq) return; // already initialised
    /* eslint-disable */
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    w.fbq('init', pixelId);
    w.fbq('track', 'PageView');
  }, [cfg?.meta_pixel_id]);

  // PageView on client-side navigation
  useEffect(() => {
    const onRoute = () => hmTrack('PageView');
    router.events.on('routeChangeComplete', onRoute);
    return () => router.events.off('routeChangeComplete', onRoute);
  }, [router.events]);

  const pageTitle = title
    ? `${title} — ${cfg?.name || 'Handsome Man'}`
    : cfg?.seo_title || 'Handsome Man — Premium Men’s Essentials';
  const pageDescription = description || cfg?.seo_description ||
    'Grooming, style and everyday essentials for men. Cash on delivery across Bangladesh.';

  const categories = cfg?.categories || [];

  return (
    <div className="hm-root" style={{ background: HM_COLORS.bg, color: HM_COLORS.text, minHeight: '100vh' }}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Own favicon so the tab never falls back to the TrustCart logo */}
        {cfg?.favicon_url ? (
          <link rel="icon" href={cfg.favicon_url} />
        ) : (
          <link rel="icon" href={HM_FALLBACK_FAVICON} />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* ── Global styles for the HM design language ── */}
      <style jsx global>{`
        .hm-root {
          font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .hm-display {
          font-family: 'Oswald', 'Manrope', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .hm-gold { color: ${HM_COLORS.gold}; }
        .hm-link {
          position: relative;
          transition: color 0.25s ease;
        }
        .hm-link::after {
          content: '';
          position: absolute;
          left: 0; bottom: -4px;
          width: 100%; height: 1px;
          background: ${HM_COLORS.gold};
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hm-link:hover { color: ${HM_COLORS.goldLight}; }
        .hm-link:hover::after { transform: scaleX(1); transform-origin: left; }
        .hm-btn {
          font-family: 'Oswald', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hm-btn-gold {
          background: linear-gradient(135deg, ${HM_COLORS.gold}, #a8863a);
          color: #0c0c0e;
        }
        .hm-btn-gold:hover:not(:disabled) {
          box-shadow: 0 8px 30px rgba(200, 162, 74, 0.35);
          transform: translateY(-2px);
        }
        .hm-btn-outline {
          border: 1px solid ${HM_COLORS.gold};
          color: ${HM_COLORS.gold};
          background: transparent;
        }
        .hm-btn-outline:hover {
          background: rgba(200, 162, 74, 0.1);
          box-shadow: inset 0 0 20px rgba(200, 162, 74, 0.08);
        }
        .hm-card {
          background: ${HM_COLORS.panel};
          border: 1px solid ${HM_COLORS.line};
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
                      border-color 0.4s ease, box-shadow 0.4s ease;
        }
        .hm-card:hover {
          transform: translateY(-6px);
          border-color: rgba(200, 162, 74, 0.45);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
        }
        .hm-card .hm-card-img { transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        .hm-card:hover .hm-card-img { transform: scale(1.06); }
        @keyframes hm-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .hm-marquee-track {
          animation: hm-marquee 28s linear infinite;
        }
        @keyframes hm-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes hm-slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .hm-drawer-backdrop { animation: hm-fade-in 0.25s ease both; }
        .hm-drawer-panel { animation: hm-slide-in-right 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .hm-root ::selection { background: ${HM_COLORS.gold}; color: #0c0c0e; }
        .hm-root input, .hm-root textarea, .hm-root select {
          color-scheme: dark;
        }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ── Navbar ── */}
      <header
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(12, 12, 14, 0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(14px)' : 'none',
          borderBottom: scrolled ? `1px solid ${HM_COLORS.line}` : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 sm:h-20">
          <Link href="/hm" className="flex items-center gap-3 group">
            {cfg?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cfg.logo_url} alt={cfg.name} className="h-9 w-auto" />
            ) : (
              <span className="hm-display text-xl sm:text-2xl font-semibold tracking-widest">
                HANDSOME<span className="hm-gold">MAN</span>
              </span>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: HM_COLORS.textDim }}>
            <Link href="/hm" className="hm-link">Home</Link>
            <Link href="/hm/products" className="hm-link">Shop All</Link>
            {categories.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/hm/category/${c.slug}`} className="hm-link">
                {c.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 px-3 py-2 hm-btn hm-btn-outline text-xs rounded-sm"
              aria-label="Open cart"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1.5" /><circle cx="19" cy="21" r="1.5" />
                <path d="M2 3h3l2.6 12.5a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21.5 7H6" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {cart.count > 0 && (
                <span
                  className="absolute -top-2 -right-2 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  style={{ background: HM_COLORS.gold, color: '#0c0c0e' }}
                >
                  {cart.count}
                </span>
              )}
            </button>
            <button
              className="md:hidden p-2"
              onClick={() => setMobileNav((v) => !v)}
              aria-label="Menu"
              style={{ color: HM_COLORS.text }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileNav
                  ? <path d="M6 6l12 12M18 6L6 18" />
                  : <path d="M3 6h18M3 12h18M3 18h18" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileNav && (
          <nav
            className="md:hidden px-6 pb-5 pt-2 flex flex-col gap-4 text-sm"
            style={{ background: 'rgba(12,12,14,0.97)', backdropFilter: 'blur(14px)', color: HM_COLORS.textDim }}
          >
            <Link href="/hm" className="hm-link w-fit">Home</Link>
            <Link href="/hm/products" className="hm-link w-fit">Shop All</Link>
            {categories.map((c) => (
              <Link key={c.id} href={`/hm/category/${c.slug}`} className="hm-link w-fit">{c.name}</Link>
            ))}
          </nav>
        )}
      </header>

      {/* ── Page content ── */}
      <main>{children}</main>

      {/* ── Footer ── */}
      <footer style={{ background: HM_COLORS.panel, borderTop: `1px solid ${HM_COLORS.line}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="hm-display text-xl font-semibold tracking-widest mb-3">
              HANDSOME<span className="hm-gold">MAN</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: HM_COLORS.textDim }}>
              {cfg?.description || 'Premium essentials for the modern Bangladeshi man.'}
            </p>
          </div>
          <div>
            <h4 className="hm-display text-sm mb-4" style={{ color: HM_COLORS.gold }}>Shop</h4>
            <ul className="space-y-2 text-sm" style={{ color: HM_COLORS.textDim }}>
              <li><Link href="/hm/products" className="hm-link">All Products</Link></li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/hm/category/${c.slug}`} className="hm-link">{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="hm-display text-sm mb-4" style={{ color: HM_COLORS.gold }}>Contact</h4>
            <ul className="space-y-2 text-sm" style={{ color: HM_COLORS.textDim }}>
              {cfg?.contact_phone && (
                <li><a href={`tel:${cfg.contact_phone}`} className="hm-link">{cfg.contact_phone}</a></li>
              )}
              {cfg?.contact_email && (
                <li><a href={`mailto:${cfg.contact_email}`} className="hm-link">{cfg.contact_email}</a></li>
              )}
              {cfg?.contact_address && <li>{cfg.contact_address}</li>}
              <li className="pt-2">Cash on delivery across Bangladesh</li>
            </ul>
          </div>
        </div>
        <div
          className="text-center text-xs py-5"
          style={{ color: HM_COLORS.textDim, borderTop: `1px solid ${HM_COLORS.line}` }}
        >
          © {new Date().getFullYear()} {cfg?.name || 'Handsome Man'}. All rights reserved.
        </div>
      </footer>

      {/* ── Cart drawer ── */}
      {cartOpen && (
        <CartDrawer cart={cart} onClose={() => setCartOpen(false)} config={cfg} />
      )}
    </div>
  );
}

// ─── Cart drawer ─────────────────────────────────────────────

function CartDrawer({
  cart, onClose, config,
}: {
  cart: ReturnType<typeof useHMCart>;
  onClose: () => void;
  config: HMStorefront | null;
}) {
  const router = useRouter();
  const freeFrom = config?.free_delivery_threshold ? Number(config.free_delivery_threshold) : null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="hm-drawer-backdrop absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />
      <aside
        className="hm-drawer-panel absolute right-0 top-0 h-full w-full max-w-md flex flex-col"
        style={{ background: HM_COLORS.panel, borderLeft: `1px solid ${HM_COLORS.line}` }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${HM_COLORS.line}` }}
        >
          <h2 className="hm-display text-lg">Your Cart ({cart.count})</h2>
          <button onClick={onClose} aria-label="Close cart" style={{ color: HM_COLORS.textDim }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cart.items.length === 0 ? (
            <div className="text-center py-16" style={{ color: HM_COLORS.textDim }}>
              <p className="mb-6">Your cart is empty.</p>
              <button
                onClick={() => { onClose(); router.push('/hm/products'); }}
                className="hm-btn hm-btn-gold px-6 py-3 text-xs rounded-sm"
              >
                Browse Products
              </button>
            </div>
          ) : (
            cart.items.map((item: HMCartItem) => {
              const key = cart.itemKey(item);
              return (
                <div key={key} className="flex gap-3 pb-4" style={{ borderBottom: `1px solid ${HM_COLORS.line}` }}>
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt="" className="w-16 h-16 object-cover rounded-sm" />
                  ) : (
                    <div className="w-16 h-16 rounded-sm" style={{ background: HM_COLORS.panelLight }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    {item.variant && (
                      <p className="text-xs" style={{ color: HM_COLORS.textDim }}>{item.variant}</p>
                    )}
                    <p className="text-sm mt-1 hm-gold font-semibold">{taka(item.unit_price)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => cart.remove(key)}
                      className="text-xs hover:text-red-400"
                      style={{ color: HM_COLORS.textDim }}
                    >
                      Remove
                    </button>
                    <div
                      className="flex items-center rounded-sm"
                      style={{ border: `1px solid ${HM_COLORS.line}` }}
                    >
                      <button className="px-2 py-1 text-sm" onClick={() => cart.setQuantity(key, item.quantity - 1)}>−</button>
                      <span className="px-2 text-sm">{item.quantity}</span>
                      <button className="px-2 py-1 text-sm" onClick={() => cart.setQuantity(key, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="px-5 py-5 space-y-3" style={{ borderTop: `1px solid ${HM_COLORS.line}` }}>
            {freeFrom && cart.subtotal < freeFrom && (
              <p className="text-xs" style={{ color: HM_COLORS.textDim }}>
                Add {taka(freeFrom - cart.subtotal)} more for free delivery.
              </p>
            )}
            <div className="flex justify-between text-sm">
              <span style={{ color: HM_COLORS.textDim }}>Subtotal</span>
              <span className="font-bold hm-gold">{taka(cart.subtotal)}</span>
            </div>
            <button
              onClick={() => { onClose(); router.push('/hm/checkout'); }}
              className="hm-btn hm-btn-gold w-full py-3.5 text-sm rounded-sm font-semibold"
            >
              Checkout →
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
