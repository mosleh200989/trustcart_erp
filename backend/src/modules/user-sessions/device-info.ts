/**
 * User-agent -> device description, for the session list an admin reads.
 *
 * Hand-rolled rather than pulling in a UA library: the list only has to be
 * good enough for a human to recognise their own devices ("Chrome on Windows"),
 * and the ordering of the checks below is the whole trick — Edge and Opera both
 * claim to be Chrome, Chrome claims to be Safari, and every tablet claims to be
 * a phone. More specific patterns are therefore tested first.
 */

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';

export interface DeviceInfo {
  deviceType: DeviceType;
  browser: string | null;
  os: string | null;
  label: string;
}

const BOT = /bot|crawler|spider|crawling|headless|curl\/|wget\/|python-requests|axios\/|postman|insomnia|okhttp|monitor|uptime/i;
const TABLET = /ipad|tablet|playbook|silk|kindle|nexus 7|nexus 10|sm-t/i;
const MOBILE = /mobi|iphone|ipod|android|blackberry|bb10|windows phone|iemobile|opera mini/i;

const BROWSERS: Array<[RegExp, string]> = [
  [/edg(?:e|a|ios)?\//i, 'Edge'],
  [/opr\/|opera/i, 'Opera'],
  [/samsungbrowser\//i, 'Samsung Internet'],
  [/ucbrowser\//i, 'UC Browser'],
  [/fban|fbav|fb_iab/i, 'Facebook App'],
  [/instagram/i, 'Instagram App'],
  [/crios\//i, 'Chrome'],
  [/fxios\//i, 'Firefox'],
  [/firefox\//i, 'Firefox'],
  [/chrome\//i, 'Chrome'],
  [/safari\//i, 'Safari'],
  [/msie |trident\//i, 'Internet Explorer'],
];

const OPERATING_SYSTEMS: Array<[RegExp, string]> = [
  [/windows nt/i, 'Windows'],
  [/android/i, 'Android'],
  [/ipad|iphone|ipod/i, 'iOS'],
  [/cros/i, 'ChromeOS'],
  [/mac os x|macintosh/i, 'macOS'],
  [/linux/i, 'Linux'],
];

function firstMatch(patterns: Array<[RegExp, string]>, value: string): string | null {
  for (const [pattern, name] of patterns) {
    if (pattern.test(value)) return name;
  }
  return null;
}

export function parseDeviceInfo(userAgent?: string | null): DeviceInfo {
  const ua = String(userAgent || '').trim();

  if (!ua) {
    return { deviceType: 'unknown', browser: null, os: null, label: 'Unknown device' };
  }

  if (BOT.test(ua)) {
    return { deviceType: 'bot', browser: null, os: null, label: 'API client or bot' };
  }

  // Android tablets omit "Mobile"; every other tablet names itself.
  const isTablet = TABLET.test(ua) || (/android/i.test(ua) && !/mobi/i.test(ua));
  const deviceType: DeviceType = isTablet ? 'tablet' : MOBILE.test(ua) ? 'mobile' : 'desktop';

  const browser = firstMatch(BROWSERS, ua);
  const os = firstMatch(OPERATING_SYSTEMS, ua);

  let label: string;
  if (browser && os) label = `${browser} on ${os}`;
  else if (browser) label = browser;
  else if (os) label = os;
  else label = 'Unknown device';

  return { deviceType, browser, os, label };
}

/** Client IP as seen through nginx, matching how the audit interceptor reads it. */
export function clientIpFromRequest(req: any): string | null {
  const forwarded = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || '';
  const raw = typeof forwarded === 'string' && forwarded
    ? forwarded.split(',')[0]
    : req?.ip || req?.socket?.remoteAddress || '';
  const ip = String(raw || '').trim();
  if (!ip) return null;
  // Node reports IPv4 clients as ::ffff:203.0.113.4 on dual-stack sockets.
  return ip.replace(/^::ffff:/, '').slice(0, 100);
}
