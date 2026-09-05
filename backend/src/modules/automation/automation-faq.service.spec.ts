import { Repository } from 'typeorm';
import { AutomationFaqService, tokenize } from './automation-faq.service';
import { AutomationFaq } from './entities/automation-faq.entity';

/**
 * The FAQ layer sends a stated answer straight to a customer without a model in
 * the loop, so the scoring threshold is the only thing standing between a
 * plausible-looking keyword overlap and the wrong answer being delivered
 * verbatim. These tests pin where that line sits.
 */

const DEFAULT_MIN = 0.75;

function faq(overrides: Partial<AutomationFaq> = {}): AutomationFaq {
  return {
    id: 1,
    channel_id: null,
    category: 'delivery',
    question: 'How long does delivery take?',
    answer: 'Inside Dhaka 1-2 days, outside Dhaka 2-3 days.',
    keywords: ['koto din', 'kobe pabo', 'ডেলিভারি'],
    priority: 100,
    is_active: true,
    hit_count: 0,
    last_hit_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as AutomationFaq;
}

describe('tokenize', () => {
  it('splits Bengali words instead of erasing them', () => {
    // \w is ASCII-only in JavaScript. Splitting on it would leave nothing here,
    // which is the same trap that let "_850_ taka" past the masker.
    expect(tokenize('ডেলিভারি কত দিন লাগবে?')).toEqual(['ডেলিভারি', 'কত', 'দিন', 'লাগবে']);
  });

  it('drops punctuation and case', () => {
    expect(tokenize('Koto DIN, bhai?')).toEqual(['koto', 'din', 'bhai']);
  });
});

describe('AutomationFaqService.score', () => {
  it('gives a multi-word keyword full marks on its own', () => {
    // A phrase is a deliberate signal — someone typed it into the panel meaning
    // exactly this question.
    const { score } = AutomationFaqService.score(faq(), 'delivery koto din lagbe?');
    expect(score).toBe(1);
  });

  it('leaves a single shared word below the threshold', () => {
    // "delivery" fits "delivery koto din" and "delivery charge koto" alike.
    // Answering the wrong one verbatim is worse than asking a human.
    const one = faq({ question: 'Delivery info', keywords: ['delivery'] });
    expect(AutomationFaqService.score(one, 'delivery charge koto?').score).toBeLessThan(DEFAULT_MIN);
  });

  it('lets a second weak signal carry a single keyword over the line', () => {
    const one = faq({ question: 'What is the delivery charge?', keywords: ['charge'] });
    const { score } = AutomationFaqService.score(one, 'delivery charge koto?');
    expect(score).toBeGreaterThanOrEqual(DEFAULT_MIN);
  });

  it('matches a Bengali keyword', () => {
    const { score, matched } = AutomationFaqService.score(faq(), 'ডেলিভারি সম্পর্কে জানতে চাই');
    expect(matched).toContain('ডেলিভারি');
    expect(score).toBeGreaterThan(0);
  });

  it('does not match a keyword inside a longer word', () => {
    // "ta" must not fire on "taka" — single-word keywords compare tokens, not
    // substrings.
    const one = faq({ question: 'Quantity', keywords: ['ta'] });
    expect(AutomationFaqService.score(one, 'dam koto taka?').score).toBe(0);
  });

  it('does not match a phrase that runs across a word boundary', () => {
    const one = faq({ question: 'Delivery time', keywords: ['koto din'] });
    expect(AutomationFaqService.score(one, 'kotodin lagbe').score).toBe(0);
  });

  it('scores an empty message at zero rather than throwing', () => {
    expect(AutomationFaqService.score(faq(), '').score).toBe(0);
    expect(AutomationFaqService.score(faq(), null as any).score).toBe(0);
  });

  it('survives a row whose keywords are not an array', () => {
    const broken = faq({ keywords: null as any });
    expect(() => AutomationFaqService.score(broken, 'delivery koto din')).not.toThrow();
  });
});

describe('AutomationFaqService.bestMatch', () => {
  it('returns nothing when the best score is below the threshold', () => {
    const rows = [faq({ question: 'Delivery info', keywords: ['delivery'] })];
    expect(AutomationFaqService.bestMatch(rows, 'delivery charge koto?', DEFAULT_MIN)).toBeNull();
  });

  it('never returns an inactive answer, however well it scores', () => {
    const rows = [faq({ is_active: false })];
    expect(AutomationFaqService.bestMatch(rows, 'koto din lagbe?', DEFAULT_MIN)).toBeNull();
  });

  it('breaks a tie on priority rather than row order', () => {
    const rows = [
      faq({ id: 1, priority: 100, keywords: ['koto din'] }),
      faq({ id: 2, priority: 10, keywords: ['koto din'] }),
    ];
    expect(AutomationFaqService.bestMatch(rows, 'koto din lagbe?', DEFAULT_MIN)!.faq.id).toBe(2);
  });

  it('prefers the stronger match over the higher-priority one', () => {
    const rows = [
      faq({ id: 1, priority: 1, question: 'Delivery charge', keywords: ['charge'] }),
      faq({ id: 2, priority: 900, keywords: ['koto din'] }),
    ];
    expect(AutomationFaqService.bestMatch(rows, 'koto din lagbe?', DEFAULT_MIN)!.faq.id).toBe(2);
  });

  it('names what matched so the panel can explain the reply', () => {
    const match = AutomationFaqService.bestMatch([faq()], 'delivery koto din?', DEFAULT_MIN);
    expect(match!.matched).toContain('koto din');
  });
});

describe('AutomationFaqService.toFacts', () => {
  it('caps how many answers reach the prompt', () => {
    const rows = Array.from({ length: 30 }, (_, i) => faq({ id: i + 1 }));
    expect(AutomationFaqService.toFacts(rows, 5)).toHaveLength(5);
  });

  it('falls back to a sane cap when the setting is nonsense', () => {
    const rows = Array.from({ length: 30 }, (_, i) => faq({ id: i + 1 }));
    expect(AutomationFaqService.toFacts(rows, 0)).toHaveLength(20);
    expect(AutomationFaqService.toFacts(rows, NaN)).toHaveLength(20);
  });

  it('carries the question and answer and nothing else', () => {
    const [fact] = AutomationFaqService.toFacts([faq()], 5);
    expect(Object.keys(fact).sort()).toEqual(['answer', 'id', 'question']);
  });
});

describe('AutomationFaqService.create', () => {
  function makeService() {
    const repository = {
      create: jest.fn((data: any) => data),
      save: jest.fn(async (data: any) => ({ id: 1, ...data })),
    } as unknown as Repository<AutomationFaq>;
    return { service: new AutomationFaqService(repository), repository };
  }

  it('refuses an answer containing a template placeholder', async () => {
    // FAQ answers are sent word for word, so a placeholder would arrive at the
    // customer as literal braces. A rule is the right tool for live data.
    const { service } = makeService();
    await expect(
      service.create({ question: 'Price?', answer: 'It is {{product_price}}' } as any),
    ).rejects.toThrow(/placeholder/i);
  });

  it('requires both a question and an answer', async () => {
    const { service } = makeService();
    await expect(service.create({ question: '', answer: 'x' } as any)).rejects.toThrow(/question/i);
    await expect(service.create({ question: 'x', answer: '  ' } as any)).rejects.toThrow(/answer/i);
  });

  it('defaults an omitted channel to every channel', async () => {
    const { service, repository } = makeService();
    await service.create({ question: 'Delivery?', answer: '1-2 days' } as any);
    expect((repository.create as jest.Mock).mock.calls[0][0].channel_id).toBeNull();
  });
});
