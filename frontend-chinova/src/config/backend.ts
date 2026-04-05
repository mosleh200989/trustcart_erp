const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

if (!rawApiBaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_API_URL. Set it in frontend/.env or frontend/.env.local (example: https://your-backend-domain/api).',
  );
}

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

export const BACKEND_API_BASE_URL = stripTrailingSlashes(rawApiBaseUrl);

export const BACKEND_ORIGIN = (() => {
  const apiBase = BACKEND_API_BASE_URL;
  return apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
})();

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

export const apiUrl = (path: string) => {
  if (!path) return BACKEND_API_BASE_URL;
  if (isAbsoluteUrl(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_API_BASE_URL}${normalized}`;
};

export const backendUrl = (path: string) => {
  if (!path) return BACKEND_ORIGIN;
  if (isAbsoluteUrl(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_ORIGIN}${normalized}`;
};
