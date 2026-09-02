import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { AutomationChannel } from '../entities/automation-channel.entity';
import {
  AutomationOutbox,
  AutomationOutboxAction,
} from '../entities/automation-outbox.entity';
import { AutomationMessage } from '../entities/automation-message.entity';
import { AutomationEvent } from '../entities/automation-event.entity';
import { FacebookApiService, GraphApiError } from './facebook-api.service';
import { AutomationSettingsService } from '../automation-settings.service';

/** Backoff schedule in minutes, indexed by attempt number. */
const BACKOFF_MINUTES = [1, 5, 15, 60, 180];

/**
 * Delivers every outgoing Graph API action, with retries.
 *
 * The flow is send-now, retry-later: `enqueue` writes the row and immediately
 * tries it, so a healthy reply lands in under a second; only failures wait for
 * the sweep. This is the same shape as MetaCapiService's retry sweep rather than
 * a Bull queue, because the codebase has no queue workers running anywhere yet
 * and one more moving part is not worth it at this volume.
 */
@Injectable()
export class FacebookOutboxService {
  private readonly logger = new Logger(FacebookOutboxService.name);
  private sweepRunning = false;

  constructor(
    @InjectRepository(AutomationOutbox)
    private readonly outboxRepository: Repository<AutomationOutbox>,
    @InjectRepository(AutomationChannel)
    private readonly channelRepository: Repository<AutomationChannel>,
    @InjectRepository(AutomationMessage)
    private readonly messageRepository: Repository<AutomationMessage>,
    @InjectRepository(AutomationEvent)
    private readonly eventRepository: Repository<AutomationEvent>,
    private readonly facebookApi: FacebookApiService,
    private readonly settings: AutomationSettingsService,
  ) {}

  /**
   * Queues an action and attempts it right away.
   * Returns the row; callers do not need to await the send itself.
   */
  async enqueue(input: {
    channelId: number;
    action: AutomationOutboxAction;
    payload: Record<string, any>;
    conversationId?: number | null;
    messageId?: number | null;
    sendNow?: boolean;
  }): Promise<AutomationOutbox> {
    const row = await this.outboxRepository.save(
      this.outboxRepository.create({
        channel_id: input.channelId,
        conversation_id: input.conversationId ?? null,
        message_id: input.messageId ?? null,
        action: input.action,
        payload: input.payload,
        status: 'pending',
        attempts: 0,
        max_attempts: BACKOFF_MINUTES.length,
        next_attempt_at: new Date(),
      }),
    );

    if (input.sendNow !== false) {
      // Fire and forget: the caller has already answered Meta with 200.
      void this.attempt(row).catch((error) =>
        this.logger.error(`Outbox ${row.id} attempt failed: ${error?.message}`),
      );
    }

    return row;
  }

  /** Performs one delivery attempt and records the outcome. */
  async attempt(row: AutomationOutbox): Promise<void> {
    // The kill switch stops delivery without touching any other configuration.
    const global = await this.settings.getGlobal();
    if (global.kill_switch) {
      this.logger.warn(`Outbox ${row.id} held: kill switch is engaged`);
      return;
    }

    const channel = await this.channelRepository.findOne({ where: { id: row.channel_id } });
    if (!channel) {
      await this.fail(row, 'Channel no longer exists', false);
      return;
    }

    // Last line of defence for shadow and off mode. Callers are supposed not to
    // enqueue anything for a channel that is not live, but "supposed not to" is
    // how a typing indicator once reached a real customer during a shadow run.
    // Enforcing it here means shadow mode holds even if a future code path
    // forgets — the promise is kept by the sender, not by every caller.
    if (channel.mode !== 'live') {
      row.status = 'cancelled';
      row.last_error = `Channel is in ${channel.mode} mode; nothing is sent to customers.`;
      await this.outboxRepository.save(row);
      this.logger.warn(
        `Outbox ${row.id} (${row.action}) cancelled: channel "${channel.name}" is in ${channel.mode} mode.`,
      );
      return;
    }

    try {
      const externalId = await this.dispatch(channel, row);

      row.status = 'sent';
      row.external_id = externalId ?? null;
      row.sent_at = new Date();
      row.attempts += 1;
      row.last_error = null;
      await this.outboxRepository.save(row);

      if (row.message_id) {
        await this.messageRepository.update(
          { id: row.message_id },
          { status: 'sent', external_id: externalId ?? null, error: null },
        );
      }
    } catch (error: any) {
      const retryable = error instanceof GraphApiError ? error.retryable : true;
      await this.fail(row, error?.message || 'Unknown error', retryable);
    }
  }

