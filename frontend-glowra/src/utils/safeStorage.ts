/**
 * Safe localStorage / sessionStorage wrappers.
 *
 * In some environments (sandboxed iframes, "Block third-party cookies"
 * browser settings, SSR) accessing `window.localStorage` throws a
 * SecurityError. These helpers catch that and fall back gracefully.
 */

function isStorageAvailable(storage: () => Storage): boolean {
  try {
    const s = storage();
    const key = '__storage_test__';
    s.setItem(key, '1');
    s.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

const localStorageAvailable =
  typeof window !== 'undefined' && isStorageAvailable(() => window.localStorage);

const sessionStorageAvailable =
  typeof window !== 'undefined' && isStorageAvailable(() => window.sessionStorage);

// ── localStorage helpers ──

export function safeGetItem(key: string): string | null {
  if (!localStorageAvailable) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  if (!localStorageAvailable) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota exceeded or access denied — silently ignore
  }
}

export function safeRemoveItem(key: string): void {
  if (!localStorageAvailable) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ── sessionStorage helpers ──

export function safeSessionGetItem(key: string): string | null {
  if (!sessionStorageAvailable) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSessionSetItem(key: string, value: string): void {
  if (!sessionStorageAvailable) return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function safeSessionRemoveItem(key: string): void {
  if (!sessionStorageAvailable) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
