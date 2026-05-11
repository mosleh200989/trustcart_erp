export const DHAKA_TIME_ZONE = 'Asia/Dhaka';

type DateInput = Date | string | number | null | undefined;

export function getDhakaDateString(input: DateInput = new Date()): string {
  const date = input instanceof Date ? input : new Date(input ?? Date.now());
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DHAKA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : '';
}

export function addDhakaDays(days: number, input: DateInput = new Date()): string {
  const date = input instanceof Date ? new Date(input) : new Date(input ?? Date.now());
  date.setUTCDate(date.getUTCDate() + days);
  return getDhakaDateString(date);
}

function withDhakaTimeZone(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  return options?.timeZone ? options : { ...(options || {}), timeZone: DHAKA_TIME_ZONE };
}

export function formatDhakaDate(input: DateInput, locale = 'en-GB', options?: Intl.DateTimeFormatOptions): string {
  const date = input instanceof Date ? input : new Date(input ?? Date.now());
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale, withDhakaTimeZone(options));
}

export function formatDhakaDateTime(input: DateInput, locale = 'en-GB', options?: Intl.DateTimeFormatOptions): string {
  const date = input instanceof Date ? input : new Date(input ?? Date.now());
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale, withDhakaTimeZone(options));
}

export function initDhakaTimezoneDefaults() {
  if (typeof window === 'undefined') return;

  const proto = Date.prototype as Date & {
    __dhakaTimezoneDefaultsApplied?: boolean;
    toLocaleString: Date['toLocaleString'];
    toLocaleDateString: Date['toLocaleDateString'];
    toLocaleTimeString: Date['toLocaleTimeString'];
  };

  if (proto.__dhakaTimezoneDefaultsApplied) return;

  const originalToLocaleString = Date.prototype.toLocaleString;
  const originalToLocaleDateString = Date.prototype.toLocaleDateString;
  const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;

  Date.prototype.toLocaleString = function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    return originalToLocaleString.call(this, locales, withDhakaTimeZone(options));
  };

  Date.prototype.toLocaleDateString = function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    return originalToLocaleDateString.call(this, locales, withDhakaTimeZone(options));
  };

  Date.prototype.toLocaleTimeString = function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    return originalToLocaleTimeString.call(this, locales, withDhakaTimeZone(options));
  };

  proto.__dhakaTimezoneDefaultsApplied = true;
}
