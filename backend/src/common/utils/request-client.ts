import type { Request } from 'express';

function firstHeaderValue(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || '').split(',')[0].trim();
}

export function getRequestClientIp(req: Request | any): string {
  const candidates = [
    firstHeaderValue(req?.headers?.['cf-connecting-ip']),
    firstHeaderValue(req?.headers?.['true-client-ip']),
    firstHeaderValue(req?.headers?.['x-real-ip']),
    String(req?.ip || '').trim(),
    firstHeaderValue(req?.headers?.['x-forwarded-for']),
    String(req?.socket?.remoteAddress || '').trim(),
  ];

  return candidates.find(Boolean)?.replace(/^::ffff:/, '') || '';
}

export function getRequestUserAgent(req: Request | any): string {
  const value = req?.headers?.['user-agent'];
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || '').trim().slice(0, 1000);
}
