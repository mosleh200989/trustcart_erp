/**
 * XML Escape Utility
 * Escapes special characters for safe inclusion in XML content.
 */
export function escapeXml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format a Date object to W3C Datetime (ISO 8601) format
 * Used in sitemaps: YYYY-MM-DDThh:mm:ss+00:00
 */
export function formatW3CDate(date: Date | string | undefined | null): string {
  if (!date) return new Date().toISOString();
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Format price with currency code for Google Merchant feed
 * e.g., "100.00 BDT"
 */
export function formatPrice(
  price: number | string | undefined | null,
  currency = 'BDT',
): string {
  if (price === undefined || price === null) return `0.00 ${currency}`;
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `${numPrice.toFixed(2)} ${currency}`;
}

/**
 * Generate a full URL from a base URL and path
 */
export function buildUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  return `${base}/${p}`;
}

/**
 * Ensure a URL is absolute. If it starts with http(s), return as-is.
 * Otherwise, prepend the baseUrl.
 */
export function ensureAbsoluteUrl(
  url: string | undefined | null,
  baseUrl: string,
): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return buildUrl(baseUrl, url);
}

/**
 * Strip HTML tags from a string (for feed descriptions)
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Truncate a string to a max length, adding ellipsis if needed
 */
export function truncate(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
