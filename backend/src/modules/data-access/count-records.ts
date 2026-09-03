/**
 * How many records a read actually returned.
 *
 * Controllers in this codebase answer in several shapes — a bare array, an
 * envelope with `items`/`rows`/`data`, a single object — and the row count is
 * the number that makes the access log worth reading ("saw 4,000 customers"
 * rather than "opened a page"). Anything unrecognised counts as one record
 * rather than zero: undercounting a read is the failure that matters.
 */
export function countRecords(payload: any): number {
  if (payload == null) return 0;
  if (Array.isArray(payload)) return payload.length;

  if (typeof payload === 'object') {
    for (const key of ['items', 'rows', 'data', 'results', 'records']) {
      const value = (payload as any)[key];
      if (Array.isArray(value)) return value.length;
    }

    // A CSV/text export: count the data lines, not the header.
    if (typeof (payload as any).csv === 'string') {
      const lines = (payload as any).csv.trim().split('\n');
      return Math.max(0, lines.length - 1);
    }

    return 1;
  }

  if (typeof payload === 'string') {
    const lines = payload.trim().split('\n');
    return Math.max(0, lines.length - 1);
  }

  return 1;
}

/**
 * The filters a read used, kept for the log. Paging noise is dropped and
 * anything long is truncated — this is a record of intent ("searched for
 * 017…"), not a place to accumulate more data than the log is worth.
 */
export function summariseFilters(query: Record<string, any> | undefined): Record<string, string> {
  const ignored = new Set(['page', 'limit', 'offset', 'sort', 'order', 'sortBy', 'sortOrder']);
  const summary: Record<string, string> = {};

  for (const [key, value] of Object.entries(query || {})) {
    if (ignored.has(key)) continue;
    if (value == null || value === '') continue;
    summary[key.slice(0, 40)] = String(value).slice(0, 120);
  }

  return summary;
}
