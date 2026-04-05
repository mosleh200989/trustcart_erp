const AUTH_RETURN_PATH_KEY = 'tc:auth:returnPath';

const AUTH_PATH_PREFIXES = [
  '/customer/login',
  '/customer/register',
  '/register',
  '/admin/login',
  '/supplier/login',
];

function normalizePath(pathOrUrl: string): string {
  return (pathOrUrl || '').split('#')[0].split('?')[0];
}

export function isAuthPath(pathOrUrl: string): boolean {
  const path = normalizePath(pathOrUrl);
  return AUTH_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function setAuthReturnPath(path: string): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizePath(path);
  if (!normalized || isAuthPath(normalized)) return;

  try {
    window.sessionStorage.setItem(AUTH_RETURN_PATH_KEY, path);
  } catch {
    // ignore
  }
}

export function getAuthReturnPath(fallback: string = '/products'): string {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = window.sessionStorage.getItem(AUTH_RETURN_PATH_KEY);
    return value && value.trim() ? value : fallback;
  } catch {
    return fallback;
  }
}
