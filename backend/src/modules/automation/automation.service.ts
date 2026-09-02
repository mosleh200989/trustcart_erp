import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AutomationChannel } from './entities/automation-channel.entity';
import { AutomationRule } from './entities/automation-rule.entity';
import { AutomationEvent } from './entities/automation-event.entity';
import { AutomationConversation } from './entities/automation-conversation.entity';
import { AutomationMessage } from './entities/automation-message.entity';
import { AutomationOutbox } from './entities/automation-outbox.entity';
import { Storefront } from '../storefronts/storefront.entity';
import { AutomationSettingsService } from './automation-settings.service';
import { FacebookApiService } from './facebook/facebook-api.service';
import { ReplyBrainService } from './facebook/reply-brain.service';
import { CreateChannelDto, CreateRuleDto } from './dto/automation.dto';

/** A channel as the panel sees it — never carrying the access token itself. */
export type SafeChannel = Omit<AutomationChannel, 'page_access_token'> & {
  has_token: boolean;
  storefront_name?: string | null;
};

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(AutomationChannel)
    private readonly channelRepository: Repository<AutomationChannel>,
    @InjectRepository(AutomationRule)
    private readonly ruleRepository: Repository<AutomationRule>,
    @InjectRepository(AutomationEvent)
    private readonly eventRepository: Repository<AutomationEvent>,
    @InjectRepository(AutomationConversation)
    private readonly conversationRepository: Repository<AutomationConversation>,
    @InjectRepository(AutomationMessage)
    private readonly messageRepository: Repository<AutomationMessage>,
    @InjectRepository(AutomationOutbox)
    private readonly outboxRepository: Repository<AutomationOutbox>,
    @InjectRepository(Storefront)
    private readonly storefrontRepository: Repository<Storefront>,
    private readonly settings: AutomationSettingsService,
    private readonly facebookApi: FacebookApiService,
  ) {}

  /** Strips the access token before anything leaves the backend. */
  private toSafeChannel(
    channel: AutomationChannel,
    storefrontNames?: Map<number, string>,
  ): SafeChannel {
    const { page_access_token, ...rest } = channel;
    return {
      ...(rest as any),
      has_token: Boolean(page_access_token),
      storefront_name: channel.storefront_id
        ? (storefrontNames?.get(channel.storefront_id) ?? null)
        : null,
    };
  }

  // ─── Channels ────────────────────────────────────────────────────────────

  async listChannels(): Promise<SafeChannel[]> {
    const channels = await this.channelRepository.find({ order: { id: 'ASC' } });
    const storefronts = await this.storefrontRepository.find({ select: ['id', 'name'] });
    const names = new Map(storefronts.map((s) => [s.id, s.name]));
    return channels.map((channel) => this.toSafeChannel(channel, names));
  }

  async getChannel(id: number): Promise<SafeChannel> {
    const channel = await this.channelRepository.findOne({ where: { id } });
    if (!channel) throw new NotFoundException('Channel not found');
    return this.toSafeChannel(channel);
  }

  /** Internal accessor that keeps the token — never expose the result directly. */
  private async getChannelWithToken(id: number): Promise<AutomationChannel> {
    const channel = await this.channelRepository.findOne({ where: { id } });
    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }

  async createChannel(dto: CreateChannelDto): Promise<SafeChannel> {
    const platform = dto.platform || 'facebook';
    const existing = await this.channelRepository.findOne({
      where: { platform, page_id: dto.page_id },
    });
    if (existing) {
      throw new BadRequestException(
        `A ${platform} channel for page ${dto.page_id} already exists`,
      );
    }

    const global = await this.settings.getGlobal();
    const channel = await this.channelRepository.save(
      this.channelRepository.create({
        ...dto,
        platform,
        // New channels start in the configured default (shadow) unless told
        // otherwise, so nothing can go live by accident on creation.
        mode: dto.mode || global.default_mode,
      }),
    );

    return this.toSafeChannel(channel);
  }

  async updateChannel(id: number, dto: Partial<CreateChannelDto>): Promise<SafeChannel> {
    const channel = await this.getChannelWithToken(id);

    // An empty token field in the form means "leave it alone", not "clear it".
    const patch: Partial<AutomationChannel> = { ...(dto as any) };
    if (!dto.page_access_token) delete patch.page_access_token;

    Object.assign(channel, patch);
    const saved = await this.channelRepository.save(channel);
    return this.toSafeChannel(saved);
  }

  async deleteChannel(id: number): Promise<{ deleted: true }> {
    const result = await this.channelRepository.delete({ id });
    if (!result.affected) throw new NotFoundException('Channel not found');
    return { deleted: true };
  }

  /** Confirms the stored token works and that it belongs to the configured page. */
  async verifyChannel(id: number): Promise<{
    ok: boolean;
    page?: { id: string; name: string | null };
    subscriptions?: any;
    error?: string;
    warning?: string;
    note?: string;
  }> {
    const channel = await this.getChannelWithToken(id);
    try {
      const page = await this.facebookApi.verifyToken(channel);
      let subscriptions: any = null;
      try {
        subscriptions = await this.facebookApi.getPageSubscriptions(channel);
      } catch {
        // Subscription read needs an extra permission; not fatal for a token check.
      }

      // The only thing that must be true: the token belongs to this page.
      if (page.id !== channel.page_id) {
        return {
          ok: false,
          page,
          subscriptions,
          warning:
            `This token belongs to page ${page.id}${page.name ? ` ("${page.name}")` : ''}, ` +
            `not the configured page ${channel.page_id}.`,
        };
      }

      return {
        ok: true,
        page,
        subscriptions,
        note: page.limitedScopes
          ? 'Token is valid for this page and can send and receive messages. It cannot read ' +
            'page details, so add pages_read_engagement and regenerate it before importing ' +
            'conversation history.'
          : undefined,
      };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Token verification failed' };
    }
  }

  /** Subscribes the app to this page's webhook fields. */
  async subscribeChannel(id: number, fields?: string[]): Promise<{ ok: boolean; error?: string }> {
    const channel = await this.getChannelWithToken(id);
    try {
      const ok = await this.facebookApi.subscribePage(
        channel,
        fields && fields.length > 0 ? fields : undefined,
      );
      return { ok };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Subscription failed' };
    }
  }

  /** Publishes a post on the page — the "posting" half of the automation. */
  async publishPost(
    id: number,
    message: string,
    link?: string,
  ): Promise<{ ok: boolean; postId?: string | null; error?: string }> {
    const channel = await this.getChannelWithToken(id);

    if (channel.mode !== 'live') {
      throw new BadRequestException(
        `Channel "${channel.name}" is in ${channel.mode} mode. Switch it to live before publishing.`,
      );
    }

    try {
      const postId = await this.facebookApi.publishPost(channel, message, link ?? null);
      return { ok: true, postId };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Publish failed' };
    }
  }

  // ─── Rules ───────────────────────────────────────────────────────────────

  async listRules(channelId?: number): Promise<AutomationRule[]> {
    const query = this.ruleRepository
      .createQueryBuilder('r')
      .orderBy('r.priority', 'ASC')
      .addOrderBy('r.id', 'ASC');

    if (channelId) {
      query.where('(r.channel_id = :channelId OR r.channel_id IS NULL)', { channelId });
    }

    return query.getMany();
  }

  private validateRule(dto: Partial<CreateRuleDto>): void {
    if (dto.match_type === 'regex') {
      for (const pattern of dto.patterns || []) {
        try {
          new RegExp(pattern, 'i');
        } catch (error: any) {
          throw new BadRequestException(`Invalid regular expression "${pattern}": ${error?.message}`);
        }
      }
    }

    if ((dto.action ?? 'reply') === 'reply' && !String(dto.reply_text ?? '').trim()) {
      throw new BadRequestException('A rule with action "reply" needs reply text');
    }
  }

  async createRule(dto: CreateRuleDto): Promise<AutomationRule> {
    this.validateRule(dto);
    return this.ruleRepository.save(
      this.ruleRepository.create({ ...dto, channel_id: dto.channel_id ?? null }),
    );
  }

  async updateRule(id: number, dto: Partial<CreateRuleDto>): Promise<AutomationRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Rule not found');

    const merged = { ...rule, ...dto };
    this.validateRule(merged as any);

    Object.assign(rule, dto);
    if (dto.channel_id === null) rule.channel_id = null;
    return this.ruleRepository.save(rule);
  }

  async deleteRule(id: number): Promise<{ deleted: true }> {
    const result = await this.ruleRepository.delete({ id });
    if (!result.affected) throw new NotFoundException('Rule not found');
    return { deleted: true };
  }

  /**
   * Dry-run a message against the rules without touching Facebook.
   * This is what makes the panel safe to experiment in.
   */
  async testRules(
    channelId: number,
    text: string,
    threadType: 'comment' | 'message' = 'message',
  ): Promise<{
    matched: Array<{ id: number; name: string; action: string; would_reply: string | null }>;
    first_match: { id: number; name: string; action: string } | null;
  }> {
    const rules = await this.listRules(channelId);
    const matched: Array<{ id: number; name: string; action: string; would_reply: string | null }> = [];

    for (const rule of rules) {
      if (!rule.is_active) continue;
      if (rule.applies_to !== 'both' && rule.applies_to !== threadType) continue;
      if (!ReplyBrainService.ruleMatches(rule, text)) continue;

      matched.push({
        id: rule.id,
        name: rule.name,
        action: rule.action,
        would_reply: rule.reply_text ?? null,
      });

      if (rule.stop_on_match) break;
    }

    return {
      matched,
      first_match: matched[0]
        ? { id: matched[0].id, name: matched[0].name, action: matched[0].action }
        : null,
    };
  }

  // ─── Conversations, events, outbox ───────────────────────────────────────

  async listConversations(options: {
    channelId?: number;
    status?: string;
    threadType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: AutomationConversation[]; total: number }> {
    const limit = Math.min(Math.max(Number(options.limit) || 30, 1), 100);
    const offset = Math.max(Number(options.offset) || 0, 0);

    const query = this.conversationRepository
      .createQueryBuilder('c')
      .orderBy('c.updated_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (options.channelId) query.andWhere('c.channel_id = :channelId', { channelId: options.channelId });
    if (options.status) query.andWhere('c.status = :status', { status: options.status });
    if (options.threadType) query.andWhere('c.thread_type = :t', { t: options.threadType });

    const [rows, total] = await query.getManyAndCount();
    return { rows, total };
  }

  async getConversation(id: number): Promise<{
    conversation: AutomationConversation;
    messages: AutomationMessage[];
  }> {
    const conversation = await this.conversationRepository.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const messages = await this.messageRepository.find({
      where: { conversation_id: id },
      order: { created_at: 'ASC' },
      take: 200,
    });

    return { conversation, messages };
  }

  async setConversationStatus(
    id: number,
    status: string,
    userId: number | null,
  ): Promise<AutomationConversation> {
    const conversation = await this.conversationRepository.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    conversation.status = status as any;
    conversation.assigned_user_id = status === 'human' ? userId : conversation.assigned_user_id;
    if (status === 'bot') conversation.escalation_reason = null;

    return this.conversationRepository.save(conversation);
  }

  async listEvents(options: {
    channelId?: number;
    status?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: AutomationEvent[]; total: number }> {
    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
    const offset = Math.max(Number(options.offset) || 0, 0);

    const query = this.eventRepository
      .createQueryBuilder('e')
      .orderBy('e.received_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (options.channelId) query.andWhere('e.channel_id = :channelId', { channelId: options.channelId });
    if (options.status) query.andWhere('e.status = :status', { status: options.status });
    if (options.eventType) query.andWhere('e.event_type = :type', { type: options.eventType });

    const [rows, total] = await query.getManyAndCount();
    return { rows, total };
  }

  async getEvent(id: number): Promise<AutomationEvent> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async listOutbox(options: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: AutomationOutbox[]; total: number }> {
    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
    const offset = Math.max(Number(options.offset) || 0, 0);

    const query = this.outboxRepository
      .createQueryBuilder('o')
      .orderBy('o.created_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (options.status) query.andWhere('o.status = :status', { status: options.status });

    const [rows, total] = await query.getManyAndCount();
    return { rows, total };
  }

  /** Replies the bot held back in shadow mode, waiting to be read. */
  async listHeldMessages(limit = 50): Promise<AutomationMessage[]> {
    return this.messageRepository.find({
      where: { status: 'held' },
      order: { created_at: 'DESC' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  // ─── Overview ────────────────────────────────────────────────────────────

  /** Everything the panel's landing screen needs, in one round trip. */
  async overview(): Promise<Record<string, any>> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      settings,
      channels,
      eventsToday,
      handledToday,
      skippedToday,
      failedToday,
      repliesToday,
      heldTotal,
      needsHuman,
      outboxPending,
      outboxFailed,
      activeRules,
      lastEvent,
    ] = await Promise.all([
      this.settings.getAll(),
      this.listChannels(),
      this.eventRepository.count({ where: { received_at: Between(dayAgo, now) } }),
      this.eventRepository.count({ where: { received_at: Between(dayAgo, now), status: 'handled' } }),
      this.eventRepository.count({ where: { received_at: Between(dayAgo, now), status: 'skipped' } }),
      this.eventRepository.count({ where: { received_at: Between(dayAgo, now), status: 'failed' } }),
      this.messageRepository.count({
        where: { direction: 'outbound', created_at: Between(dayAgo, now) },
      }),
      this.messageRepository.count({ where: { status: 'held' } }),
      this.conversationRepository.count({ where: { status: 'needs_human' } }),
      this.outboxRepository.count({ where: { status: 'pending' } }),
      this.outboxRepository.count({ where: { status: 'failed' } }),
      this.ruleRepository.count({ where: { is_active: true } }),
      this.eventRepository.findOne({ where: {}, order: { received_at: 'DESC' } }),
    ]);

    return {
      settings,
      channels,
      counters: {
        events_24h: eventsToday,
        handled_24h: handledToday,
        skipped_24h: skippedToday,
        failed_24h: failedToday,
        replies_24h: repliesToday,
        held_total: heldTotal,
        needs_human: needsHuman,
        outbox_pending: outboxPending,
        outbox_failed: outboxFailed,
        active_rules: activeRules,
      },
      last_event_at: lastEvent?.received_at ?? null,
      webhook: {
        // Handy to copy straight into the Meta App Dashboard.
        callback_path: '/api/automation/webhook/facebook',
        verify_token_configured: Boolean(String(process.env.META_WEBHOOK_VERIFY_TOKEN ?? '').trim()),
        app_secret_configured: Boolean(String(process.env.META_APP_SECRET ?? '').trim()),
        ai_key_configured: Boolean(String(process.env.ANTHROPIC_API_KEY ?? '').trim()),
      },
    };
  }
}
