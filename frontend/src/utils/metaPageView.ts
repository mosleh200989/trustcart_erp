import apiClient from '@/services/api';
import { TrackingService } from '@/utils/tracking';

const MAIN_TRUSTCART_PIXEL_ID = '1882443545705830';

let lastTrackedLocation = '';
let pageViewSequence = 0;

function isMainTrustCartSurface() {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname.replace(/^www\./, '').toLowerCase();
  if (host !== 'trustcart.com.bd' && host !== 'trustkert.com' && host !== 'shop.trustcart.com.bd') {
    return false;
  }

  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const routeSlug = pathname.startsWith('/lp/')
    ? pathname.split('/').filter(Boolean).pop()?.toLowerCase()
    : '';
  const querySlug = (
    params.get('landing_page') ||
    params.get('landing_page_intl') ||
    params.get('cartflows_step') ||
    ''
  ).toLowerCase();
  const dedicatedSlugs = new Set(['veshoj', 'arabiankhalta', 'harbora-kosthogut']);

  return !dedicatedSlugs.has(routeSlug || '') && !dedicatedSlugs.has(querySlug);
}

function getSessionId() {
  const storageKey = 'trustcart_meta_page_session';

  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;

    const generated = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function createPageViewEventId() {
  pageViewSequence += 1;
  return `pv_${getSessionId()}_${Date.now().toString(36)}_${pageViewSequence}`;
}

export function trackMetaPageView() {
  if (!isMainTrustCartSurface()) return;

  const location = window.location.href;
  if (location === lastTrackedLocation) return;
  lastTrackedLocation = location;

  const eventId = createPageViewEventId();
  const pageTitle = document.title || undefined;
  const attribution = TrackingService.collectMetaAttribution();

  window.fbq?.(
    'trackSingle',
    MAIN_TRUSTCART_PIXEL_ID,
    'PageView',
    pageTitle ? { page_title: pageTitle } : {},
    { eventID: eventId },
  );

  void apiClient.post('/sales/meta/page-view', {
    event_id: eventId,
    event_source_url: location,
    page_title: pageTitle,
    fbp: attribution.meta_fbp,
    fbc: attribution.meta_fbc,
    fbclid: attribution.meta_fbclid,
  }).catch(() => {
    // Analytics must never interrupt navigation or checkout.
  });
}
