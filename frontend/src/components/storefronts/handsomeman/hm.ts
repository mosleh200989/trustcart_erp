// Shared types, API helpers and cart state for the Handsome Man storefront.
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/services/api';

export const HM_SLUG = 'handsomeman';

export interface HMCategory {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
}

export interface HMStorefront {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  tagline: string | null;
  description: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  social_links: Record<string, string>;
  meta_pixel_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  delivery_charge_inside: number;
  delivery_charge_outside: number;
  free_delivery_threshold: number | null;
  categories: HMCategory[];
}

export interface HMProduct {
  id: number;               // listing id
  product_id: number;       // inventory product id
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  base_price: number;
  sale_price: number | null;
  stock_quantity: number | null;
  size_variants: Array<{ name: string; price: number; compare_price?: number }>;
  storefront_category_id: number | null;
  is_featured: boolean;
}

export function hmPrice(p: HMProduct): { price: number; compare: number | null } {
  const base = Number(p.base_price);
  const sale = p.sale_price != null ? Number(p.sale_price) : null;
  if (sale != null && sale > 0 && sale < base) return { price: sale, compare: base };
  return { price: base, compare: null };
}

export const taka = (n: number) => `৳${Number(n || 0).toLocaleString('en-US')}`;

// ─── API ─────────────────────────────────────────────────────

export const fetchHMConfig = async (): Promise<HMStorefront> =>
  (await apiClient.get(`/storefronts/public/${HM_SLUG}/config`)).data;

export const fetchHMProducts = async (
  opts: { category?: string; search?: string; featured?: boolean } = {},
): Promise<HMProduct[]> => {
  const params = new URLSearchParams();
  if (opts.category) params.set('category', opts.category);
  if (opts.search) params.set('search', opts.search);
  if (opts.featured) params.set('featured', 'true');
  const qs = params.toString();
  return (await apiClient.get(`/storefronts/public/${HM_SLUG}/products${qs ? `?${qs}` : ''}`)).data;
};

export const fetchHMProduct = async (slug: string): Promise<HMProduct> =>
  (await apiClient.get(`/storefronts/public/${HM_SLUG}/products/${encodeURIComponent(slug)}`)).data;

// ─── Cart (localStorage-backed) ──────────────────────────────

export interface HMCartItem {
  product_id: number;
  slug: string;
  name: string;
  image_url: string | null;
  unit_price: number;
  variant?: string;
  quantity: number;
}

const CART_KEY = 'hm_cart_v1';
const CART_EVENT = 'hm-cart-changed';

function readCart(): HMCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: HMCartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

const itemKey = (i: { product_id: number; variant?: string }) =>
  `${i.product_id}::${i.variant || ''}`;

export function useHMCart() {
  const [items, setItems] = useState<HMCartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
    const sync = () => setItems(readCart());
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const add = useCallback((item: Omit<HMCartItem, 'quantity'>, quantity = 1) => {
    const cart = readCart();
    const key = itemKey(item);
    const existing = cart.find((c) => itemKey(c) === key);
    if (existing) existing.quantity += quantity;
    else cart.push({ ...item, quantity });
    writeCart(cart);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    let cart = readCart();
    if (quantity <= 0) cart = cart.filter((c) => itemKey(c) !== key);
    else cart = cart.map((c) => (itemKey(c) === key ? { ...c, quantity } : c));
    writeCart(cart);
  }, []);

  const remove = useCallback((key: string) => {
    writeCart(readCart().filter((c) => itemKey(c) !== key));
  }, []);

  const clear = useCallback(() => writeCart([]), []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  return { items, add, setQuantity, remove, clear, count, subtotal, itemKey };
}

// ─── Meta Pixel helpers ──────────────────────────────────────

export function hmTrack(event: string, params?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  const fbq = (window as any).fbq;
  if (typeof fbq === 'function') fbq('track', event, params || {});
}
