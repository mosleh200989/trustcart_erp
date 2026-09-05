import { AutomationHealthService, HealthProbe } from './automation-health.service';

/**
 * Every case here is one the Kasri page actually went through.
 *
 * It stopped receiving webhooks on 3 September and nobody noticed for two days,
 * because nothing looked wrong: the endpoint answered, the secret was
 * configured, and an empty events table is what a quiet day looks like too.
 * These tests pin the two independent signals that would have caught it, and
 * the wording each produces — the sentence is the product.
 */

const NOW = new Date('2026-09-05T12:00:00Z');

function channel(overrides: Record<string, any> = {}) {
  return {
    mode: 'shadow',
    is_active: true,
    last_event_at: new Date('2026-09-05T11:00:00Z'),
    ...overrides,
  } as any;
}

function probe(overrides: Partial<HealthProbe> = {}): HealthProbe {
  return {
    tokenError: null,
    tokenOk: true,
    subscribedFields: ['messages', 'messaging_postbacks'],
    subscriptionError: null,
    ...overrides,
  };
}

const classify = (ch: any, pr: HealthProbe, silenceHours = 24) =>
  AutomationHealthService.classify(ch, pr, { silenceHours, now: NOW });

describe('AutomationHealthService.classify', () => {
  it('reports a healthy channel', () => {
    const { status, detail } = classify(channel(), probe());
    expect(status).toBe('ok');
    expect(detail).toContain('Connected');
  });

  it('reports a blocked app as an error, quoting Facebook', () => {
    // The real one: "API access blocked." on app 1045665091632294.
    const { status, detail } = classify(
      channel(),
      probe({ tokenOk: false, tokenError: '#200 API access blocked.' }),
    );
    expect(status).toBe('error');
    expect(detail).toContain('API access blocked');
  });

  it('treats a page subscribed to nothing as an error, not a quiet day', () => {
    // The failure that looks like nothing being wrong: app-level fields can be
    // perfect while the page is subscribed to no app at all.
    const { status, detail } = classify(channel(), probe({ subscribedFields: [] }));
    expect(status).toBe('error');
    expect(detail).toContain('not subscribed');
  });

  it('catches a page subscribed to the wrong fields', () => {
    const { status, detail } = classify(channel(), probe({ subscribedFields: ['feed'] }));
    expect(status).toBe('error');
    expect(detail).toContain('messages');
  });

  it('warns when a page has gone silent for longer than the threshold', () => {
    const quiet = channel({ last_event_at: new Date('2026-09-03T11:57:00Z') });
    const { status, detail } = classify(quiet, probe());
    expect(status).toBe('warning');
    expect(detail).toContain('48 hours');
    // It must not claim to know which: a quiet page and a broken one look alike.
    expect(detail).toContain('test message');
  });

  it('does not warn about silence inside the threshold', () => {
    expect(classify(channel(), probe()).status).toBe('ok');
  });

  it('honours a shorter silence threshold', () => {
    const quiet = channel({ last_event_at: new Date('2026-09-05T09:00:00Z') });
    expect(classify(quiet, probe(), 24).status).toBe('ok');
    expect(classify(quiet, probe(), 2).status).toBe('warning');
  });

  it('never warns about silence on a page that has never received anything', () => {
    // A channel connected an hour ago has no history to be silent against.
    const fresh = channel({ last_event_at: null });
    expect(classify(fresh, probe()).status).toBe('ok');
  });

  it('says nothing about a channel that is switched off', () => {
    expect(classify(channel({ mode: 'off' }), probe({ tokenError: 'anything' })).status).toBe(
      'unknown',
    );
    expect(classify(channel({ is_active: false }), probe()).status).toBe('unknown');
  });

  it('treats an unreadable subscription as healthy, with a note', () => {
    // Reading subscriptions needs pages_manage_metadata, which a token can lack
    // while still receiving and sending perfectly well. Not worth an alarm.
    const { status, detail } = classify(
      channel(),
      probe({ subscribedFields: null, subscriptionError: '#200 permission' }),
    );
    expect(status).toBe('ok');
    expect(detail).toContain('pages_manage_metadata');
  });

  it('ranks a dead token above silence when both are true', () => {
    // Fixing the token is the action; the silence is a symptom of it.
    const quiet = channel({ last_event_at: new Date('2026-09-01T00:00:00Z') });
    const { status, detail } = classify(quiet, probe({ tokenOk: false, tokenError: '#190 expired' }));
    expect(status).toBe('error');
    expect(detail).toContain('expired');
  });

  it('reports a channel with no token saved', () => {
    const { status, detail } = classify(
      channel(),
      probe({ tokenOk: false, tokenError: 'no page access token is saved' }),
    );
    expect(status).toBe('error');
    expect(detail).toContain('no page access token');
  });
});
