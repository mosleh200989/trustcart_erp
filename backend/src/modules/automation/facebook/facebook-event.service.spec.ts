import { FacebookEventService } from './facebook-event.service';

const PAGE_ID = '100000000000001';
const CUSTOMER_ID = '200000000000002';

function commentPayload(overrides: Record<string, any> = {}) {
  return {
    object: 'page',
    entry: [
      {
        id: PAGE_ID,
        time: 1735000000,
        changes: [
          {
            field: 'feed',
            value: {
              item: 'comment',
              verb: 'add',
              comment_id: `${PAGE_ID}_555`,
              post_id: `${PAGE_ID}_444`,
              from: { id: CUSTOMER_ID, name: 'Rahim Uddin' },
              message: 'Dam koto?',
              ...overrides,
            },
          },
        ],
      },
    ],
  };
}

function messagePayload(overrides: Record<string, any> = {}) {
  return {
    object: 'page',
    entry: [
      {
        id: PAGE_ID,
        time: 1735000000,
        messaging: [
          {
            sender: { id: CUSTOMER_ID },
            recipient: { id: PAGE_ID },
            timestamp: 1735000000,
            message: { mid: 'm_abc123', text: 'Hello', ...overrides },
          },
        ],
      },
    ],
  };
}

describe('FacebookEventService.normalize', () => {
  it('normalizes a comment into a comment event keyed by post id', () => {
    const [event] = FacebookEventService.normalize(commentPayload());

    expect(event.eventType).toBe('comment');
    expect(event.threadType).toBe('comment');
    expect(event.pageId).toBe(PAGE_ID);
    expect(event.threadKey).toBe(`${PAGE_ID}_444`);
    expect(event.commentId).toBe(`${PAGE_ID}_555`);
    expect(event.text).toBe('Dam koto?');
    expect(event.senderName).toBe('Rahim Uddin');
    expect(event.isEcho).toBe(false);
  });

  it('flags the page commenting on its own post as an echo', () => {
    // This is the infinite-loop case: our own reply comes back as a webhook.
    const [event] = FacebookEventService.normalize(
      commentPayload({ from: { id: PAGE_ID, name: 'TrustCart' } }),
    );

    expect(event.isEcho).toBe(true);
    expect(event.senderId).toBe(PAGE_ID);
  });

  it('gives an edited comment a distinct event id so it is not seen as a duplicate', () => {
    const [added] = FacebookEventService.normalize(commentPayload());
    const [edited] = FacebookEventService.normalize(commentPayload({ verb: 'edited' }));

    expect(added.metaEventId).not.toBe(edited.metaEventId);
    expect(edited.eventType).toBe('comment_edit');
  });

  it('normalizes a Messenger message keyed by the sender PSID', () => {
    const [event] = FacebookEventService.normalize(messagePayload());

    expect(event.eventType).toBe('message');
    expect(event.threadType).toBe('message');
    expect(event.psid).toBe(CUSTOMER_ID);
    expect(event.threadKey).toBe(CUSTOMER_ID);
    expect(event.metaEventId).toBe('message:m_abc123');
    expect(event.isEcho).toBe(false);
  });

  it('treats an echo message as an echo and still keys the thread by the customer', () => {
    // On an echo the page is the sender, so the customer is the recipient —
    // keying by sender here would create a phantom thread against our own page.
    const [event] = FacebookEventService.normalize(messagePayload({ is_echo: true }));

    expect(event.eventType).toBe('message_echo');
    expect(event.isEcho).toBe(true);
    expect(event.psid).toBe(PAGE_ID);
  });

  it('normalizes a postback', () => {
    const [event] = FacebookEventService.normalize({
      object: 'page',
      entry: [
        {
          id: PAGE_ID,
          messaging: [
            {
              sender: { id: CUSTOMER_ID },
              recipient: { id: PAGE_ID },
              timestamp: 1735000000,
              postback: { mid: 'm_pb1', title: 'Get Started', payload: 'START' },
            },
          ],
        },
      ],
    });

    expect(event.eventType).toBe('postback');
    expect(event.text).toBe('Get Started');
    expect(event.psid).toBe(CUSTOMER_ID);
  });

  it('produces one event per item in a batched delivery', () => {
    const events = FacebookEventService.normalize({
      object: 'page',
      entry: [
        commentPayload().entry[0],
        messagePayload().entry[0],
      ],
    });

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.eventType).sort()).toEqual(['comment', 'message']);
  });

  it('returns nothing for an empty or unknown body instead of throwing', () => {
    expect(FacebookEventService.normalize({})).toEqual([]);
    expect(FacebookEventService.normalize({ entry: [] })).toEqual([]);
    expect(FacebookEventService.normalize({ entry: [{ id: PAGE_ID }] })).toEqual([]);
  });

  it("yields nothing for Meta's webhook test payload, which has no entry[] envelope", () => {
    // The App Dashboard "Test" button posts this shape rather than the real
    // envelope. It must produce zero events — and because zero events used to
    // mean nothing was stored at all, the delivery was invisible. The service
    // now records an `unparsed` row for exactly this case.
    const events = FacebookEventService.normalize({
      sample: {
        field: 'messages',
        value: {
          sender: { id: '12334' },
          recipient: { id: '23245' },
          timestamp: '1527459824',
          message: { mid: 'test_message_id', text: 'test_message' },
        },
      },
    });

    expect(events).toEqual([]);
  });

  it('ignores page-feed activity that is not a comment or reaction', () => {
    const events = FacebookEventService.normalize({
      object: 'page',
      entry: [
        {
          id: PAGE_ID,
          changes: [{ field: 'feed', value: { item: 'status', verb: 'add', post_id: 'p1' } }],
        },
      ],
    });

    expect(events).toEqual([]);
  });
});

