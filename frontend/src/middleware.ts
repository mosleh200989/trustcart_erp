import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Domain → landing page slug mapping.
 * When a custom domain hits the root "/", rewrite internally to the landing page.
 */
const DOMAIN_LANDING_PAGES: Record<string, string> = {
  'herbolin.com': 'Harbora-kosthogut',
  'www.herbolin.com': 'Harbora-kosthogut',
};

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0] || '';
  const slug = DOMAIN_LANDING_PAGES[host];

  // Only rewrite root path for mapped domains
  if (slug && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL(`/lp/${slug}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on paths that matter — skip static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|uploads).*)'],
};
