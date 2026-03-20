/** Shared SEO constants used across all public pages */

export const SITE_NAME = 'TrustCart';
export const SITE_URL = 'https://trustkert.com';
export const SITE_DESCRIPTION =
  'Shop premium organic groceries, pure ghee, honey, spices & healthy food online at TrustCart. Fresh, authentic & delivered to your door in Bangladesh.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/trust-cart-logo-main.png`;
export const SITE_LOCALE = 'en_BD';
export const SITE_TWITTER_HANDLE = '@trustcart';

/** Build a canonical URL from a path (no trailing slash) */
export function canonicalUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}

/** Build a product image URL — handles absolute and relative paths */
export function productImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) return DEFAULT_OG_IMAGE;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${SITE_URL}/assets/uploads/${imageUrl}`;
}
