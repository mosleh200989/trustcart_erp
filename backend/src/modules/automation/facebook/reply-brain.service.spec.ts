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
  productsAreFeatured: false,
  orders: [],
  customerId: null,
  customerName: null,
};

const ERP_WITH_PRODUCT: ErpContext = {
  productsAreFeatured: false,
  products: [
    { id: 7, name: 'Beard Oil', price: 850, salePrice: 699 },
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
      '{{product_name}} is {{product_price}}. Order {{order_number}} is {{order_status}}.',
      { ...base, erp: ERP_WITH_PRODUCT },
    );

    expect(out).toBe('Beard Oil is 699 BDT. Order SO-1735000000-1234 is processing.');
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

  it('cannot express stock — the placeholder does not resolve', () => {
    // Stock is company-internal. A rule author typing {{product_stock}} must not
    // silently get an availability claim into a customer message; the template
    // language simply has no such value, so the whole reply is refused.
    expect(
      ReplyBrainService.renderTemplate('Eta {{product_stock}} ache', {
        ...base,
        erp: ERP_WITH_PRODUCT,
      }),
    ).toBeNull();
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

/**
 * The FAQ layer, in place.
 *
 * Two things matter here and nowhere else: a confident match must answer
 * without a model in the loop — that is the only reason this layer does
 * anything while the AI is off — and a weak match must not send a stated
 * answer to the wrong question.
 */
describe('ReplyBrainService.decide — FAQ layer', () => {
  const CHANNEL = { id: 1, name: 'Kasri Oil', storefront_id: null, persona: null } as any;

  const FAQ = {
    id: 5,
    channel_id: null,
    category: 'delivery',
    question: 'How long does delivery take?',
    answer: 'ঢাকার ভিতর ১-২ দিন, ঢাকার বাইরে ২-৩ দিন।',
    keywords: ['koto din', 'কত দিন'],
    priority: 100,
    is_active: true,
    hit_count: 0,
    last_hit_at: null,
  } as any;

  function makeBrain(
    options: {
      faqs?: any[];
      aiEnabled?: boolean;
      global?: Record<string, any>;
      ai?: Record<string, any>;
      examples?: any[];
    } = {},
  ) {
    const generateReply = jest.fn();

    const rulesRepository = { find: jest.fn(async () => []) } as any;
    const settings = {
      getEscalation: jest.fn(async () => ({
        keywords: [],
        escalate_on_order_number: false,
        escalate_on_phone_number: false,
        create_support_ticket: false,
      })),
      getGlobal: jest.fn(async () => ({
        fallback_action: 'escalate',
        faq_direct_reply: true,
        faq_min_score: 0.75,
        faq_max_in_prompt: 20,
        ...(options.global ?? {}),
      })),
      getAi: jest.fn(async () => ({
        enabled: options.aiEnabled ?? false,
        history_turns: 8,
        style_examples_enabled: true,
        max_style_examples: 24,
        ...(options.ai ?? {}),
      })),
      getOrder: jest.fn(async () => ({ enabled: false })),
    } as any;
    const erpService = { buildContext: jest.fn(async () => EMPTY_ERP) } as any;
    const aiService = { generateReply } as any;
    const faqService = {
      activeForChannel: jest.fn(async () => options.faqs ?? []),
      recordHit: jest.fn(async () => undefined),
    } as any;

    const curation = {
      styleExamples: jest.fn(async () => options.examples ?? []),
    } as any;

    return {
      brain: new ReplyBrainService(
        rulesRepository,
        settings,
        erpService,
        aiService,
        faqService,
        curation,
        { openDraft: jest.fn(async () => null) } as any,
      ),
      generateReply,
      curation,
    };
  }

  const ask = (brain: ReplyBrainService, text: string) =>
    brain.decide({ channel: CHANNEL, threadType: 'message', text, history: [] });

  it('answers a confident match verbatim, without calling the AI', async () => {
    const { brain, generateReply } = makeBrain({ faqs: [FAQ], aiEnabled: true });

    const decision = await ask(brain, 'delivery koto din lagbe?');

    expect(decision.action).toBe('reply');
    expect(decision.text).toBe(FAQ.answer);
    expect(decision.source).toBe('faq');
    expect(decision.faqId).toBe(5);
    expect(generateReply).not.toHaveBeenCalled();
  });

  it('works with the AI switched off — the whole point of the layer', async () => {
    const { brain } = makeBrain({ faqs: [FAQ], aiEnabled: false });

    const decision = await ask(brain, 'কত দিন লাগবে?');

    expect(decision.action).toBe('reply');
    expect(decision.source).toBe('faq');
  });

  it('escalates rather than sending a weak match', async () => {
    const weak = { ...FAQ, question: 'Delivery info', keywords: ['delivery'] };
    const { brain } = makeBrain({ faqs: [weak], aiEnabled: false });

    const decision = await ask(brain, 'delivery charge koto?');

    expect(decision.action).toBe('escalate');
    expect(decision.text).toBeNull();
  });

  it('hands every active answer to the model when nothing matched confidently', async () => {
    // A question the scorer missed is exactly what the model is for, and it can
    // only answer it grounded.
    const { brain, generateReply } = makeBrain({ faqs: [FAQ], aiEnabled: true });
    generateReply.mockResolvedValue({
      text: 'Two days.',
      confidence: 0.9,
      escalate: false,
      reason: null,
      model: 'test',
      usage: null,
    });

    await ask(brain, 'when will it arrive at my house?');

    expect(generateReply).toHaveBeenCalledTimes(1);
    expect(generateReply.mock.calls[0][0].faqs).toEqual([
      { id: 5, question: FAQ.question, answer: FAQ.answer },
    ]);
  });

  it('keeps FAQs as prompt facts only when direct reply is switched off', async () => {
    const { brain, generateReply } = makeBrain({
      faqs: [FAQ],
      aiEnabled: true,
      global: { faq_direct_reply: false },
    });
    generateReply.mockResolvedValue({
      text: 'Two days.',
      confidence: 0.9,
      escalate: false,
      reason: null,
      model: 'test',
      usage: null,
    });

    const decision = await ask(brain, 'delivery koto din lagbe?');

    expect(decision.source).toBe('ai');
    expect(generateReply.mock.calls[0][0].faqs).toHaveLength(1);
  });
});

describe('ReplyBrainService.decide — style examples', () => {
  // Re-uses the FAQ block's harness shape; only the example wiring is new.
  const CHANNEL = { id: 1, name: 'Kasri Oil', storefront_id: null, persona: null } as any;

  const EXAMPLE = { id: 87, text: 'আসসালামু আলাইকুম', intent: 'greeting' };

  function makeBrain(options: { ai?: Record<string, any>; examples?: any[] } = {}) {
    const generateReply = jest.fn().mockResolvedValue({
      text: 'ok',
      confidence: 0.9,
      escalate: false,
      reason: null,
      model: 'test',
      usage: null,
    });

    const settings = {
      getEscalation: jest.fn(async () => ({
        keywords: [],
        escalate_on_order_number: false,
        escalate_on_phone_number: false,
        create_support_ticket: false,
      })),
      getGlobal: jest.fn(async () => ({
        fallback_action: 'escalate',
        faq_direct_reply: true,
        faq_min_score: 0.75,
        faq_max_in_prompt: 20,
      })),
      getAi: jest.fn(async () => ({
        enabled: true,
        history_turns: 8,
        style_examples_enabled: true,
        max_style_examples: 24,
        ...(options.ai ?? {}),
      })),
      getOrder: jest.fn(async () => ({ enabled: false })),
    } as any;

    const curation = { styleExamples: jest.fn(async () => options.examples ?? []) } as any;

    const brain = new ReplyBrainService(
      { find: jest.fn(async () => []) } as any,
      settings,
      { buildContext: jest.fn(async () => EMPTY_ERP) } as any,
      { generateReply } as any,
      { activeForChannel: jest.fn(async () => []), recordHit: jest.fn() } as any,
      curation,
      { openDraft: jest.fn(async () => null) } as any,
    );

    return { brain, generateReply, curation };
  }

  const ask = (brain: ReplyBrainService) =>
    brain.decide({ channel: CHANNEL, threadType: 'message', text: 'apnader ki ache?', history: [] });

  it('hands the starred replies to the model', async () => {
    const { brain, generateReply } = makeBrain({ examples: [EXAMPLE] });

    await ask(brain);

    expect(generateReply.mock.calls[0][0].styleExamples).toEqual([EXAMPLE]);
  });

  it('asks for examples scoped to this channel, at the configured cap', async () => {
    // Another page's history is another team's voice.
    const { brain, curation } = makeBrain({ examples: [EXAMPLE], ai: { max_style_examples: 5 } });

    await ask(brain);

    expect(curation.styleExamples).toHaveBeenCalledWith(1, 5);
  });

  it('sends none when the setting is off, without querying for them', async () => {
    const { brain, generateReply, curation } = makeBrain({
      examples: [EXAMPLE],
      ai: { style_examples_enabled: false },
    });

    await ask(brain);

    expect(generateReply.mock.calls[0][0].styleExamples).toEqual([]);
    expect(curation.styleExamples).not.toHaveBeenCalled();
  });
});

/**
 * The order flow, at the decision level.
 *
 * The one that matters most is shadow mode: everywhere else in this module
 * "shadow" means a message is not sent, and the worst case is a customer not
 * hearing back. Here it would mean a real row in sales_orders — a delivery,
 * a courier booking, a phone call — created during a week that was supposed to
 * be read-only. So the refusal is enforced in the decision, not left to the
 * caller.
 */
describe('ReplyBrainService.decide — order flow', () => {
  const READY_DRAFT = {
    id: 3,
    conversation_id: 10,
    channel_id: 1,
    status: 'confirming',
    product_id: 311,
    product_name: 'Kasri Oil',
    unit_price: 990,
    quantity: 1,
    customer_name: 'Karim',
    phone: '01712345678',
    address: 'dhaka, rampura',
    district: 'Dhaka',
    delivery_charge: 60,
    sales_order_id: null,
  } as any;

  const ORDER_SETTINGS = {
    enabled: true,
    delivery_charge_inside_dhaka: 60,
    delivery_charge_outside_dhaka: 110,
    confirm_words: ['confirm', 'কনফার্ম'],
    cancel_words: ['cancel', 'lagbe na'],
  };

  function makeBrain(options: { mode?: string; draft?: any; escalatePhone?: boolean } = {}) {
    const place = jest.fn(async () => ({ id: 555, orderNumber: 'SO-1', total: 1050 }));
    const cancel = jest.fn(async () => undefined);

    const settings = {
      getEscalation: jest.fn(async () => ({
        keywords: [],
        escalate_on_order_number: false,
        escalate_on_phone_number: options.escalatePhone ?? true,
        create_support_ticket: false,
      })),
      getGlobal: jest.fn(async () => ({ fallback_action: 'escalate', faq_direct_reply: true })),
      getAi: jest.fn(async () => ({ enabled: false })),
      getOrder: jest.fn(async () => ORDER_SETTINGS),
    } as any;

    const orderService = {
      openDraft: jest.fn(async () => options.draft ?? null),
      startDraft: jest.fn(async () => READY_DRAFT),
      apply: jest.fn(async (d: any, patch: any) => ({ ...d, ...patch })),
      cancel,
      place,
    } as any;

    const brain = new ReplyBrainService(
      { find: jest.fn(async () => []) } as any,
      settings,
      { buildContext: jest.fn(async () => EMPTY_ERP) } as any,
      { generateReply: jest.fn(), extractOrder: jest.fn(async () => null) } as any,
      { activeForChannel: jest.fn(async () => []), recordHit: jest.fn() } as any,
      { styleExamples: jest.fn(async () => []) } as any,
      orderService,
    );

    const channel = { id: 1, name: 'Kasri Oil', mode: options.mode ?? 'live' } as any;
    const ask = (text: string) =>
      brain.decide({ channel, threadType: 'message', text, history: [], conversationId: 10 });

    return { ask, place, cancel, orderService };
  }

  it('creates the order when the channel is live and the customer confirms', async () => {
    const { ask, place } = makeBrain({ draft: READY_DRAFT, mode: 'live' });

    const decision = await ask('confirm');

    expect(place).toHaveBeenCalledTimes(1);
    expect(decision.source).toBe('order');
    expect(decision.text).toContain('SO-1');
  });

  it('refuses to create anything in shadow mode, however clear the confirmation', async () => {
    const { ask, place } = makeBrain({ draft: READY_DRAFT, mode: 'shadow' });

    const decision = await ask('confirm');

    expect(place).not.toHaveBeenCalled();
    expect(decision.action).toBe('reply');
    expect(decision.reason).toContain('Order NOT placed');
  });

  it('refuses in off mode too', async () => {
    const { ask, place } = makeBrain({ draft: READY_DRAFT, mode: 'off' });
    await ask('কনফার্ম');
    expect(place).not.toHaveBeenCalled();
  });

  it('does not escalate on the phone number the customer was asked for', async () => {
    // escalate_on_phone_number is on, and without the carve-out the flow could
    // never get past its own question.
    const collecting = { ...READY_DRAFT, status: 'collecting', phone: null };
    const { ask, place } = makeBrain({ draft: collecting, escalatePhone: true });

    const decision = await ask('01712345678');

    expect(decision.reason).not.toContain('phone number');
    expect(place).not.toHaveBeenCalled();
  });

  it('still escalates on a phone number when no order is open', async () => {
    const { ask } = makeBrain({ draft: null, escalatePhone: true });

    const decision = await ask('amar number 01712345678');

    expect(decision.action).toBe('escalate');
    expect(decision.reason).toContain('phone number');
  });

  it('cancels the draft when the customer backs out', async () => {
    const { ask, cancel, place } = makeBrain({ draft: READY_DRAFT });

    const decision = await ask('na lagbe na');

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(place).not.toHaveBeenCalled();
    expect(decision.text).toContain('বাতিল');
  });

  it('leaves ordinary questions alone when no order is open', async () => {
    const { ask, orderService } = makeBrain({ draft: null });

    await ask('delivery koto din lagbe?');

    expect(orderService.startDraft).not.toHaveBeenCalled();
  });

  it('hands over rather than guessing when the AI is off mid-order', async () => {
    // Nothing else can read a name or an address out of free text.
    const collecting = { ...READY_DRAFT, status: 'collecting', address: null };
    const { ask, place } = makeBrain({ draft: collecting });

    const decision = await ask('amar bari rampura');

    expect(decision.action).toBe('escalate');
    expect(place).not.toHaveBeenCalled();
  });
});
