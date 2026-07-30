/**
 * Meta catalog item IDs come from products.id in /api/feed/facebook.xml.
 * Keep every catalog-facing event field on that single identifier format.
 */
export function normalizeMetaCatalogProductId(value: unknown): string {
  const normalized = String(value ?? '').trim();
  return /^[1-9]\d*$/.test(normalized) ? normalized : '';
}
