const HERBOLIN_PIXEL_ID = ['1433976858485', '362'].join('');
const ARABIAN_KHALTA_PIXEL_ID = ['227057045377', '2206'].join('');
const VESHOJ_PIXEL_ID = ['339637066199', '40423'].join('');

const HERBOLIN_HOSTS = new Set(['herbolin.com', 'www.herbolin.com']);
const HERBOLIN_LANDING_PAGE_SLUGS = new Set(['Harbora-kosthogut']);

const ARABIAN_KHALTA_HOSTS = new Set(['arabiankhalta.com', 'www.arabiankhalta.com']);
const ARABIAN_KHALTA_LANDING_PAGE_SLUGS = new Set(['arabiankhalta']);
const ARABIAN_KHALTA_PATHS = new Set(['/arabiankhalta']);

const VESHOJ_HOSTS = new Set(['veshoj.site', 'www.veshoj.site']);
const VESHOJ_LANDING_PAGE_SLUGS = new Set(['veshoj']);
const VESHOJ_LANDING_PATHS = new Set(['/', '/lp/veshoj', '/veshoj']);

let lastTrackedPageKey = '';

declare global {
  interface Window {
    __landingPagePixelsInitialized?: Record<string, boolean>;
    __arabianKhaltaPixelPageViewTracked?: boolean;
  }
}

function currentPathname() {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

function currentRouteSlug() {
  const pathname = currentPathname();
  return pathname.startsWith('/lp/') ? pathname.split('/').filter(Boolean).pop() : null;
}

function currentQuerySlug() {
  const search = new URLSearchParams(window.location.search);
  return search.get('landing_page') || search.get('landing_page_intl') || search.get('cartflows_step');
}

export function isHerbolinHost() {
  return typeof window !== 'undefined' && HERBOLIN_HOSTS.has(window.location.hostname);
}

export function isArabianKhaltaHost() {
  return typeof window !== 'undefined' && ARABIAN_KHALTA_HOSTS.has(window.location.hostname);
}

export function isVeshojHost() {
  return typeof window !== 'undefined' && VESHOJ_HOSTS.has(window.location.hostname);
}

export function isHerbolinLandingPageSlug(slug?: string | null) {
  return Boolean(slug && HERBOLIN_LANDING_PAGE_SLUGS.has(slug));
}

export function isArabianKhaltaLandingPageSlug(slug?: string | null) {
  return Boolean(slug && ARABIAN_KHALTA_LANDING_PAGE_SLUGS.has(slug));
}

export function isVeshojLandingPageSlug(slug?: string | null) {
  return Boolean(slug && VESHOJ_LANDING_PAGE_SLUGS.has(slug));
}

export function isLandingPagePixelSlug(slug?: string | null) {
  return isHerbolinLandingPageSlug(slug);
}

export function isHerbolinPixelSurface() {
  if (typeof window === 'undefined') return false;

  const pathname = currentPathname();
  const routeSlug = currentRouteSlug();
  const querySlug = currentQuerySlug();

  if (
    isArabianKhaltaHost() ||
    ARABIAN_KHALTA_PATHS.has(pathname)
  ) {
    return false;
  }

  return (
    isHerbolinHost() ||
    isHerbolinLandingPageSlug(routeSlug) ||
    isHerbolinLandingPageSlug(querySlug)
  );
}

export function isArabianKhaltaPixelSurface() {
  if (typeof window === 'undefined') return false;

  return isArabianKhaltaHost();
}

export function isVeshojPixelSurface() {
  if (typeof window === 'undefined') return false;

  const pathname = currentPathname();
  const routeSlug = currentRouteSlug();
  const querySlug = currentQuerySlug();

  if (!isVeshojHost()) {
    return false;
  }

  return (
    VESHOJ_LANDING_PATHS.has(pathname) ||
    isVeshojLandingPageSlug(routeSlug) ||
    isVeshojLandingPageSlug(querySlug)
  );
}

export function isLandingPagePixelSurface() {
  return isHerbolinPixelSurface() || isArabianKhaltaPixelSurface() || isVeshojPixelSurface();
}

function getLandingPagePixelId(slug?: string | null) {
  if (isArabianKhaltaPixelSurface()) {
    return ARABIAN_KHALTA_PIXEL_ID;
  }
  if (isVeshojPixelSurface() && (!slug || isVeshojLandingPageSlug(slug))) {
    return VESHOJ_PIXEL_ID;
  }
  if (isHerbolinPixelSurface() || isHerbolinLandingPageSlug(slug)) {
    return HERBOLIN_PIXEL_ID;
  }
  return '';
}

export function initLandingPagePixel(slug?: string | null) {
  const fbq = (window as any).fbq;
  const pixelId = getLandingPagePixelId(slug);

  if (!pixelId || !fbq) {
    return;
  }

  window.__landingPagePixelsInitialized = window.__landingPagePixelsInitialized || {};
  if (window.__landingPagePixelsInitialized[pixelId]) {
    return;
  }

  fbq('init', pixelId);
  window.__landingPagePixelsInitialized[pixelId] = true;
}

export function trackLandingPagePageView() {
  const fbq = (window as any).fbq;
  const pixelId = getLandingPagePixelId();

  if (!pixelId || !fbq) {
    return;
  }

  const pageKey = `${pixelId}:${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (pageKey === lastTrackedPageKey) {
    return;
  }

  initLandingPagePixel();
  if (pixelId === ARABIAN_KHALTA_PIXEL_ID && window.__arabianKhaltaPixelPageViewTracked) {
    lastTrackedPageKey = pageKey;
    return;
  }

  fbq('trackSingle', pixelId, 'PageView');
  if (pixelId === ARABIAN_KHALTA_PIXEL_ID) {
    window.__arabianKhaltaPixelPageViewTracked = true;
  }
  lastTrackedPageKey = pageKey;
}

interface LandingPagePurchaseItem {
  product_id?: number | null;
  product_name: string;
  quantity: number;
}

interface LandingPagePurchasePayload {
  orderId?: number | string | null;
  pageTitle: string;
  pageSlug: string;
  totalAmount: number;
  items: LandingPagePurchaseItem[];
}

export function trackLandingPagePurchase(payload: LandingPagePurchasePayload) {
  const fbq = (window as any).fbq;
  const pixelId = getLandingPagePixelId(payload.pageSlug);

  if (!pixelId || !fbq) {
    return;
  }

  initLandingPagePixel(payload.pageSlug);
  fbq('trackSingle', pixelId, 'Purchase', {
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

export const initHerbolinPixel = initLandingPagePixel;
export const trackHerbolinPageView = trackLandingPagePageView;
export const trackHerbolinPurchase = trackLandingPagePurchase;