/**
 * The per-thread cap, after a shadow watch fell silent.
 *
 * Five events on a real conversation were skipped as `rate_limited` while the
 * channel was in shadow — the cap counted held drafts, so the watch stopped
 * producing the very thing it exists to produce. The cap protects customers
 * from a misbehaving rule; a draft nobody has seen has no customer to protect.
 */
describe('FacebookEventService — the auto-reply cap', () => {
  function makeService(limitCount: number) {
    const builder: any = {
      clauses: [] as string[],
      where: jest.fn(function (this: any, c: string) {
        builder.clauses.push(c);
        return builder;
      }),
      andWhere: jest.fn((c: string) => {
        builder.clauses.push(c);
        return builder;
      }),
      getCount: jest.fn(async () => limitCount),
    };

    // Only messageRepository is touched, so the service is built without
    // standing up its other nine dependencies.
    const service: any = Object.create(FacebookEventService.prototype);
    service.messageRepository = { createQueryBuilder: () => builder };
    service.logger = { warn: jest.fn(), debug: jest.fn() };

    return { service, builder };
  }

  const channel = (limit: number) => ({ max_replies_per_thread_hour: limit }) as any;
  const conversation = { id: 1 } as any;

  it('excludes held shadow drafts from the count', async () => {
    const { service, builder } = makeService(0);

    await service.isRateLimited(channel(3), conversation);

    expect(builder.clauses).toContain('m.shadow = false');
  });

  it('still caps replies that actually went out', async () => {
    const { service } = makeService(3);
    expect(await service.isRateLimited(channel(3), conversation)).toBe(true);
  });

  it('allows a reply below the cap', async () => {
    const { service } = makeService(2);
    expect(await service.isRateLimited(channel(3), conversation)).toBe(false);
  });

  it('treats a cap of zero as no cap, without querying', async () => {
    const { service, builder } = makeService(99);
    expect(await service.isRateLimited(channel(0), conversation)).toBe(false);
    expect(builder.getCount).not.toHaveBeenCalled();
  });
});
