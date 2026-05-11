const HERBOLIN_PIXEL_ID = '1433976858485362';
const HERBOLIN_HOSTS = new Set(['herbolin.com', 'www.herbolin.com']);
const HERBOLIN_LANDING_PAGE_SLUGS = new Set(['Harbora-kosthogut', 'arabiankhalta']);
const HERBOLIN_PATHS = new Set(['/arabiankhalta']);

let lastTrackedPageKey = '';

declare global {
  interface Window {
    __herbolinPixelInitialized?: boolean;
  }
}

export function isHerbolinHost() {
  return typeof window !== 'undefined' && HERBOLIN_HOSTS.has(window.location.hostname);
}

export function isHerbolinLandingPageSlug(slug?: string | null) {
  return Boolean(slug && HERBOLIN_LANDING_PAGE_SLUGS.has(slug));
}

export function isHerbolinPixelSurface() {
  if (typeof window === 'undefined') return false;

  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const search = new URLSearchParams(window.location.search);
  const routeSlug = pathname.startsWith('/lp/') ? pathname.split('/').filter(Boolean).pop() : null;
  const querySlug = search.get('landing_page') || search.get('landing_page_intl') || search.get('cartflows_step');

  return (
    isHerbolinHost() ||
    HERBOLIN_PATHS.has(pathname) ||
    isHerbolinLandingPageSlug(routeSlug) ||
    isHerbolinLandingPageSlug(querySlug)
  );
}

function canUseHerbolinPixel(slug?: string | null) {
  return isHerbolinPixelSurface() || isHerbolinLandingPageSlug(slug);
}

export function initHerbolinPixel(slug?: string | null) {
  const fbq = (window as any).fbq;

  if (!canUseHerbolinPixel(slug) || !fbq || window.__herbolinPixelInitialized) {
    return;
  }

  fbq('init', HERBOLIN_PIXEL_ID);
  window.__herbolinPixelInitialized = true;
}

export function trackHerbolinPageView() {
  const fbq = (window as any).fbq;

  if (!canUseHerbolinPixel() || !fbq) {
    return;
  }

  const pageKey = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (pageKey === lastTrackedPageKey) {
    return;
  }

  initHerbolinPixel();
  fbq('trackSingle', HERBOLIN_PIXEL_ID, 'PageView');
  lastTrackedPageKey = pageKey;
}

interface HerbolinPurchaseItem {
  product_id?: number | null;
  product_name: string;
  quantity: number;
}

interface HerbolinPurchasePayload {
  orderId?: number | string | null;
  pageTitle: string;
  pageSlug: string;
  totalAmount: number;
  items: HerbolinPurchaseItem[];
}

export function trackHerbolinPurchase(payload: HerbolinPurchasePayload) {
  const fbq = (window as any).fbq;

  if (!canUseHerbolinPixel(payload.pageSlug) || !fbq) {
    return;
  }

  initHerbolinPixel(payload.pageSlug);
  fbq('trackSingle', HERBOLIN_PIXEL_ID, 'Purchase', {
    currency: 'BDT',
    value: Number(payload.totalAmount || 0),
    content_type: 'product',
    content_name: payload.pageTitle,
    content_category: 'landing_page',
    content_ids: payload.items.map((item) => item.product_id).filter(Boolean),
    contents: payload.items.map((item) => ({
      id: item.product_id || item.product_name,
      quantity: item.quantity,
    })),
    num_items: payload.items.reduce((sum, item) => sum + item.quantity, 0),
    order_id: payload.orderId || undefined,
    landing_page_slug: payload.pageSlug,
  });
}
