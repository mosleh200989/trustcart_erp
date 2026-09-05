import { Repository } from 'typeorm';
import { HistoryCurationService } from './history-curation.service';
import { AutomationHistoryMessage } from '../entities/automation-history-message.entity';

/**
 * The starred replies go into the system prompt to teach voice, and nothing
 * else. Masking already happened at import, so this loader is the second layer:
 * a figure that survived the masker must not be quotable just because someone
 * starred the message it sat in.
 */

function message(overrides: Partial<AutomationHistoryMessage> = {}): AutomationHistoryMessage {
  return {
    id: 1,
    thread_id: 1,
    channel_id: 1,
    external_id: 'm1',
    direction: 'outbound',
    text: 'আসসালামু আলাইকুম, আপনার কোন ধরনের ব্যাথার জন্য নিতে চাচ্ছেন?',
    masked_counts: {},
    is_example: true,
    sent_at: null,
    created_at: new Date(),
    ...overrides,
  } as AutomationHistoryMessage;
}

function makeService(rows: AutomationHistoryMessage[]) {
  const find = jest.fn(async (_options?: any) => rows);
  const repository = { find } as unknown as Repository<AutomationHistoryMessage>;
  return { service: new HistoryCurationService(repository), find };
}

describe('HistoryCurationService.styleExamples', () => {
  it('asks only for this channel’s starred outbound messages', async () => {
    const { service, find } = makeService([message()]);

    await service.styleExamples(1, 24);

    expect((find.mock.calls[0] as any[])[0].where).toEqual({
      channel_id: 1,
      is_example: true,
      direction: 'outbound',
    });
  });

  it('withholds an example that still contains a figure', async () => {
    // The NUMBER rule only masks runs of four or more, so a three-digit price
    // that never sat beside a currency word survives import looking ordinary.
    const { service } = makeService([
      message({ id: 1 }),
      message({ id: 2, text: 'ভাই 850 এর জন্য নিতে পারেন' }),
    ]);

    const examples = await service.styleExamples(1, 24);

    expect(examples.map((e) => e.id)).toEqual([1]);
  });

  it('catches a leaked figure written in Bengali digits', async () => {
    const { service } = makeService([message({ id: 9, text: 'ভাই ৮৫০ এর জন্য নিতে পারেন' })]);

    expect(await service.styleExamples(1, 24)).toEqual([]);
  });

  it('keeps a masked placeholder — that is what it is for', async () => {
    const { service } = makeService([
      message({ id: 3, text: '⚫ কাসরি ওয়েল মূল্য - [PRICE] ডেলিভারী ফ্রী।' }),
    ]);

    expect(await service.styleExamples(1, 24)).toHaveLength(1);
  });

  it('keeps a small standalone number, which masking leaves on purpose', async () => {
    // "1-2 দিন" is a delivery window, not an identifier. Dropping it would
    // remove the most useful delivery example the team has.
    const { service } = makeService([
      message({ id: 4, text: 'ঢাকার ভিতর 1-2 দিন, ঢাকার বাইরে 2-3 দিন লাগবে।' }),
    ]);

    expect(await service.styleExamples(1, 24)).toHaveLength(1);
  });

  it('orders the set the way a conversation moves, not by row id', async () => {
    // The block should read as a flow — greeting, then price, then closing —
    // because that is what teaches where each shape belongs.
    const { service } = makeService([
      message({ id: 30, text: 'ধন্যবাদ, আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবে।' }),
      message({ id: 10, text: 'কাসরি ওয়েল মূল্য - [PRICE], ডেলিভারী ফ্রী।' }),
      message({ id: 20, text: 'আসসালামু আলাইকুম, কেমন আছেন?' }),
    ]);

    const examples = await service.styleExamples(1, 24);

    expect(examples.map((e) => e.intent)).toEqual(['greeting', 'price', 'closing']);
  });

  it('caps the set, and falls back to a sane cap on a nonsense setting', async () => {
    const rows = Array.from({ length: 40 }, (_, i) => message({ id: i + 1 }));
    const { service } = makeService(rows);

    expect(await service.styleExamples(1, 3)).toHaveLength(3);
    expect(await service.styleExamples(1, 0)).toHaveLength(24);
  });

  it('skips an empty body instead of emitting a blank example', async () => {
    const { service } = makeService([message({ id: 1, text: '   ' }), message({ id: 2 })]);

    expect((await service.styleExamples(1, 24)).map((e) => e.id)).toEqual([2]);
  });
});