  private async dispatch(
    channel: AutomationChannel,
    row: AutomationOutbox,
  ): Promise<string | null> {
    const payload = row.payload || {};

    switch (row.action) {
      case 'comment_reply':
        return this.facebookApi.replyToComment(channel, payload.comment_id, payload.message);

      case 'private_reply':
        return this.facebookApi.privateReplyToComment(
          channel,
          payload.comment_id,
          payload.message,
        );

      case 'send_message':
        return this.facebookApi.sendMessage(channel, payload.psid, payload.message);

      case 'sender_action':
        await this.facebookApi.senderAction(channel, payload.psid, payload.sender_action);
        return null;

      case 'page_post':
        return this.facebookApi.publishPost(channel, payload.message, payload.link ?? null);

      case 'hide_comment':
        await this.facebookApi.hideComment(channel, payload.comment_id);
        return null;

      case 'delete_comment':
        await this.facebookApi.deleteComment(channel, payload.comment_id);
        return null;

      default:
        throw new Error(`Unknown outbox action: ${row.action}`);
    }
  }

  /** Schedules a retry, or gives up when the error is permanent or attempts run out. */
  private async fail(row: AutomationOutbox, message: string, retryable: boolean): Promise<void> {
    row.attempts += 1;
    row.last_error = String(message).slice(0, 2000);

    const attemptsLeft = row.attempts < row.max_attempts;

    if (retryable && attemptsLeft) {
      const minutes = BACKOFF_MINUTES[Math.min(row.attempts, BACKOFF_MINUTES.length - 1)];
      row.status = 'pending';
      row.next_attempt_at = new Date(Date.now() + minutes * 60000);
      this.logger.warn(
        `Outbox ${row.id} (${row.action}) failed, retrying in ${minutes}m: ${message}`,
      );
    } else {
      row.status = 'failed';
      this.logger.error(
        `Outbox ${row.id} (${row.action}) permanently failed after ${row.attempts} attempt(s): ${message}`,
      );
      if (row.message_id) {
        await this.messageRepository.update(
          { id: row.message_id },
          { status: 'failed', error: row.last_error },
        );
      }
    }

    await this.outboxRepository.save(row);
  }

  /** Retries everything that is due. Overlap-guarded so a slow run cannot stack. */
  @Cron(CronExpression.EVERY_MINUTE)
  async sweep(): Promise<void> {
    if (this.sweepRunning) return;
    this.sweepRunning = true;

    try {
      if (!(await this.settings.isOperational())) return;

      const due = await this.outboxRepository.find({
        where: { status: 'pending', next_attempt_at: LessThanOrEqual(new Date()) },
        order: { next_attempt_at: 'ASC' },
        take: 50,
      });

      if (due.length === 0) return;
      this.logger.log(`Outbox sweep: retrying ${due.length} action(s)`);

      for (const row of due) {
        await this.attempt(row);
      }
    } catch (error: any) {
      this.logger.error(`Outbox sweep failed: ${error?.message}`);
    } finally {
      this.sweepRunning = false;
    }
  }

  /**
   * Nightly prune of old events and delivered outbox rows.
   *
   * Without this the events table grows forever — the same trap that fills a
   * self-hosted n8n's disk. `log_retention_days = 0` keeps everything.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async prune(): Promise<void> {
    try {
      const global = await this.settings.getGlobal();
      const days = Number(global.log_retention_days) || 0;
      if (days <= 0) return;

      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const events = await this.eventRepository.delete({ received_at: LessThan(cutoff) });
      const outbox = await this.outboxRepository
        .createQueryBuilder()
        .delete()
        .where('status IN (:...statuses)', { statuses: ['sent', 'cancelled'] })
        .andWhere('created_at < :cutoff', { cutoff })
        .execute();

      this.logger.log(
        `Automation prune: removed ${events.affected ?? 0} event(s) and ${outbox.affected ?? 0} outbox row(s) older than ${days} days`,
      );
    } catch (error: any) {
      this.logger.error(`Automation prune failed: ${error?.message}`);
    }
  }

  /** Manual retry from the panel. */
  async retry(id: number): Promise<AutomationOutbox | null> {
    const row = await this.outboxRepository.findOne({ where: { id } });
    if (!row) return null;

    row.status = 'pending';
    row.next_attempt_at = new Date();
    if (row.attempts >= row.max_attempts) row.max_attempts = row.attempts + 1;
    await this.outboxRepository.save(row);

    await this.attempt(row);
    return this.outboxRepository.findOne({ where: { id } });
  }

  /** Cancels a queued action from the panel. */
  async cancel(id: number): Promise<boolean> {
    const result = await this.outboxRepository.update(
      { id, status: 'pending' },
      { status: 'cancelled' },
    );
    return (result.affected ?? 0) > 0;
  }
}
