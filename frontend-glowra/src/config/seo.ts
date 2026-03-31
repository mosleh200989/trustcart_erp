/** Shared SEO constants used across all public pages */

export const SITE_NAME = 'Natural Glowra';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://naturalglowra.com';
export const SITE_DESCRIPTION =
  'Discover premium natural cosmetics, skincare & beauty products at Natural Glowra. Glow naturally with our curated collection of safe, effective beauty essentials.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/natural-glowra-logo.png`;
export const SITE_LOCALE = 'en_BD';
export const SITE_TWITTER_HANDLE = '@naturalglowra';

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
