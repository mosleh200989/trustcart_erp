import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import apiClient from '@/services/api';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/utils/safeStorage';

// ─── Types ──────────────────────────────────────────────────────

export interface CartItem {
  id: number;                  // product ID
  cartItemId?: string;         // unique key for variants: "123-500g"
  name: string;
  name_en?: string;
  nameEn?: string;
  sku?: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string | null;
  variantDetails?: any;
  category?: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  /** Add an item (or increment existing). */
  addItem: (item: CartItem) => void;
  /** Remove an item by index. */
  removeItem: (index: number) => void;
  /** Update quantity of an item by index. */
  updateQuantity: (index: number, quantity: number) => void;
  /** Replace the entire cart (used by checkout suggested products, etc). */
  setItems: (items: CartItem[]) => void;
  /** Clear the entire cart. */
  clearCart: () => void;
  /** Whether a server sync is in-flight. */
  syncing: boolean;
  /** Cart session ID (persisted across tabs). */
  sessionId: string;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// ─── Helpers ────────────────────────────────────────────────────

const STORAGE_KEY = 'cart';
const SESSION_KEY = 'cartSessionId';
const SYNC_DEBOUNCE_MS = 1000;

function generateSessionId(): string {
  // Crypto-safe UUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = safeGetItem(SESSION_KEY);
  if (!id) {
    id = generateSessionId();
    safeSetItem(SESSION_KEY, id);
  }
  return id;
}

function readLocalCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  safeSetItem(STORAGE_KEY, JSON.stringify(items));
}

function calcSubtotal(items: CartItem[]): number {
  return items.reduce((sum, it) => sum + it.price * (it.quantity || 1), 0);
}

function itemKey(item: CartItem): string {
  return item.cartItemId ?? String(item.id);
}

// ─── Provider ───────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItemsState] = useState<CartItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const sessionId = useMemo(() => getSessionId(), []);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSynced = useRef<string>('');

  // ── Initialise from localStorage on mount ──
  useEffect(() => {
    setItemsState(readLocalCart());
  }, []);

  // ── Listen for cross-tab or legacy "cartUpdated" events ──
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setItemsState(readLocalCart());
      }
    };
    const onCartEvent = () => {
      setItemsState(readLocalCart());
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('cartUpdated', onCartEvent);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cartUpdated', onCartEvent);
    };
  }, []);

  // ── Debounced server sync ──
  const syncToServer = useCallback(
    (cart: CartItem[]) => {
      if (!sessionId) return;
      // Skip if nothing changed
      const snapshot = JSON.stringify(cart);
      if (snapshot === lastSynced.current) return;

      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(async () => {
        try {
          setSyncing(true);
          await apiClient.put(`/cart/${sessionId}`, {
            items: cart.map((it) => ({
              productId: it.id,
              productName: it.name || it.name_en,
              variant: it.variant || null,
              unitPrice: it.price,
              quantity: it.quantity || 1,
              imageUrl: it.image || null,
              category: it.category || null,
            })),
          });
          lastSynced.current = snapshot;
        } catch {
          // Silent fail — localStorage is the source of truth
        } finally {
          setSyncing(false);
        }
      }, SYNC_DEBOUNCE_MS);
    },
    [sessionId],
  );

  // Helper: persist to localStorage, update state, trigger events, sync
  const persist = useCallback(
    (newItems: CartItem[]) => {
      writeLocalCart(newItems);
      setItemsState(newItems);
      // Dispatch for legacy listeners (navbar badge, etc.)
      window.dispatchEvent(new Event('cartUpdated'));
      syncToServer(newItems);
    },
    [syncToServer],
  );

  // ── Public API ──

  const addItem = useCallback(
    (item: CartItem) => {
      const current = readLocalCart();
      const key = itemKey(item);
      const idx = current.findIndex((ci) => itemKey(ci) === key);
      if (idx >= 0) {
        current[idx] = { ...current[idx], quantity: (current[idx].quantity || 1) + (item.quantity || 1) };
      } else {
        current.push({ ...item, quantity: item.quantity || 1 });
      }
      persist(current);
    },
    [persist],
  );

  const removeItem = useCallback(
    (index: number) => {
      const current = readLocalCart();
      const newCart = current.filter((_, i) => i !== index);
      persist(newCart);
    },
    [persist],
  );

  const updateQuantity = useCallback(
    (index: number, quantity: number) => {
      if (quantity < 1) return;
      const current = readLocalCart();
      if (!current[index]) return;
      current[index] = { ...current[index], quantity };
      persist(current);
    },
    [persist],
  );

  const setItems = useCallback(
    (newItems: CartItem[]) => {
      persist(newItems);
    },
    [persist],
  );

  const clearCart = useCallback(() => {
    safeRemoveItem(STORAGE_KEY);
    setItemsState([]);
    window.dispatchEvent(new Event('cartUpdated'));
    // Also clear on server
    if (sessionId) {
      apiClient.delete(`/cart/${sessionId}`).catch(() => {});
    }
  }, [sessionId]);

  const count = items.length;
  const subtotal = useMemo(() => calcSubtotal(items), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      setItems,
      clearCart,
      syncing,
      sessionId,
    }),
    [items, count, subtotal, addItem, removeItem, updateQuantity, setItems, clearCart, syncing, sessionId],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within <CartProvider>');
  }
  return ctx;
}
