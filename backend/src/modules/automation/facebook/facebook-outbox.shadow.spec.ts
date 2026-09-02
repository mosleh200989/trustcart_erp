import { Repository } from 'typeorm';
import { FacebookOutboxService } from './facebook-outbox.service';
import { FacebookApiService } from './facebook-api.service';
import { AutomationSettingsService } from '../automation-settings.service';
import { AutomationOutbox } from '../entities/automation-outbox.entity';
import { AutomationChannel } from '../entities/automation-channel.entity';
import { AutomationMessage } from '../entities/automation-message.entity';
import { AutomationEvent } from '../entities/automation-event.entity';

/**
 * Shadow mode has exactly one promise: nothing reaches a customer.
 *
 * It was broken in production. A typing indicator was queued before the reply
 * decision and never checked the channel mode, so four "Kasri is typing…"
 * bubbles were delivered to a real person during a shadow run. Callers were
 * meant not to enqueue anything for a non-live channel; one forgot.
 *
 * These tests pin the guarantee where it cannot be forgotten — in the sender.
 */
function makeService(channelMode: 'off' | 'shadow' | 'live', claimAffected = 1) {
  // attempt() claims the row with a conditional UPDATE before doing anything,
  // so the mock has to model that: affected = 0 means someone else got there
  // first and nothing should be sent.
  const execute = jest.fn(async () => ({ affected: claimAffected }));
  const queryBuilder: any = { execute };
  queryBuilder.update = jest.fn(() => queryBuilder);
  queryBuilder.set = jest.fn(() => queryBuilder);
  queryBuilder.where = jest.fn(() => queryBuilder);

  const outboxRepository = {
    save: jest.fn(async (row) => row),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => queryBuilder),
  } as unknown as Repository<AutomationOutbox>;

  const channelRepository = {
    findOne: jest.fn(async () => ({
      id: 1,
      name: 'Kasri Oil',
      mode: channelMode,
      page_access_token: 'token',
    })),
  } as unknown as Repository<AutomationChannel>;

  const facebookApi = {
    sendMessage: jest.fn(async () => 'mid_1'),
    senderAction: jest.fn(async () => undefined),
    replyToComment: jest.fn(async () => 'c_1'),
  } as unknown as FacebookApiService;

  const settings = {
    getGlobal: jest.fn(async () => ({ kill_switch: false })),
  } as unknown as AutomationSettingsService;

  const service = new FacebookOutboxService(
    outboxRepository,
    channelRepository,
    { update: jest.fn() } as unknown as Repository<AutomationMessage>,
    {} as Repository<AutomationEvent>,
    facebookApi,
    settings,
  );

  return { service, facebookApi, outboxRepository };
}

function row(action: string, payload: Record<string, any>): AutomationOutbox {
  return {
    id: 1,
    channel_id: 1,
    conversation_id: 1,
    message_id: null,
    action,
    payload,
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
    next_attempt_at: new Date(),
    last_error: null,
    external_id: null,
    created_at: new Date(),
    sent_at: null,
  } as AutomationOutbox;
}

describe('FacebookOutboxService shadow-mode guarantee', () => {
  it('sends nothing at all when the channel is in shadow mode', async () => {
    const { service, facebookApi } = makeService('shadow');

    await service.attempt(row('send_message', { psid: '123', message: 'hi' }));

    expect(facebookApi.sendMessage).not.toHaveBeenCalled();
  });

  it('does not even send a typing indicator in shadow mode', async () => {
    // The exact failure that reached a customer: a sender_action, which is not
    // a message but is still visible to them.
    const { service, facebookApi } = makeService('shadow');

    await service.attempt(row('sender_action', { psid: '123', sender_action: 'typing_on' }));

    expect(facebookApi.senderAction).not.toHaveBeenCalled();
  });

  it('sends nothing when the channel is off', async () => {
    const { service, facebookApi } = makeService('off');

    await service.attempt(row('send_message', { psid: '123', message: 'hi' }));

    expect(facebookApi.sendMessage).not.toHaveBeenCalled();
  });

  it('cancels the row rather than retrying it forever', async () => {
    const { service, outboxRepository } = makeService('shadow');
    const pending = row('send_message', { psid: '123', message: 'hi' });

    await service.attempt(pending);

    expect(pending.status).toBe('cancelled');
    expect(pending.last_error).toContain('shadow');
    expect(outboxRepository.save).toHaveBeenCalled();
  });

  it('sends nothing if another worker already claimed the row', async () => {
    // A held reply is watched by both an in-process timer and the cron sweep,
    // and at the due moment they can fire together. Without the claim the
    // customer receives the same message twice.
    const { service, facebookApi } = makeService('live', 0);

    await service.attempt(row('send_message', { psid: '123', message: 'hi' }));

    expect(facebookApi.sendMessage).not.toHaveBeenCalled();
  });

  it('does send when the channel is live', async () => {
    const { service, facebookApi } = makeService('live');

    await service.attempt(row('send_message', { psid: '123', message: 'hi' }));

    expect(facebookApi.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'live' }),
      '123',
      'hi',
    );
  });
});

/**
 * Human-paced replying. An instant answer is the clearest tell that a machine is
 * talking, so a reply is generated at once but held before sending.
 */
describe('FacebookOutboxService.computeDelayMs', () => {
  const on = {
    reply_delay_enabled: true,
    reply_delay_ms_per_char: 80,
    reply_delay_min_ms: 3000,
    reply_delay_max_ms: 25000,
  };

  it('scales with the length of the reply', () => {
    const short = FacebookOutboxService.computeDelayMs('a'.repeat(100), on);
    const long = FacebookOutboxService.computeDelayMs('a'.repeat(200), on);

    expect(short).toBe(8000);
    expect(long).toBe(16000);
  });

  it('never replies faster than the floor, however short the message', () => {
    // "Ji." at 80ms/char would be 240ms — instant enough to read as a bot.
    expect(FacebookOutboxService.computeDelayMs('Ji.', on)).toBe(3000);
  });

  it('never makes anyone wait longer than the ceiling', () => {
    expect(FacebookOutboxService.computeDelayMs('a'.repeat(5000), on)).toBe(25000);
  });

  it('sends immediately when pacing is switched off', () => {
    expect(
      FacebookOutboxService.computeDelayMs('a'.repeat(200), { ...on, reply_delay_enabled: false }),
    ).toBe(0);
  });

  it('treats missing or malformed settings as no delay rather than throwing', () => {
    expect(FacebookOutboxService.computeDelayMs('hello', {})).toBe(0);
    expect(
      FacebookOutboxService.computeDelayMs('hello', { reply_delay_enabled: true }),
    ).toBe(0);
  });

  it('handles an absent ceiling by only applying the floor', () => {
    const noMax = { ...on, reply_delay_max_ms: 0 };
    expect(FacebookOutboxService.computeDelayMs('a'.repeat(1000), noMax)).toBe(80000);
  });
});
