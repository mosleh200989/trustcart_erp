export const DHAKA_TIME_ZONE = 'Asia/Dhaka';

export function getDhakaDateString(input: Date | string | number = new Date()): string {
  const date = input instanceof Date ? input : new Date(input);
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

export function addDhakaDays(days: number, input: Date | string | number = new Date()): string {
  const date = input instanceof Date ? new Date(input) : new Date(input);
  date.setUTCDate(date.getUTCDate() + days);
  return getDhakaDateString(date);
}
