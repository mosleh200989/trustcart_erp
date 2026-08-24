import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Domain routing.
 *
 * The primary source of truth is the storefront_domains table, fetched from
 * the backend (/storefront-domains/public/map) and cached in-memory for 60s.
 * The hardcoded maps below are the FALLBACK — used when the API is
 * unreachable or a domain has no row yet — so a backend outage can never
 * take the brand domains down.
 *
 * Manage mappings in Admin → Storefronts → Domains.
 */

// ─── Fallback maps (legacy hardcoded behaviour) ─────────────

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
 * Domain + path → landing page slug mapping (special campaign paths).
 * Deliberately not modelled in the Domains table — code-level only.
 */
const DOMAIN_PATH_LANDING_PAGES: Record<string, Record<string, string>> = {
  'herbolin.com': {
    '/arabiankhalta': 'arabiankhalta',
  },
  'www.herbolin.com': {
    '/arabiankhalta': 'arabiankhalta',
  },
};

const STOREFRONT_DOMAINS: Record<string, string> = {
  'handsomemanbd.com': '/hm',
  'www.handsomemanbd.com': '/hm',
};

/**
 * A storefront's `template` is a hand-coded frontend implementation, so the
 * template → page-tree prefix mapping legitimately lives in code.
 */
const TEMPLATE_PREFIXES: Record<string, string> = {
  handsomeman: '/hm',
};

// ─── DB-driven domain map (cached) ──────────────────────────

interface DomainTarget {
  type: 'storefront' | 'landing_page';
  slug?: string;    // landing page slug
  prefix?: string;  // storefront page-tree prefix
}

const MAP_TTL_MS = 60_000;
let domainMapCache: { map: Record<string, DomainTarget>; fetchedAt: number } | null = null;

async function getDomainMap(): Promise<Record<string, DomainTarget> | null> {
  if (domainMapCache && Date.now() - domainMapCache.fetchedAt < MAP_TTL_MS) {
    return domainMapCache.map;
  }
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  if (!apiBase) return domainMapCache?.map || null;

  try {
    const res = await fetch(`${apiBase}/storefront-domains/public/map`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(`map fetch ${res.status}`);
    const rows: Array<{
      domain: string;
      target_type: 'storefront' | 'landing_page';
      slug: string | null;
      template: string | null;
    }> = await res.json();

    const map: Record<string, DomainTarget> = {};
    for (const row of rows) {
      if (row.target_type === 'storefront') {
        const prefix = TEMPLATE_PREFIXES[row.template || ''];
        if (prefix) map[row.domain] = { type: 'storefront', prefix };
      } else if (row.slug) {
        map[row.domain] = { type: 'landing_page', slug: row.slug };
      }
    }
    domainMapCache = { map, fetchedAt: Date.now() };
    return map;
  } catch {
    // Keep serving the last good map; fall back to constants otherwise
    return domainMapCache?.map || null;
  }
}

function resolveTarget(host: string, dbMap: Record<string, DomainTarget> | null): DomainTarget | null {
  if (dbMap && dbMap[host]) return dbMap[host];
  if (STOREFRONT_DOMAINS[host]) return { type: 'storefront', prefix: STOREFRONT_DOMAINS[host] };
  if (DOMAIN_LANDING_PAGES[host]) return { type: 'landing_page', slug: DOMAIN_LANDING_PAGES[host] };
  return null;
}

// ─── Middleware ──────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0] || '';
  const pathname = request.nextUrl.pathname.replace(/\/$/, '') || '/';

  // Special campaign paths first (code-level, host + path)
  const pathSlug = DOMAIN_PATH_LANDING_PAGES[host]?.[pathname];
  if (pathSlug) {
    return NextResponse.rewrite(new URL(`/lp/${pathSlug}`, request.url));
  }

  const dbMap = await getDomainMap();
  const target = resolveTarget(host, dbMap);
  if (!target) return NextResponse.next();

  if (target.type === 'storefront' && target.prefix) {
    if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
      return NextResponse.next();
    }
    // Keep public URLs clean: /hm/... links redirect to the unprefixed path
    if (pathname === target.prefix || pathname.startsWith(`${target.prefix}/`)) {
      const clean = pathname.slice(target.prefix.length) || '/';
      const url = request.nextUrl.clone();
      url.pathname = clean;
      return NextResponse.redirect(url, 308);
    }
    // Serve everything else from the storefront page tree
    const url = request.nextUrl.clone();
    url.pathname = `${target.prefix}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Landing page domain: only the root URL rewrites to the page
  if (target.type === 'landing_page' && target.slug && pathname === '/') {
    return NextResponse.rewrite(new URL(`/lp/${target.slug}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on paths that matter — skip static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|uploads).*)'],
};
