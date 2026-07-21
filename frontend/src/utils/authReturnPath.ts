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

function isSafeLocalPath(path: string): boolean {
  const value = String(path || '').trim();
  return value.startsWith('/') && !value.startsWith('//') && !isAuthPath(value);
}

function matchesRequiredPrefix(path: string, requiredPrefix?: string): boolean {
  if (!requiredPrefix) return true;
  const normalizedPath = normalizePath(path);
  const normalizedPrefix = normalizePath(requiredPrefix);
  return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);
}

export function isAuthPath(pathOrUrl: string): boolean {
  const path = normalizePath(pathOrUrl);
  return AUTH_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function setAuthReturnPath(path: string): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizePath(path);
  if (!normalized || !isSafeLocalPath(path)) return;

  try {
    window.sessionStorage.setItem(AUTH_RETURN_PATH_KEY, path);
  } catch {
    // ignore
  }
}

export function getAuthReturnPath(fallback: string = '/products', requiredPrefix?: string): string {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = window.sessionStorage.getItem(AUTH_RETURN_PATH_KEY);
    return value && isSafeLocalPath(value) && matchesRequiredPrefix(value, requiredPrefix) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function consumeAuthReturnPath(fallback: string = '/products', requiredPrefix?: string): string {
  const destination = getAuthReturnPath(fallback, requiredPrefix);
  if (typeof window === 'undefined') return destination;

  try {
    window.sessionStorage.removeItem(AUTH_RETURN_PATH_KEY);
  } catch {
    // ignore
  }
  return destination;
}
