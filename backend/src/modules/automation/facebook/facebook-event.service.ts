import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { AutomationChannel } from '../entities/automation-channel.entity';
import { AutomationEvent } from '../entities/automation-event.entity';
import { AutomationConversation } from '../entities/automation-conversation.entity';
import { AutomationMessage } from '../entities/automation-message.entity';
import { SupportTicket } from '../../support/support-ticket.entity';
import { NormalizedMetaEvent } from '../automation.types';
import { AutomationSettingsService } from '../automation-settings.service';
import { ReplyBrainService, ReplyDecision } from './reply-brain.service';
import { FacebookOutboxService } from './facebook-outbox.service';
import { AiTurn } from '../automation-ai.service';

/**
 * Turns raw Meta webhook payloads into decisions and, when allowed, replies.
 *
 * Ordering is deliberate and each step is a safety gate:
 *   store -> de-duplicate -> reject our own echoes -> check channel mode ->
 *   rate limit -> decide -> (shadow ? store only : send)
 *
 * The single most important line in this file is the echo check: without it the
 * bot's own reply arrives back as a new comment webhook and it answers itself
 * forever, in public, under the brand's name.
 */
@Injectable()
export class FacebookEventService {
  private readonly logger = new Logger(FacebookEventService.name);

  constructor(
    @InjectRepository(AutomationEvent)
    private readonly eventRepository: Repository<AutomationEvent>,
    @InjectRepository(AutomationChannel)
    private readonly channelRepository: Repository<AutomationChannel>,
    @InjectRepository(AutomationConversation)
    private readonly conversationRepository: Repository<AutomationConversation>,
    @InjectRepository(AutomationMessage)
    private readonly messageRepository: Repository<AutomationMessage>,
    @InjectRepository(SupportTicket)
    private readonly ticketRepository: Repository<SupportTicket>,
    private readonly settings: AutomationSettingsService,
    private readonly replyBrain: ReplyBrainService,
    private readonly outbox: FacebookOutboxService,
  ) {}

  // ─── Payload normalisation ───────────────────────────────────────────────

  /**
   * Flattens a webhook body into zero or more normalised events.
   *
   * Meta batches: one POST can carry several `entry` objects, each with several
   * `changes` (comments) or `messaging` items (Messenger). Anything we do not
   * understand still produces an `unknown` event so it is visible in the panel
   * rather than silently dropped.
   */
  static normalize(body: any): NormalizedMetaEvent[] {
    const events: NormalizedMetaEvent[] = [];
    const entries = Array.isArray(body?.entry) ? body.entry : [];

    for (const entry of entries) {
      const pageId = String(entry?.id ?? '');

      // Comments and other page-feed activity.
      for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
        const value = change?.value ?? {};
        const item = String(value?.item ?? '');
        const verb = String(value?.verb ?? '');

        if (change?.field !== 'feed') continue;

        if (item === 'comment') {
          const commentId = String(value?.comment_id ?? '');
          const postId = String(value?.post_id ?? '');
          const fromId = value?.from?.id != null ? String(value.from.id) : null;

          events.push({
            metaEventId: `comment:${commentId}:${verb || 'add'}`,
            eventType: verb === 'edited' ? 'comment_edit' : 'comment',
            pageId,
            threadType: 'comment',
            threadKey: postId || commentId,
            senderId: fromId,
            senderName: value?.from?.name ? String(value.from.name) : null,
            text: value?.message != null ? String(value.message) : null,
            commentId: commentId || null,
            postId: postId || null,
            psid: null,
            isEcho: Boolean(fromId && pageId && fromId === pageId),
            raw: change,
          });
          continue;
        }

        if (item === 'reaction') {
          events.push({
            metaEventId: `reaction:${value?.comment_id ?? value?.post_id}:${value?.from?.id}:${value?.reaction_type}`,
            eventType: 'reaction',
            pageId,
            threadType: 'comment',
            threadKey: String(value?.post_id ?? ''),
            senderId: value?.from?.id != null ? String(value.from.id) : null,
            senderName: value?.from?.name ? String(value.from.name) : null,
            text: null,
            commentId: value?.comment_id ? String(value.comment_id) : null,
            postId: value?.post_id ? String(value.post_id) : null,
            psid: null,
            isEcho: false,
            raw: change,
          });
        }
      }

      // Messenger.
      for (const messaging of Array.isArray(entry?.messaging) ? entry.messaging : []) {
        const senderId = messaging?.sender?.id != null ? String(messaging.sender.id) : null;
        const recipientId =
          messaging?.recipient?.id != null ? String(messaging.recipient.id) : null;

        if (messaging?.message) {
          const isEcho = Boolean(messaging.message.is_echo);
          // On an echo the page is the sender, so the customer is the recipient.
          const psid = isEcho ? recipientId : senderId;

          events.push({
            metaEventId: `message:${messaging.message.mid ?? `${senderId}:${messaging.timestamp}`}`,
            eventType: isEcho ? 'message_echo' : 'message',
            pageId,
            threadType: 'message',
            threadKey: String(psid ?? ''),
            senderId,
            senderName: null,
            text: messaging.message.text != null ? String(messaging.message.text) : null,
            commentId: null,
            postId: null,
            psid: psid,
            isEcho,
            raw: messaging,
          });
          continue;
        }

        if (messaging?.postback) {
          events.push({
            metaEventId: `postback:${messaging.postback.mid ?? `${senderId}:${messaging.timestamp}`}`,
            eventType: 'postback',
            pageId,
            threadType: 'message',
            threadKey: String(senderId ?? ''),
            senderId,
            senderName: null,
            text:
              messaging.postback.title != null
                ? String(messaging.postback.title)
                : messaging.postback.payload != null
                  ? String(messaging.postback.payload)
                  : null,
            commentId: null,
            postId: null,
            psid: senderId,
            isEcho: false,
            raw: messaging,
          });
        }
      }
    }

