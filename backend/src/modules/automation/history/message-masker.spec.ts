import { maskMessage, isUsableExample, normalizeBengaliDigits } from './message-masker';

/**
 * This is the load-bearing piece of the whole history import.
 *
 * Imported conversations teach the bot how the team writes, never what is true.
 * If a stale price survives masking it gets stored, retrieved, and eventually
 * quoted to a customer as though it were current. The masking happens at import
 * so a leaked figure is impossible rather than merely unlikely — which only
 * holds if these patterns actually catch what people type.
 */

describe('normalizeBengaliDigits', () => {
  it('converts Bengali digits so one set of patterns covers both scripts', () => {
    expect(normalizeBengaliDigits('৮৫০')).toBe('850');
    expect(normalizeBengaliDigits('দাম ৯৯০ টাকা')).toBe('দাম 990 টাকা');
  });

  it('leaves text without Bengali digits untouched', () => {
    expect(normalizeBengaliDigits('850 tk')).toBe('850 tk');
  });
});

describe('maskMessage — prices', () => {
  it.each([
    ['eta 850 tk', 'eta [PRICE]'],
    ['eta 850tk', 'eta [PRICE]'],
    ['dam 990 taka', 'dam [PRICE]'],
    ['price 1,350 BDT', 'price [PRICE]'],
    ['৳850 only', '[PRICE] only'],
    ['850/- only', '[PRICE] only'],
    ['tk 850', '[PRICE]'],
    ['taka 990', '[PRICE]'],
  ])('masks %s', (input, expected) => {
    expect(maskMessage(input).text).toBe(expected);
  });

  it('catches a price written in Bengali digits', () => {
    // The case regexes miss unless digits are normalised first — and the one
    // most likely to appear in a real Bangla conversation.
    const result = maskMessage('দাম ৮৫০ টাকা');
    expect(result.text).not.toContain('850');
    expect(result.text).not.toContain('৮৫০');
    expect(result.counts.PRICE).toBeGreaterThan(0);
  });

  it('masks several prices in one message and counts them', () => {
    const result = maskMessage('ager dam 850 tk, ekhon 699 tk');
    expect(result.text).toBe('ager dam [PRICE], ekhon [PRICE]');
    expect(result.counts.PRICE).toBe(2);
  });
});

describe('maskMessage — personal data', () => {
  it.each([
    ['call me 01712345678', 'call me [PHONE]'],
    ['+8801712345678 e call den', '[PHONE] e call den'],
    ['mail korun a@b.com', 'mail korun [EMAIL]'],
  ])('masks %s', (input, expected) => {
    expect(maskMessage(input).text).toBe(expected);
  });

  it('masks an order number before any generic digit rule sees it', () => {
    const result = maskMessage('amar order SO-1735000000-1234 kothay?');
    expect(result.text).toBe('amar order [ORDER] kothay?');
    expect(result.counts.ORDER).toBe(1);
  });
});

describe('maskMessage — quantities and weights', () => {
  it.each([
    ['500 gm nibo', '[WEIGHT] nibo'],
    ['1 kg lagbe', '[WEIGHT] lagbe'],
    ['250ml ache?', '[WEIGHT] ache?'],
    ['2 pcs din', '[QTY] din'],
    ['3 ta lagbe', '[QTY] lagbe'],
  ])('masks %s', (input, expected) => {
    expect(maskMessage(input).text).toBe(expected);
  });
});

describe('maskMessage — what it must not destroy', () => {
  it('keeps the sentence readable so the voice survives', () => {
    const result = maskMessage('Bhai eta ekhon 850 tk. Free delivery ache 1000 tk+ order e. Nibn?');
    expect(result.text).toBe('Bhai eta ekhon [PRICE]. Free delivery ache [PRICE]+ order e. Nibn?');
  });

  it('leaves small standalone numbers alone rather than shredding the text', () => {
    // "2 din" is delivery time, not an identifier — masking it would remove
    // meaning without removing risk.
    expect(maskMessage('2 din lagbe').text).toBe('2 din lagbe');
  });

  it('returns empty for empty input instead of throwing', () => {
    expect(maskMessage('').text).toBe('');
    expect(maskMessage(null).text).toBe('');
    expect(maskMessage(undefined).text).toBe('');
  });
});

describe('isUsableExample', () => {
  it('accepts a normal reply with a masked price', () => {
    expect(isUsableExample(maskMessage('Bhai eta ekhon [PRICE] tk, nibn?'))).toBe(true);
  });

  it('rejects something too short to carry any voice', () => {
    expect(isUsableExample(maskMessage('ok'))).toBe(false);
    expect(isUsableExample(maskMessage('ji bhai'))).toBe(false);
  });

  it('rejects a message that is mostly placeholders', () => {
    // Teaching the model from this would teach it to emit placeholders.
    const result = maskMessage('850 tk 990 tk 01712345678');
    expect(isUsableExample(result)).toBe(false);
  });
});
