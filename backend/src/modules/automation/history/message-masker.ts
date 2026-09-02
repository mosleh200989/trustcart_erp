/**
 * Strips every figure and identifier out of a historical message before it is
 * stored.
 *
 * Imported conversations exist to teach the bot HOW the team writes, never WHAT
 * is true. A price quoted eighteen months ago is wrong today, and a model shown
 * "eta 850 tk" will happily repeat 850. So the numbers are removed at import,
 * not at query time: the stale figure is never written to disk, and therefore
 * cannot be retrieved, prompted with, or leaked by a later change.
 *
 * Placeholders are deliberately readable. A model shown "eta [PRICE] tk" copies
 * the shape and takes the actual figure from the SHOP FACTS block, which is the
 * whole point of the split.
 *
 * This is best-effort, not a guarantee. Prices written in words ("sat sho taka")
 * and street addresses are not caught. It is one of three layers — the others
 * being the system prompt rule and reading the drafts during shadow mode.
 */

export type MaskCounts = Record<string, number>;

export type MaskResult = {
  text: string;
  counts: MaskCounts;
  /** True when almost nothing survived masking — a poor style example. */
  mostlyMasked: boolean;
};

/** Bengali digits ০-৯ mapped to ASCII so one set of patterns covers both. */
const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

export function normalizeBengaliDigits(input: string): string {
  return String(input ?? '').replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
}

/**
 * Order matters: the most specific pattern must win. A phone number is a long
 * digit run, and an order number contains digit runs, so those are consumed
 * before anything generic looks at what is left.
 */
const RULES: Array<{ token: string; pattern: RegExp }> = [
  { token: 'EMAIL', pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi },

  // ORDER must run before PHONE. The digits inside SO-1735000000-1234 satisfy
  // the Bangladeshi mobile pattern, so the other order leaves
  // "SO-[PHONE]-[NUMBER]" behind instead of one clean placeholder.
  { token: 'ORDER', pattern: /\bSO-[A-Za-z0-9-]{4,}\b/gi },
  { token: 'PHONE', pattern: /(?:\+?88)?0?1[3-9]\d{8}\b/g },

  // Money, in the shapes people actually type.
  // ৳850 — the taka sign is not a word character, so no \b around it.
  { token: 'PRICE', pattern: /৳\s?\d[\d,]*(?:\.\d+)?/g },
  // 850 টাকা — the Bengali currency word. Without this the most natural way to
  // write a price in Bangla survives masking completely, which is the single
  // worst leak this file can have. \b is ASCII-only in JS and would not match
  // against Bengali script, so it is deliberately absent here.
  { token: 'PRICE', pattern: /\d[\d,]*(?:\.\d+)?\s?(?:টাকা|টকা|৳)/g },
  // 850 tk / 850 taka / 850 BDT
  { token: 'PRICE', pattern: /\b\d[\d,]*(?:\.\d+)?\s?(?:tk|tka|taka|bdt)\b/gi },
  // 850/- — the slash must be escaped, and a trailing \b would never match
  // after a hyphen because a hyphen is not a word character.
  { token: 'PRICE', pattern: /\b\d[\d,]*(?:\.\d+)?\s?\/-/g },
  // tk 850 / taka 850 / BDT 850
  { token: 'PRICE', pattern: /\b(?:tk|tka|taka|bdt)\.?\s?\d[\d,]*(?:\.\d+)?/gi },

  // Weight and volume.
  {
    token: 'WEIGHT',
    pattern: /\b\d[\d,]*(?:\.\d+)?\s?(?:kg|kgs|gm|gms|gram|grams|g|ml|litre|liter|ltr|l)\b/gi,
  },

  // Quantities: "2 pcs", "3 ta", "2 piece", "5 bottle".
  {
    token: 'QTY',
    pattern: /\b\d+\s?(?:pcs|pc|piece|pieces|ta|ti|bottle|bottles|box|boxes|packet|packets)\b/gi,
  },

  // Anything left that is a run of digits long enough to be an identifier.
  { token: 'NUMBER', pattern: /\b\d{4,}\b/g },
];

/**
 * Masks one message body.
 *
 * Returns the masked text plus a tally of what was replaced, so a message that
 * was mostly figures can be recognised as a weak style example later.
 */
export function maskMessage(input: string | null | undefined): MaskResult {
  const original = String(input ?? '');
  if (!original.trim()) {
    return { text: '', counts: {}, mostlyMasked: false };
  }

  // Normalise Bengali digits first, otherwise "৮৫০ টাকা" slips past every
  // pattern below and a stale price survives in the store.
  let text = normalizeBengaliDigits(original);
  const counts: MaskCounts = {};

  for (const { token, pattern } of RULES) {
    text = text.replace(pattern, () => {
      counts[token] = (counts[token] ?? 0) + 1;
      return `[${token}]`;
    });
  }

  // How much of the remaining message is placeholder rather than words.
  const placeholderChars = (text.match(/\[[A-Z]+\]/g) ?? []).join('').length;
  const visible = text.replace(/\s+/g, '').length;
  const mostlyMasked = visible > 0 && placeholderChars / visible > 0.5;

  return { text: text.trim(), counts, mostlyMasked };
}

/**
 * True when a masked message is worth keeping as a style example.
 *
 * Very short messages carry no voice, and messages that are mostly placeholders
 * teach the model to emit placeholders.
 */
export function isUsableExample(result: MaskResult): boolean {
  const words = result.text.replace(/\[[A-Z]+\]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return words.length >= 4 && !result.mostlyMasked;
}
