const HERBOLIN_PIXEL_ID = '1433976858485362';
const HERBOLIN_HOSTS = new Set(['herbolin.com', 'www.herbolin.com']);
const PAGEVIEW_DEDUPE_MS = 1500;

let lastTrackedPageKey = '';
let lastTrackedPageAt = 0;

declare global {
  interface Window {
    __herbolinPixelInitialized?: boolean;
  }
}

export function isHerbolinHost() {
  return typeof window !== 'undefined' && HERBOLIN_HOSTS.has(window.location.hostname);
}

function canUseHerbolinPixel() {
  return isHerbolinHost();
}

export function initHerbolinPixel() {
  const fbq = (window as any).fbq;

  if (!canUseHerbolinPixel() || !fbq || window.__herbolinPixelInitialized) {
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
  const now = Date.now();
  if (pageKey === lastTrackedPageKey && now - lastTrackedPageAt < PAGEVIEW_DEDUPE_MS) {
    return;
  }

  initHerbolinPixel();
  fbq('trackSingle', HERBOLIN_PIXEL_ID, 'PageView');
  lastTrackedPageKey = pageKey;
  lastTrackedPageAt = now;
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

  if (!canUseHerbolinPixel() || !fbq) {
    return;
  }

  initHerbolinPixel();
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