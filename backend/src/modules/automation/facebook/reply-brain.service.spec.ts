import { ReplyBrainService } from './reply-brain.service';
import { AutomationRule } from '../entities/automation-rule.entity';
import { ErpContext } from '../automation-erp.service';

function rule(overrides: Partial<AutomationRule> = {}): AutomationRule {
  return {
    id: 1,
    channel_id: null,
    name: 'test rule',
    match_type: 'contains',
    patterns: ['price'],
    applies_to: 'both',
    action: 'reply',
    reply_text: 'Our price is good',
    private_reply_text: null,
    priority: 100,
    stop_on_match: true,
    is_active: true,
    hit_count: 0,
    last_hit_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as AutomationRule;
}

const EMPTY_ERP: ErpContext = {
  products: [],
  orders: [],
  customerId: null,
  customerName: null,
};

const ERP_WITH_PRODUCT: ErpContext = {
  products: [
    { id: 7, name: 'Beard Oil', price: 850, salePrice: 699, inStock: true, stockQuantity: 12 },
  ],
  orders: [
    {
      orderNumber: 'SO-1735000000-1234',
      status: 'processing',
      courierStatus: null,
      orderDate: '2026-08-20',
      totalAmount: 699,
    },
  ],
  customerId: 42,
  customerName: 'Karim',
};

describe('ReplyBrainService.ruleMatches', () => {
  it('matches a contains pattern case-insensitively', () => {
    expect(ReplyBrainService.ruleMatches(rule(), 'What is the PRICE please?')).toBe(true);
  });

  it('does not match when no pattern is present', () => {
    expect(ReplyBrainService.ruleMatches(rule(), 'When will it be delivered?')).toBe(false);
  });

  it('matches any one of several patterns', () => {
    const multi = rule({ patterns: ['dam', 'price', 'koto'] });
    expect(ReplyBrainService.ruleMatches(multi, 'eta koto?')).toBe(true);
  });

  it('honours equals, which must match the whole message', () => {
    const exact = rule({ match_type: 'equals', patterns: ['price'] });
    expect(ReplyBrainService.ruleMatches(exact, 'price')).toBe(true);
    expect(ReplyBrainService.ruleMatches(exact, 'what price')).toBe(false);
  });

  it('honours starts_with', () => {
    const starts = rule({ match_type: 'starts_with', patterns: ['hi'] });
    expect(ReplyBrainService.ruleMatches(starts, 'hi there')).toBe(true);
    expect(ReplyBrainService.ruleMatches(starts, 'oh hi there')).toBe(false);
  });

  it('supports regex patterns', () => {
    const re = rule({ match_type: 'regex', patterns: ['^\\s*(dam|price)\\s*\\?*$'] });
    expect(ReplyBrainService.ruleMatches(re, ' dam? ')).toBe(true);
    expect(ReplyBrainService.ruleMatches(re, 'what is the dam')).toBe(false);
  });

  it('ignores a broken regex instead of throwing, so one bad rule cannot break the rest', () => {
    const broken = rule({ match_type: 'regex', patterns: ['([unclosed', 'price'] });
    expect(() => ReplyBrainService.ruleMatches(broken, 'price?')).not.toThrow();
    expect(ReplyBrainService.ruleMatches(broken, 'price?')).toBe(true);
  });

  it('never matches empty text', () => {
    expect(ReplyBrainService.ruleMatches(rule(), '')).toBe(false);
    expect(ReplyBrainService.ruleMatches(rule(), '   ')).toBe(false);
  });

  it('ignores empty patterns', () => {
    expect(ReplyBrainService.ruleMatches(rule({ patterns: ['', '  '] }), 'anything')).toBe(false);
  });
});

describe('ReplyBrainService.renderTemplate', () => {
  const base = { channelName: 'Handsome Man', displayName: null as string | null };

  it('returns plain text unchanged', () => {
    expect(
      ReplyBrainService.renderTemplate('Please inbox us', { ...base, erp: EMPTY_ERP }),
    ).toBe('Please inbox us');
  });

  it('fills product and order placeholders from ERP data', () => {
    const out = ReplyBrainService.renderTemplate(
      '{{product_name}} is {{product_price}} and it is {{product_stock}}. Order {{order_number}} is {{order_status}}.',
      { ...base, erp: ERP_WITH_PRODUCT },
    );

    expect(out).toBe(
      'Beard Oil is 699 BDT and it is in stock. Order SO-1735000000-1234 is processing.',
    );
  });

  it('uses the sale price when one is active', () => {
    expect(
      ReplyBrainService.renderTemplate('{{product_price}}', { ...base, erp: ERP_WITH_PRODUCT }),
    ).toBe('699 BDT');
  });

  it('returns null when a placeholder cannot be resolved', () => {
    // The whole point: never send "the price is {{product_price}}" to a customer.
    expect(
      ReplyBrainService.renderTemplate('The price is {{product_price}}', {
        ...base,
        erp: EMPTY_ERP,
      }),
    ).toBeNull();
  });

  it('prefers the display name over the ERP customer name', () => {
    const out = ReplyBrainService.renderTemplate('Hi {{customer_name}}', {
      ...base,
      displayName: 'Rahim',
      erp: ERP_WITH_PRODUCT,
    });
    expect(out).toBe('Hi Rahim');
  });

  it('substitutes the page name', () => {
    expect(
      ReplyBrainService.renderTemplate('Thanks from {{page_name}}', { ...base, erp: EMPTY_ERP }),
    ).toBe('Thanks from Handsome Man');
  });

  it('tolerates whitespace and mixed case inside the braces', () => {
    expect(
      ReplyBrainService.renderTemplate('{{  PAGE_NAME  }}', { ...base, erp: EMPTY_ERP }),
    ).toBe('Handsome Man');
  });
});
