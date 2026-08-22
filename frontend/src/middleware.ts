import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Domain → landing page slug mapping.
 * When a custom domain hits the root "/", rewrite internally to the landing page.
 */
const DOMAIN_LANDING_PAGES: Record<string, string> = {
  'herbolin.com': 'Harbora-kosthogut',
  'www.herbolin.com': 'Harbora-kosthogut',
  'arabiankhalta.com': 'arabiankhalta',
  'www.arabiankhalta.com': 'arabiankhalta',
  'veshoj.site': 'veshoj',
  'www.veshoj.site': 'veshoj',
  'kasrioil.com': process.env.NEXT_PUBLIC_KASRI_LANDING_PAGE_SLUG || 'id-25',
  'www.kasrioil.com': process.env.NEXT_PUBLIC_KASRI_LANDING_PAGE_SLUG || 'id-25',
  'naturalglowra.com': 'natural-glowra-coconut-oil',
  'www.naturalglowra.com': 'natural-glowra-coconut-oil',
};

/**
 * Domain + path → landing page slug mapping.
 * Keeps campaign URLs clean while reusing the landing page renderer.
 */
const DOMAIN_PATH_LANDING_PAGES: Record<string, Record<string, string>> = {
  'herbolin.com': {
    '/arabiankhalta': 'arabiankhalta',
  },
  'www.herbolin.com': {
    '/arabiankhalta': 'arabiankhalta',
  },
};

/**
 * Domain → storefront path prefix mapping.
 * A storefront domain serves the whole /hm/* page tree with clean URLs:
 *   handsomemanbd.com/            → internally /hm
 *   handsomemanbd.com/products    → internally /hm/products
 *   handsomemanbd.com/hm/products → 308 redirect to /products (strip prefix)
 */
const STOREFRONT_DOMAINS: Record<string, string> = {
  'handsomemanbd.com': '/hm',
  'www.handsomemanbd.com': '/hm',
};

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0] || '';
  const pathname = request.nextUrl.pathname.replace(/\/$/, '') || '/';

  const storefrontPrefix = STOREFRONT_DOMAINS[host];
  if (storefrontPrefix && !pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
    // Keep public URLs clean: /hm/... links redirect to the unprefixed path
    if (pathname === storefrontPrefix || pathname.startsWith(`${storefrontPrefix}/`)) {
      const clean = pathname.slice(storefrontPrefix.length) || '/';
      const url = request.nextUrl.clone();
      url.pathname = clean;
      return NextResponse.redirect(url, 308);
    }
    // Serve everything else from the storefront page tree
    const url = request.nextUrl.clone();
    url.pathname = `${storefrontPrefix}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  const pathSlug = DOMAIN_PATH_LANDING_PAGES[host]?.[pathname];

  if (pathSlug) {
    return NextResponse.rewrite(new URL(`/lp/${pathSlug}`, request.url));
  }

  const slug = DOMAIN_LANDING_PAGES[host];

  // Only rewrite root path for mapped domains
  if (slug && pathname === '/') {
    return NextResponse.rewrite(new URL(`/lp/${slug}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on paths that matter — skip static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|uploads).*)'],
};
