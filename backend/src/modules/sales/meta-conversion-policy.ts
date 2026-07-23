export const MAIN_TRUSTCART_PIXEL_ID = '1882443545705830';
export const HERBOLIN_PIXEL_ID = '1433976858485362';
export const ARABIAN_KHALTA_PIXEL_ID = '2270570453772206';
export const VESHOJ_PIXEL_ID = '33963706619940423';

const WEBSITE_ORDER_SOURCES = new Set(['website', 'landing_page']);
const MAIN_TRUSTCART_DOMAINS = new Set(['trustcart.com.bd', 'trustkert.com', 'shop.trustcart.com.bd']);
const HERBOLIN_SLUGS = new Set(['harbora-kosthogut']);
const ARABIAN_KHALTA_SLUGS = new Set(['arabiankhalta']);
const VESHOJ_SLUGS = new Set(['veshoj']);
const HERBOLIN_DOMAINS = new Set(['herbolin.com']);
const ARABIAN_KHALTA_DOMAINS = new Set(['arabiankhalta.com']);
const VESHOJ_DOMAINS = new Set(['veshoj.site']);

type MetaRoutableOrder = {
  orderSource?: unknown;
  createdBy?: unknown;
  utmSource?: unknown;
  utmCampaign?: unknown;
  metaEventSourceUrl?: unknown;
  metaLandingUrl?: unknown;
  referrerUrl?: unknown;
  metaAttribution?: Record<string, any> | null;
};

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function extractHostname(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    return new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function getOrderSlugs(order: MetaRoutableOrder) {
  return [
    order.utmSource,
    order.utmCampaign,
    order.metaAttribution?.landingPageSlug,
    order.metaAttribution?.landing_page_slug,
    order.metaAttribution?.utm_source,
  ]
    .map(normalize)
    .filter(Boolean);
}

function getOrderDomains(order: MetaRoutableOrder) {
  return [
    order.metaEventSourceUrl,
    order.metaLandingUrl,
    order.referrerUrl,
    order.metaAttribution?.eventSourceUrl,
    order.metaAttribution?.event_source_url,
    order.metaAttribution?.landingUrl,
    order.metaAttribution?.landing_url,
    order.metaAttribution?.currentUrl,
    order.metaAttribution?.current_url,
  ]
    .map(extractHostname)
    .filter(Boolean);
}

function intersects(values: string[], expected: Set<string>) {
  return values.some((value) => expected.has(value));
}

export function isWebsiteConversionOrder(order: MetaRoutableOrder, systemUserId?: number) {
  if (!WEBSITE_ORDER_SOURCES.has(normalize(order.orderSource))) return false;

  const creatorId = Number(order.createdBy);
  if (
    Number.isFinite(systemUserId) &&
    Number.isFinite(creatorId) &&
    creatorId > 0 &&
    creatorId !== systemUserId
  ) {
    return false;
  }

  return true;
}

export function getMetaPixelIdForOrder(order: MetaRoutableOrder, systemUserId?: number): string | null {
  if (!isWebsiteConversionOrder(order, systemUserId)) return null;

  const slugs = getOrderSlugs(order);
  const domains = getOrderDomains(order);
  const isMainDomain = intersects(domains, MAIN_TRUSTCART_DOMAINS);

  if (normalize(order.orderSource) === 'website') {
    return isMainDomain ? MAIN_TRUSTCART_PIXEL_ID : null;
  }

  if (
    (intersects(slugs, VESHOJ_SLUGS) || intersects(domains, VESHOJ_DOMAINS)) &&
    (intersects(domains, VESHOJ_DOMAINS) || isMainDomain)
  ) {
    return VESHOJ_PIXEL_ID;
  }
  if (
    (intersects(slugs, ARABIAN_KHALTA_SLUGS) || intersects(domains, ARABIAN_KHALTA_DOMAINS)) &&
    (intersects(domains, ARABIAN_KHALTA_DOMAINS) || isMainDomain)
  ) {
    return ARABIAN_KHALTA_PIXEL_ID;
  }
  if (
    (intersects(slugs, HERBOLIN_SLUGS) || intersects(domains, HERBOLIN_DOMAINS)) &&
    (intersects(domains, HERBOLIN_DOMAINS) || isMainDomain)
  ) {
    return HERBOLIN_PIXEL_ID;
  }

  return isMainDomain ? MAIN_TRUSTCART_PIXEL_ID : null;
}

export function normalizeMetaFbclid(value: unknown): string | null {
  const fbclid = String(value || '').trim();
  if (!fbclid || fbclid.length > 500 || /\s/.test(fbclid)) return null;
  return fbclid;
}

export function normalizeMetaFbp(value: unknown): string | null {
  const fbp = String(value || '').trim();
  if (!/^fb\.[12]\.\d{10,13}\.[A-Za-z0-9_-]+$/.test(fbp)) return null;
  return fbp;
}

export function normalizeMetaFbc(
  fbcValue: unknown,
  fbclidValue?: unknown,
  occurredAt: Date = new Date(),
): string | null {
  const fbclid = normalizeMetaFbclid(fbclidValue);
  const fbc = String(fbcValue || '').trim();
  const match = /^fb\.([12])\.(\d{10,13})\.(\S+)$/.exec(fbc);

  if (match && (!fbclid || match[3] === fbclid)) {
    return fbc;
  }
  if (!fbclid) return null;

  const timestamp = Number.isFinite(occurredAt.getTime()) ? occurredAt.getTime() : Date.now();
  return `fb.1.${timestamp}.${fbclid}`;
}
