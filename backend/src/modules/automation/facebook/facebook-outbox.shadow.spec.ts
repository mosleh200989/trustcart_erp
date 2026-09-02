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
function makeService(channelMode: 'off' | 'shadow' | 'live') {
  const outboxRepository = {
    save: jest.fn(async (row) => row),
    findOne: jest.fn(),
    update: jest.fn(),
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
