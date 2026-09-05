/**
 * Splitting Bangla, Banglish and English into comparable words.
 *
 * Shared because two places need exactly this and getting it subtly different
 * in each is how the `AutomationReplySource` duplication went wrong.
 *
 * `\w` is ASCII-only in JavaScript, so splitting on it shreds every Bengali
 * word — the same trap that let `_850_ taka` through the masker. `\p{M}` is
 * just as load-bearing as `\p{L}`: Bengali vowel signs and the virama
 * (ি, ে, া, ্) are combining Marks, not Letters, so a class of letters and
 * numbers alone treats them as separators and "ডেলিভারি" comes back as four
 * meaningless fragments.
 */
export function tokenize(text: string): string[] {
  return String(text ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .filter(Boolean);
}

/** Punctuation and spacing collapsed, so a phrase can be searched as a substring. */
export function normalizePhrase(text: string): string {
  return tokenize(text).join(' ');
}

/**
 * True when `phrase` appears in `text` as whole words.
 *
 * Never a bare substring test. `ji` is a perfectly good "yes" in Banglish and
 * it is also inside `jinis`, so a substring match read "ami ei jinis nibo na"
 * — *I won't take this thing* — as a confirmation. That is a real order
 * created out of a refusal, which is exactly the kind of mistake a shop only
 * finds out about when a parcel arrives.
 */
export function containsPhrase(text: string, phrase: string): boolean {
  const haystack = normalizePhrase(text);
  const needle = normalizePhrase(phrase);
  if (!haystack || !needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

/** True when any of `phrases` appears in `text` as whole words. */
export function containsAnyPhrase(text: string, phrases: readonly string[]): boolean {
  return (phrases || []).some((phrase) => containsPhrase(text, String(phrase ?? '')));
}
