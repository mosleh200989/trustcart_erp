/**
 * Which browser origins may call this API.
 *
 * One backend serves every brand storefront, so the allow-list is built from a
 * list of domains rather than a single FRONTEND_URL. Kept out of main.ts so the
 * matching rule can be tested directly — it is security-relevant and was
 * previously wrong in a way no smoke test would have caught.
 */

/** Every domain whose storefront is served by this backend. */
export const APP_DOMAINS = [
  'trustcart.com.bd',
  'shop.trustcart.com.bd',
  'trustkert.com',
  'api.trustkert.com',
  'herbolin.com',
  'api.herbolin.com',
  'arabiankhalta.com',
  'veshoj.site',
  'api.veshoj.site',
  'kasrioil.com',
  'naturalglowra.com',
];

export function buildAllowedOrigins(frontendUrl?: string): Set<string> {
  const origins = new Set<string>([
    'http://localhost:3000', // local frontend dev
    'http://localhost:3001', // local backend dev
  ]);

  for (const domain of APP_DOMAINS) {
    origins.add(`https://${domain}`);
    // Add the www. variant only where it makes sense.
    if (!domain.startsWith('www.') && !domain.startsWith('api.')) {
      origins.add(`https://www.${domain}`);
    }
  }

  if (frontendUrl) {
    // Tolerate a trailing slash in the environment variable; an Origin header
    // never carries one, so it would otherwise never match.
    origins.add(frontendUrl.replace(/\/+$/, ''));
  }

  return origins;
}

/**
 * Decide whether an Origin header is acceptable.
 *
 * Matching is by equality. It previously accepted any origin that merely
 * *started with* an allowed one, so `https://trustcart.com.bd.attacker.test`
 * passed — an attacker only had to register a domain with the right prefix.
 * An origin is an opaque string; equality is the only correct comparison.
 *
 * A missing Origin is allowed: server-to-server callers, curl and the courier
 * webhooks send none, and CORS is a browser control that does not apply to them.
 */
export function isOriginAllowed(
  origin: string | undefined,
  allowed: Set<string>,
  { allowAny = false }: { allowAny?: boolean } = {},
): boolean {
  if (!origin) return true;
  if (allowed.has(origin)) return true;
  return allowAny;
}
