import { AutomationErpService } from './automation-erp.service';

describe('AutomationErpService.extractOrderNumbers', () => {
  it('finds a TrustCart order number', () => {
    expect(
      AutomationErpService.extractOrderNumbers('amar order SO-1735000000-1234 kothay?'),
    ).toContain('SO-1735000000-1234');
  });

  it('uppercases the order number so it matches the stored value', () => {
    expect(AutomationErpService.extractOrderNumbers('so-1735000000-1234')).toContain(
      'SO-1735000000-1234',
    );
  });

  it('finds a bare long digit run', () => {
    expect(AutomationErpService.extractOrderNumbers('order 1735000 status?')).toContain('1735000');
  });

  it('ignores short numbers so "2 pcs" is not treated as an order', () => {
    expect(AutomationErpService.extractOrderNumbers('ami 2 pcs nibo')).toEqual([]);
  });

  it('returns an empty list for text with no numbers', () => {
    expect(AutomationErpService.extractOrderNumbers('dam koto?')).toEqual([]);
  });

  it('caps the result so a spam message cannot fan out into many lookups', () => {
    const spam = Array.from({ length: 20 }, (_, i) => `SO-17350000${i}0-1234`).join(' ');
    expect(AutomationErpService.extractOrderNumbers(spam).length).toBeLessThanOrEqual(3);
  });
});

describe('AutomationErpService.extractPhoneNumbers', () => {
  it.each([
    ['01712345678', '01712345678'],
    ['+8801712345678', '01712345678'],
    ['8801712345678', '01712345678'],
  ])('normalises %s to the local form', (input, expected) => {
    expect(AutomationErpService.extractPhoneNumbers(`call me ${input}`)).toContain(expected);
  });

  it('finds a number embedded in a sentence', () => {
    expect(
      AutomationErpService.extractPhoneNumbers('nibo, amar number 01812345678 e call den'),
    ).toContain('01812345678');
  });

  it('ignores operator prefixes that do not exist', () => {
    // 012xxxxxxxx is not a valid Bangladeshi mobile prefix.
    expect(AutomationErpService.extractPhoneNumbers('01212345678')).toEqual([]);
  });

  it('returns an empty list when there is no phone number', () => {
    expect(AutomationErpService.extractPhoneNumbers('delivery charge koto?')).toEqual([]);
  });
});
