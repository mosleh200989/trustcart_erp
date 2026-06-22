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

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0] || '';
  const pathname = request.nextUrl.pathname.replace(/\/$/, '') || '/';
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