    return events;
  }

  // ─── Processing ──────────────────────────────────────────────────────────

  /**
   * Handles a whole webhook body. Called *after* the controller has already
   * answered Meta with 200, so nothing here is on the response path.
   */
  async processWebhook(body: any, signatureValid: boolean): Promise<void> {
    const events = FacebookEventService.normalize(body);

    this.logger.log(
      `Webhook received: object=${body?.object ?? 'none'} ` +
        `entries=${Array.isArray(body?.entry) ? body.entry.length : 0} ` +
        `normalized=${events.length} signed=${signatureValid} ` +
        `keys=[${Object.keys(body ?? {}).join(',')}]`,
    );

    // A body we cannot read must still be visible. Meta's webhook test tool
    // sends a `{ sample: { field, value } }` shape rather than the usual
    // `{ object, entry[] }` envelope, and any future contract change would look
    // the same: 200 returned, nothing stored, nothing logged, and no way to tell
    // a delivery that arrived and was ignored from one that never arrived.
    if (events.length === 0) {
      await this.recordUnparsedDelivery(body, signatureValid);
      return;
    }

    for (const event of events) {
      try {
        await this.processEvent(event, signatureValid);
      } catch (error: any) {
        this.logger.error(
          `Failed to process event ${event.metaEventId}: ${error?.message}`,
          error?.stack,
        );
      }
    }
  }

  /**
   * Stores a delivery we could not turn into any event, so it shows up in the
   * Events log instead of vanishing. Keyed by a hash of the body plus the
   * timestamp: identical retries stay distinguishable, which matters when the
   * question being answered is "did anything actually arrive?".
   */
  private async recordUnparsedDelivery(body: any, signatureValid: boolean): Promise<void> {
    try {
      const serialized = JSON.stringify(body ?? {});
      const digest = crypto.createHash('sha1').update(serialized).digest('hex').slice(0, 12);

      await this.eventRepository.save(
        this.eventRepository.create({
          channel_id: null,
          platform: 'facebook',
          page_id: body?.entry?.[0]?.id ?? null,
          event_type: 'unparsed',
          meta_event_id: `unparsed:${Date.now()}:${digest}`,
          signature_valid: signatureValid,
          status: 'skipped',
          skip_reason:
            'Delivery arrived but matched no known event shape — likely a webhook test payload',
          payload: body ?? {},
          processed_at: new Date(),
        }),
      );

      this.logger.warn(
        'Webhook delivery could not be parsed into any event; recorded as "unparsed" so it is visible in Events.',
      );
    } catch (error: any) {
      this.logger.error(`Could not record unparsed delivery: ${error?.message}`);
    }
  }

  private async markEvent(
    eventRow: AutomationEvent,
    status: AutomationEvent['status'],
    skipReason?: string | null,
    error?: string | null,
  ): Promise<void> {
    eventRow.status = status;
    eventRow.skip_reason = skipReason ?? null;
    eventRow.error = error ?? null;
    eventRow.processed_at = new Date();
    await this.eventRepository.save(eventRow);
  }

  private async processEvent(
    event: NormalizedMetaEvent,
    signatureValid: boolean,
  ): Promise<void> {
    const channel = await this.channelRepository.findOne({
      where: { page_id: event.pageId },
    });

    // Store first, decide later — even an event we cannot act on belongs in the log.
    let eventRow: AutomationEvent;
    try {
      eventRow = await this.eventRepository.save(
        this.eventRepository.create({
          channel_id: channel?.id ?? null,
          platform: channel?.platform ?? 'facebook',
          page_id: event.pageId,
          event_type: event.eventType,
          meta_event_id: event.metaEventId,
          signature_valid: signatureValid,
          status: 'received',
          payload: event.raw,
        }),
      );
    } catch (error: any) {
      // Unique violation on meta_event_id: Meta redelivered an event we already
      // handled. This is the de-duplication working, not a failure.
      if (String(error?.code) === '23505') {
        this.logger.debug(`Duplicate event ignored: ${event.metaEventId}`);
        return;
      }
      throw error;
    }

    if (!channel) {
      await this.markEvent(eventRow, 'skipped', `no channel configured for page ${event.pageId}`);
      return;
    }

    await this.channelRepository.update({ id: channel.id }, { last_event_at: new Date() });

    // The loop guard. Our own reply comes back as a webhook; answering it would
    // start an endless public conversation with ourselves.
    if (event.isEcho || (event.senderId && event.senderId === channel.page_id)) {
      await this.markEvent(eventRow, 'skipped', 'own_page_echo');
      return;
    }

    if (!['comment', 'message', 'postback'].includes(event.eventType)) {
      await this.markEvent(eventRow, 'skipped', `event type not actionable: ${event.eventType}`);
      return;
    }

    const global = await this.settings.getGlobal();
    if (!global.enabled) {
      await this.markEvent(eventRow, 'skipped', 'automation disabled globally');
      return;
    }

    if (!channel.is_active || channel.mode === 'off') {
      await this.markEvent(eventRow, 'skipped', `channel mode: ${channel.mode}`);
      return;
    }

    if (event.threadType === 'comment' && !channel.reply_to_comments) {
      await this.markEvent(eventRow, 'skipped', 'comment replies disabled for this channel');
      return;
    }
    if (event.threadType === 'message' && !channel.reply_to_messages) {
      await this.markEvent(eventRow, 'skipped', 'message replies disabled for this channel');
      return;
    }

    const conversation = await this.upsertConversation(channel, event);

    // Record the inbound message before deciding, so the thread is complete in
    // the panel even if the decision or the send fails.
    await this.messageRepository.save(
      this.messageRepository.create({
        conversation_id: conversation.id,
        channel_id: channel.id,
        direction: 'inbound',
        kind: event.threadType === 'comment' ? 'comment' : 'message',
        external_id: event.commentId ?? event.metaEventId,
        text: event.text,
        status: 'sent',
      }),
    );

    // Incremented in SQL rather than from the value we read above, so two events
    // arriving in the same batch cannot both write the same count.
    await this.conversationRepository.increment({ id: conversation.id }, 'message_count', 1);
    await this.conversationRepository.update(
      { id: conversation.id },
      {
        last_inbound_at: new Date(),
        display_name: event.senderName ?? conversation.display_name,
      },
    );

    // A person has taken this thread over — the bot must stay out of it.
    if (conversation.status === 'human' || conversation.status === 'closed') {
      await this.markEvent(eventRow, 'skipped', `conversation status: ${conversation.status}`);
      return;
    }

    if (await this.isRateLimited(channel, conversation)) {
      await this.markEvent(eventRow, 'skipped', 'rate_limited');
      return;
    }

    // Outside business hours: send the configured away message, or hand over.
    const outsideHours = this.outsideBusinessHours(channel);
    if (outsideHours.outside) {
      if (outsideHours.message) {
        await this.emitReply(channel, conversation, event, {
          action: 'reply',
          text: outsideHours.message,
          privateText: null,
          source: 'rule',
          ruleId: null,
          confidence: 1,
          reason: 'outside business hours',
          aiModel: null,
          aiUsage: null,
          erp: null,
        });
        await this.markEvent(eventRow, 'handled', 'outside business hours');
        return;
      }
      await this.escalateConversation(conversation, channel, event, 'outside business hours');
      await this.markEvent(eventRow, 'handled', 'outside business hours');
      return;
    }

    if (global.typing_indicator && event.threadType === 'message' && event.psid) {
      void this.outbox.enqueue({
        channelId: channel.id,
        action: 'sender_action',
        payload: { psid: event.psid, sender_action: 'typing_on' },
        conversationId: conversation.id,
      });
    }

    const history = await this.loadHistory(conversation.id);
    const decision = await this.replyBrain.decide({
      channel,
      threadType: event.threadType,
      text: event.text ?? '',
      history,
      displayName: event.senderName,
    });

    if (decision.ruleId) {
      void this.replyBrain.recordRuleHit(decision.ruleId);
    }

    if (decision.erp?.customerId && !conversation.customer_id) {
      await this.conversationRepository.update(
        { id: conversation.id },
        { customer_id: decision.erp.customerId },
      );
    }

    if (decision.action === 'ignore') {
      await this.markEvent(eventRow, 'skipped', decision.reason);
      return;
    }

    if (decision.action === 'escalate') {
      await this.escalateConversation(conversation, channel, event, decision.reason);
      await this.markEvent(eventRow, 'handled', `escalated: ${decision.reason}`);
      return;
    }

    await this.emitReply(channel, conversation, event, decision);
    await this.markEvent(eventRow, 'handled');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async upsertConversation(
    channel: AutomationChannel,
    event: NormalizedMetaEvent,
  ): Promise<AutomationConversation> {
    const existing = await this.conversationRepository.findOne({
      where: {
        channel_id: channel.id,
        thread_type: event.threadType,
        thread_key: event.threadKey,
      },
    });

    if (existing) return existing;

    return this.conversationRepository.save(
      this.conversationRepository.create({
        channel_id: channel.id,
        thread_type: event.threadType,
        thread_key: event.threadKey,
        psid: event.psid,
        post_id: event.postId,
        display_name: event.senderName,
        status: 'bot',
        message_count: 0,
      }),
    );
  }

  /**
   * Hard cap on auto-replies per thread per hour.
   * This is the brake that keeps a misbehaving rule from spamming a public post.
   */
  private async isRateLimited(
    channel: AutomationChannel,
    conversation: AutomationConversation,
  ): Promise<boolean> {
    const limit = Number(channel.max_replies_per_thread_hour) || 0;
    if (limit <= 0) return false;

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.messageRepository
      .createQueryBuilder('m')
      .where('m.conversation_id = :id', { id: conversation.id })
      .andWhere('m.direction = :direction', { direction: 'outbound' })
      // A NULL source is still a bot reply — `source <> 'human'` alone evaluates
      // to NULL for those rows and would quietly exclude them from the cap.
      .andWhere('(m.source IS NULL OR m.source <> :human)', { human: 'human' })
      .andWhere('m.created_at >= :since', { since })
      .getCount();

    if (count >= limit) {
      this.logger.warn(
        `Conversation ${conversation.id} hit the auto-reply cap (${count}/${limit} in the last hour)`,
      );
      return true;
    }
    return false;
  }

  /**
   * Business hours are optional. Shape:
   *   { enabled: true, start: "09:00", end: "22:00", outside_message: "..." }
   * Times are read in the server's timezone, which is already Asia/Dhaka.
   */
  private outsideBusinessHours(channel: AutomationChannel): {
    outside: boolean;
    message: string | null;
  } {
    const hours = channel.business_hours || {};
    if (!hours.enabled) return { outside: false, message: null };

    const parse = (value: any, fallback: number): number => {
      const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? ''));
      if (!match) return fallback;
      return Number(match[1]) * 60 + Number(match[2]);
    };

    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const start = parse(hours.start, 0);
    const end = parse(hours.end, 24 * 60);

    // A window that wraps midnight (e.g. 22:00 -> 06:00) is inclusive of both ends.
    const inside = start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;

    return {
      outside: !inside,
      message: hours.outside_message ? String(hours.outside_message) : null,
    };
  }

  /** The last few turns, oldest first, for AI context. */
  private async loadHistory(conversationId: number): Promise<AiTurn[]> {
    const rows = await this.messageRepository.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'DESC' },
      take: 20,
    });

    return rows
      .reverse()
      .filter((row) => row.text && row.status !== 'held')
      .map((row) => ({
        role: row.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
        text: String(row.text),
      }));
  }

  /** Marks a thread for a human and, if configured, opens a support ticket. */
  private async escalateConversation(
    conversation: AutomationConversation,
    channel: AutomationChannel,
    event: NormalizedMetaEvent,
    reason: string,
  ): Promise<void> {
    // Read before the update: an already-escalated thread must not open a second
    // ticket, however many more messages the customer sends.
    const alreadyEscalated = conversation.status === 'needs_human';

    await this.conversationRepository.update(
      { id: conversation.id },
      { status: 'needs_human', escalation_reason: reason.slice(0, 250) },
    );

    if (alreadyEscalated) return;

    const escalation = await this.settings.getEscalation();
    if (!escalation.create_support_ticket) return;

    try {
      await this.ticketRepository.save(
        this.ticketRepository.create({
          subject: `Facebook ${event.threadType} needs a reply — ${channel.name}`,
          message:
            `Reason: ${reason}\n\n` +
            `From: ${event.senderName ?? event.psid ?? 'unknown'}\n` +
            `Message: ${event.text ?? '(no text)'}\n\n` +
            `Automation conversation #${conversation.id}`,
          status: 'open',
          priority: 'medium',
          supportGroup: 'general',
          customerId: conversation.customer_id ? String(conversation.customer_id) : null,
        } as any),
      );
    } catch (error: any) {
      this.logger.warn(`Could not create support ticket for escalation: ${error?.message}`);
    }
  }

  /**
   * Records the outgoing reply and, unless the channel is in shadow mode, hands
   * it to the outbox.
   *
   * Shadow mode is the whole safety story before go-live: the decision is made
   * and stored exactly as it would be in production, and nothing leaves the building.
   */
  private async emitReply(
    channel: AutomationChannel,
    conversation: AutomationConversation,
    event: NormalizedMetaEvent,
    decision: ReplyDecision,
  ): Promise<void> {
    // Belt and braces: the brain never returns `reply` without text, but an empty
    // body would post a blank comment under the brand's own post.
    if (!decision.text?.trim()) {
      this.logger.warn(`Refusing to send an empty reply on channel ${channel.id}`);
      return;
    }

    const isShadow = channel.mode === 'shadow';
    const signature = channel.signature ? `\n${channel.signature}` : '';
    const body = `${decision.text}${signature}`;

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversation_id: conversation.id,
        channel_id: channel.id,
        direction: 'outbound',
        kind: event.threadType === 'comment' ? 'comment' : 'message',
        text: body,
        source: decision.source,
        rule_id: decision.ruleId,
        confidence: decision.confidence,
        shadow: isShadow,
        status: isShadow ? 'held' : 'pending',
        ai_model: decision.aiModel,
        ai_usage: decision.aiUsage,
        meta: { reason: decision.reason },
      }),
    );

    await this.conversationRepository.update(
      { id: conversation.id },
      { last_outbound_at: new Date() },
    );

    if (isShadow) {
      this.logger.log(
        `[shadow] ${channel.name} would reply to ${event.threadType} ${event.commentId ?? event.psid}: "${body.slice(0, 80)}"`,
      );
      return;
    }

    if (event.threadType === 'comment' && event.commentId) {
      await this.outbox.enqueue({
        channelId: channel.id,
        action: 'comment_reply',
        payload: { comment_id: event.commentId, message: body },
        conversationId: conversation.id,
        messageId: message.id,
      });

      const privateText = decision.privateText;
      if (channel.private_reply_to_comments && privateText) {
        await this.outbox.enqueue({
          channelId: channel.id,
          action: 'private_reply',
          payload: { comment_id: event.commentId, message: privateText },
          conversationId: conversation.id,
        });
      }
      return;
    }

    if (event.threadType === 'message' && event.psid) {
      await this.outbox.enqueue({
        channelId: channel.id,
        action: 'send_message',
        payload: { psid: event.psid, message: body },
        conversationId: conversation.id,
        messageId: message.id,
      });
    }
  }

  /** Manual reply sent by a person from the panel inbox. */
  async sendManualReply(
    conversationId: number,
    text: string,
    userId: number | null,
  ): Promise<AutomationMessage> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conversation) throw new Error('Conversation not found');

    const channel = await this.channelRepository.findOne({
      where: { id: conversation.channel_id },
    });
    if (!channel) throw new Error('Channel not found');

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversation_id: conversation.id,
        channel_id: channel.id,
        direction: 'outbound',
        kind: conversation.thread_type === 'comment' ? 'comment' : 'message',
        text,
        source: 'human',
        status: 'pending',
        meta: { sent_by_user_id: userId },
      }),
    );

    // A human replying takes ownership of the thread; the bot stands down.
    await this.conversationRepository.update(
      { id: conversation.id },
      { status: 'human', assigned_user_id: userId, last_outbound_at: new Date() },
    );

    if (conversation.thread_type === 'message' && conversation.psid) {
      await this.outbox.enqueue({
        channelId: channel.id,
        action: 'send_message',
        payload: { psid: conversation.psid, message: text },
        conversationId: conversation.id,
        messageId: message.id,
      });
    } else {
      // For a comment thread we reply under the most recent inbound comment.
      const lastInbound = await this.messageRepository.findOne({
        where: { conversation_id: conversation.id, direction: 'inbound' },
        order: { created_at: 'DESC' },
      });

      if (!lastInbound?.external_id) {
        await this.messageRepository.update(
          { id: message.id },
          { status: 'failed', error: 'No comment id available to reply under' },
        );
        throw new Error('No comment available to reply under in this thread');
      }

      await this.outbox.enqueue({
        channelId: channel.id,
        action: 'comment_reply',
        payload: { comment_id: lastInbound.external_id, message: text },
        conversationId: conversation.id,
        messageId: message.id,
      });
    }

    return message;
  }

  /**
   * Approves a reply that was held in shadow mode and sends it for real.
   * This is how the watch week converts into confidence.
   */
  async approveHeldMessage(messageId: number): Promise<AutomationMessage | null> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message || message.status !== 'held') return null;

    const conversation = await this.conversationRepository.findOne({
      where: { id: message.conversation_id },
    });
    if (!conversation) return null;

    await this.messageRepository.update({ id: message.id }, { status: 'pending', shadow: false });

    if (conversation.thread_type === 'message' && conversation.psid) {
      await this.outbox.enqueue({
        channelId: message.channel_id,
        action: 'send_message',
        payload: { psid: conversation.psid, message: message.text },
        conversationId: conversation.id,
        messageId: message.id,
      });
    } else {
      const lastInbound = await this.messageRepository.findOne({
        where: { conversation_id: conversation.id, direction: 'inbound' },
        order: { created_at: 'DESC' },
      });
      if (!lastInbound?.external_id) return null;

      await this.outbox.enqueue({
        channelId: message.channel_id,
        action: 'comment_reply',
        payload: { comment_id: lastInbound.external_id, message: message.text },
        conversationId: conversation.id,
        messageId: message.id,
      });
    }

    return this.messageRepository.findOne({ where: { id: messageId } });
  }
}
