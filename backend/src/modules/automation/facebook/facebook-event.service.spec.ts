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
