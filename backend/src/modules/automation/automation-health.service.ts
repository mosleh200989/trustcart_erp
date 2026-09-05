import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutomationChannel } from './entities/automation-channel.entity';
import { AutomationSettingsService } from './automation-settings.service';
import { FacebookApiService } from './facebook/facebook-api.service';

export type HealthStatus = 'ok' | 'warning' | 'error' | 'unknown';

export type ChannelHealth = {
  channelId: number;
  name: string;
  status: HealthStatus;
  detail: string;
  checkedAt: string;
};

/** What the probes found, before any judgement is applied. */
export type HealthProbe = {
  /** Null when the channel has no token stored at all. */
  tokenError: string | null;
  tokenOk: boolean;
  /** Null when the subscription could not be read — not proof it is missing. */
  subscribedFields: string[] | null;
  subscriptionError: string | null;
};

/**
 * Is this page actually still connected to Facebook?
 *
 * Written after the Kasri page stopped receiving webhooks for two days without
 * anything appearing to be wrong. The endpoint answered, the secret was
 * configured, and the events table was empty — which is indistinguishable from
 * a quiet day. The real cause was the Facebook app having its API access
 * blocked, which one Graph call surfaces immediately.
 *
 * So there are two independent signals here, because either alone has a blind
 * spot: a Graph probe catches a dead token or a blocked app but not a page that
 * was quietly unsubscribed, and silence catches an unsubscribed page but takes
 * a day and cannot tell "broken" from "nobody messaged us".
 */
@Injectable()
export class AutomationHealthService {
  private readonly logger = new Logger(AutomationHealthService.name);

  constructor(
    @InjectRepository(AutomationChannel)
    private readonly channelRepository: Repository<AutomationChannel>,
    private readonly settings: AutomationSettingsService,
    private readonly facebookApi: FacebookApiService,
  ) {}

  /**
   * Turns probe results into a status and a sentence someone can act on.
   *
   * Pure and static: the wording is the product here, and it should be
   * testable without a Facebook account.
   */
  static classify(
    channel: Pick<AutomationChannel, 'mode' | 'is_active' | 'last_event_at'>,
    probe: HealthProbe,
    options: { silenceHours: number; now?: Date },
  ): { status: HealthStatus; detail: string } {
    const now = options.now ?? new Date();

    if (!channel.is_active || channel.mode === 'off') {
      return { status: 'unknown', detail: 'Channel is switched off — not checked.' };
    }

    if (probe.tokenError) {
      return {
        status: 'error',
        detail: `Facebook rejected the page token: ${probe.tokenError}. Messages cannot be received or sent until this is fixed.`,
      };
    }

    // An empty list is a real answer, and it is the failure that looks like
    // nothing being wrong: the app-level webhook fields can be perfect while
    // the page itself is subscribed to nothing.
    if (probe.subscribedFields != null && probe.subscribedFields.length === 0) {
      return {
        status: 'error',
        detail:
          'This page is not subscribed to the app, so Facebook will never deliver a webhook. ' +
          'Subscribe it from Channels, or POST to /{page-id}/subscribed_apps.',
      };
    }

    if (probe.subscribedFields != null && !probe.subscribedFields.includes('messages')) {
      return {
        status: 'error',
        detail: `The page is subscribed, but not to "messages" (only: ${probe.subscribedFields.join(', ') || 'none'}). Messenger events will not arrive.`,
      };
    }

    const silenceHours = Number(options.silenceHours) || 24;
    if (channel.last_event_at) {
      const hours = (now.getTime() - new Date(channel.last_event_at).getTime()) / 3_600_000;
      if (hours >= silenceHours) {
        return {
          status: 'warning',
          detail:
            `No webhook has arrived in ${Math.floor(hours)} hours. ` +
            'That is either a quiet page or a broken connection — send the page a test message to tell them apart.',
        };
      }
    }

    if (probe.subscriptionError) {
      // Reading the subscription needs pages_manage_metadata, which a token can
      // lack while still receiving and sending perfectly well. Worth saying,
      // not worth alarming anyone about.
      return {
        status: 'ok',
        detail: `Connected. (Subscription could not be read: ${probe.subscriptionError} — the token lacks pages_manage_metadata.)`,
      };
    }

    return { status: 'ok', detail: 'Connected, subscribed to messages, and receiving events.' };
  }

  /** Runs the Graph probes for one channel. Never throws. */
  async probe(channel: AutomationChannel): Promise<HealthProbe> {
    const result: HealthProbe = {
      tokenError: null,
      tokenOk: false,
      subscribedFields: null,
      subscriptionError: null,
    };

    if (!channel.page_access_token) {
      result.tokenError = 'no page access token is saved';
      return result;
    }

    try {
      await this.facebookApi.verifyToken(channel);
      result.tokenOk = true;
    } catch (error: any) {
      result.tokenError = String(error?.message ?? error).slice(0, 300);
      return result;
    }

    try {
      const data = await this.facebookApi.getPageSubscriptions(channel);
      const apps = Array.isArray(data?.data) ? data.data : [];
      result.subscribedFields = apps.flatMap((app: any) =>
        Array.isArray(app?.subscribed_fields) ? app.subscribed_fields : [],
      );
    } catch (error: any) {
      result.subscriptionError = String(error?.message ?? error).slice(0, 300);
    }

    return result;
  }

  /** Checks one channel and stores the verdict on it. */
  async checkChannel(channel: AutomationChannel): Promise<ChannelHealth> {
    const global = await this.settings.getGlobal();
    const probe = await this.probe(channel);
    const { status, detail } = AutomationHealthService.classify(channel, probe, {
      silenceHours: Number(global.health_silence_hours ?? 24),
    });

    const checkedAt = new Date();
    await this.channelRepository.update(
      { id: channel.id },
      { health_status: status, health_detail: detail, health_checked_at: checkedAt },
    );

    if (status === 'error') {
      this.logger.error(`Channel "${channel.name}" is broken: ${detail}`);
    } else if (status === 'warning') {
      this.logger.warn(`Channel "${channel.name}": ${detail}`);
    }

    return {
      channelId: channel.id,
      name: channel.name,
      status,
      detail,
      checkedAt: checkedAt.toISOString(),
    };
  }

  /** Checks every channel. Used by the cron and the panel's button. */
  async checkAll(): Promise<ChannelHealth[]> {
    const channels = await this.channelRepository.find();
    const results: ChannelHealth[] = [];
    for (const channel of channels) {
      try {
        results.push(await this.checkChannel(channel));
      } catch (error: any) {
        this.logger.warn(`Health check failed for channel ${channel.id}: ${error?.message}`);
      }
    }
    return results;
  }

  /**
   * Every six hours rather than nightly: two days of silence was the actual
   * cost last time, and six hours is still far below the rate limit for two
   * Graph calls per page.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledCheck(): Promise<void> {
    const global = await this.settings.getGlobal();
    if (!global.enabled) return;
    await this.checkAll();
  }

  /** The stored verdicts, for the overview screen. No Graph calls. */
  async summary(): Promise<ChannelHealth[]> {
    const channels = await this.channelRepository.find({ order: { id: 'ASC' } });
    return channels.map((channel) => ({
      channelId: channel.id,
      name: channel.name,
      status: (channel.health_status as HealthStatus) ?? 'unknown',
      detail: channel.health_detail ?? 'Not checked yet.',
      checkedAt: channel.health_checked_at ? channel.health_checked_at.toISOString() : '',
    }));
  }
}
