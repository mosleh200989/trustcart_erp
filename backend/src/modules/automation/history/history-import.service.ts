import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as crypto from 'crypto';

import { META_GRAPH_BASE_URL } from '../../../common/constants/meta-webhook.constants';
import { AutomationChannel } from '../entities/automation-channel.entity';
import { AutomationImportRun } from '../entities/automation-import-run.entity';
import { AutomationHistoryThread } from '../entities/automation-history-thread.entity';
import { AutomationHistoryMessage } from '../entities/automation-history-message.entity';
import { maskMessage } from './message-masker';

/** Conversations per Graph page. Meta caps this well below 100 in practice. */
const CONVERSATIONS_PAGE_SIZE = 25;
/** Pause between Graph calls, so a long import does not trip the rate limiter. */
const PACE_MS = 350;
/** Hard stop, so a runaway import cannot loop forever against a paging bug. */
const MAX_PAGES = 400;

/** Graph error codes that mean "slow down" rather than "stop". */
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);

type GraphMessage = {
  id: string;
  message?: string;
  created_time?: string;
  from?: { id?: string; name?: string };
};

/**
 * Imports past Messenger conversations so the bot can learn how the team
 * writes.
 *
 * Two rules shape everything here. Every message is masked before it is stored,
 * so a stale price cannot survive to be quoted later. And imported data lives in
 * its own tables, so it never appears in the live inbox or feeds the per-thread
 * reply context — it is training material, not traffic.
 *
 * Runs are resumable: the Graph cursor is written to the run row after every
 * page, so a restart, a rate limit or a cancelled run picks up where it left off
 * instead of re-fetching thousands of conversations.
 */
@Injectable()
export class HistoryImportService {
  private readonly logger = new Logger(HistoryImportService.name);
  private readonly running = new Set<number>();

  constructor(
    @InjectRepository(AutomationImportRun)
    private readonly runRepository: Repository<AutomationImportRun>,
    @InjectRepository(AutomationHistoryThread)
    private readonly threadRepository: Repository<AutomationHistoryThread>,
    @InjectRepository(AutomationHistoryMessage)
    private readonly messageRepository: Repository<AutomationHistoryMessage>,
    @InjectRepository(AutomationChannel)
    private readonly channelRepository: Repository<AutomationChannel>,
  ) {}

  /** Stable pseudonym for a participant. The PSID itself is never stored. */
  private participantRef(psid: string): string {
    const salt = process.env.JWT_SECRET || 'trustcart-automation';
    return crypto.createHmac('sha256', salt).update(String(psid)).digest('hex').slice(0, 32);
  }

  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Queues a run and starts it in the background. Returns immediately. */
  async start(
    channelId: number,
    sinceDays: number,
    userId: number | null,
  ): Promise<AutomationImportRun> {
    const channel = await this.channelRepository.findOne({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');
    if (!channel.page_access_token) {
      throw new BadRequestException('This channel has no page access token.');
    }
    if (this.running.has(channelId)) {
      throw new BadRequestException('An import is already running for this channel.');
    }

    const days = Math.min(Math.max(Number(sinceDays) || 180, 1), 730);
    const run = await this.runRepository.save(
      this.runRepository.create({
        channel_id: channelId,
        status: 'pending',
        since: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        requested_by: userId,
      }),
    );

    // Deliberately not awaited: the caller gets the run row straight away and
    // polls it. Progress lives in the database, not in this promise.
    void this.execute(run.id).catch((error) =>
      this.logger.error(`Import run ${run.id} crashed: ${error?.message}`, error?.stack),
    );

    return run;
  }

  /** Asks a running import to stop after its current page. */
  async cancel(runId: number): Promise<AutomationImportRun> {
    const run = await this.runRepository.findOne({ where: { id: runId } });
    if (!run) throw new NotFoundException('Import run not found');
    if (run.status === 'running' || run.status === 'pending') {
      run.status = 'cancelled';
      run.finished_at = new Date();
      await this.runRepository.save(run);
    }
    return run;
  }

  private async isCancelled(runId: number): Promise<boolean> {
    const current = await this.runRepository.findOne({
      where: { id: runId },
      select: ['id', 'status'],
    });
    return current?.status === 'cancelled';
  }

  private async execute(runId: number): Promise<void> {
    const run = await this.runRepository.findOne({ where: { id: runId } });
    if (!run) return;

    const channel = await this.channelRepository.findOne({ where: { id: run.channel_id } });
    if (!channel?.page_access_token) {
      run.status = 'failed';
      run.error = 'Channel or token missing';
      run.finished_at = new Date();
      await this.runRepository.save(run);
      return;
    }

    this.running.add(run.channel_id);
    run.status = 'running';
    run.started_at = new Date();
    await this.runRepository.save(run);

    const token = channel.page_access_token;
    const sinceMs = run.since ? run.since.getTime() : 0;

    let url =
      `${META_GRAPH_BASE_URL}/${encodeURIComponent(channel.page_id)}/conversations` +
      `?fields=id,updated_time,participants,messages.limit(50){id,message,created_time,from}` +
      `&limit=${CONVERSATIONS_PAGE_SIZE}`;
    if (run.cursor) url += `&after=${encodeURIComponent(run.cursor)}`;

    try {
      for (let page = 0; page < MAX_PAGES; page += 1) {
        if (await this.isCancelled(run.id)) {
          this.logger.log(`Import run ${run.id} cancelled after ${page} page(s)`);
          this.running.delete(run.channel_id);
          return;
        }

        const response = await this.fetchWithRateLimit(url, token);
        const conversations: any[] = response?.data ?? [];

        let reachedCutoff = false;
        for (const conversation of conversations) {
          const updated = conversation?.updated_time
            ? new Date(conversation.updated_time).getTime()
            : 0;
          // Conversations come back newest first, so the first one older than
          // the window means every one after it is older too.
          if (sinceMs && updated && updated < sinceMs) {
            reachedCutoff = true;
            break;
          }
          await this.importConversation(run, channel, conversation);
        }

        run.pages_fetched += 1;
        const next = response?.paging?.cursors?.after;
        run.cursor = next ?? null;
        await this.runRepository.save(run);

        if (reachedCutoff || !response?.paging?.next || !next) break;
        url =
          `${META_GRAPH_BASE_URL}/${encodeURIComponent(channel.page_id)}/conversations` +
          `?fields=id,updated_time,participants,messages.limit(50){id,message,created_time,from}` +
          `&limit=${CONVERSATIONS_PAGE_SIZE}&after=${encodeURIComponent(next)}`;

        await this.pause(PACE_MS);
      }

      run.status = 'completed';
      run.finished_at = new Date();
      await this.runRepository.save(run);
      this.logger.log(
        `Import run ${run.id} completed: ${run.threads_imported} thread(s), ${run.messages_imported} message(s)`,
      );
    } catch (error: any) {
      run.status = 'failed';
      run.error = String(error?.message ?? error).slice(0, 2000);
      run.finished_at = new Date();
      await this.runRepository.save(run);
      this.logger.error(`Import run ${run.id} failed: ${run.error}`);
    } finally {
      this.running.delete(run.channel_id);
    }
  }

  /** GETs a Graph URL, waiting and retrying once when rate limited. */
  private async fetchWithRateLimit(url: string, token: string): Promise<any> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const res = await axios.get(url, {
          params: { access_token: token },
          timeout: 30000,
        });
        return res.data;
      } catch (error: any) {
        const graphError = error?.response?.data?.error;
        const code = Number(graphError?.code);
        const retryable = RATE_LIMIT_CODES.has(code) || (error?.response?.status ?? 0) >= 500;

        if (!retryable || attempt === 2) {
          throw new Error(graphError?.message || error?.message || 'Graph request failed');
        }

        const wait = 5000 * (attempt + 1);
        this.logger.warn(`Rate limited by Graph (code ${code}); waiting ${wait}ms`);
        await this.pause(wait);
      }
    }
    throw new Error('Graph request failed after retries');
  }

  private async importConversation(
    run: AutomationImportRun,
    channel: AutomationChannel,
    conversation: any,
  ): Promise<void> {
    const externalThreadId = String(conversation?.id ?? '');
    if (!externalThreadId) return;

    // The participant who is not the page.
    const participants: any[] = conversation?.participants?.data ?? [];
    const customer = participants.find((p) => String(p?.id) !== String(channel.page_id));

    let thread = await this.threadRepository.findOne({
      where: { channel_id: channel.id, external_thread_id: externalThreadId },
    });

    if (!thread) {
      thread = await this.threadRepository.save(
        this.threadRepository.create({
          channel_id: channel.id,
          run_id: run.id,
          external_thread_id: externalThreadId,
          participant_ref: customer?.id ? this.participantRef(String(customer.id)) : null,
        }),
      );
      run.threads_imported += 1;
    }

    const messages: GraphMessage[] = conversation?.messages?.data ?? [];
    let stored = 0;
    let firstAt: Date | null = thread.first_message_at;
    let lastAt: Date | null = thread.last_message_at;

    for (const message of messages) {
      const externalId = String(message?.id ?? '');
      if (!externalId) continue;

      const body = String(message?.message ?? '').trim();
      if (!body) continue;

      const masked = maskMessage(body);
      const sentAt = message?.created_time ? new Date(message.created_time) : null;
      const fromPage = String(message?.from?.id ?? '') === String(channel.page_id);

      try {
        await this.messageRepository.insert({
          thread_id: thread.id,
          channel_id: channel.id,
          external_id: externalId,
          direction: fromPage ? 'outbound' : 'inbound',
          text: masked.text,
          masked_counts: masked.counts,
          sent_at: sentAt,
        });
        stored += 1;
      } catch (error: any) {
        // 23505 = we already imported this message on an earlier run. That is
        // what makes re-running an import safe and resumable.
        if (String(error?.code) !== '23505') throw error;
        continue;
      }

      if (sentAt) {
        if (!firstAt || sentAt < firstAt) firstAt = sentAt;
        if (!lastAt || sentAt > lastAt) lastAt = sentAt;
      }
    }

    if (stored > 0) {
      thread.message_count += stored;
      thread.first_message_at = firstAt;
      thread.last_message_at = lastAt;
      await this.threadRepository.save(thread);
      run.messages_imported += stored;
    }
  }

  // ─── Reading what was imported ───────────────────────────────────────────

  async listRuns(channelId?: number): Promise<AutomationImportRun[]> {
    return this.runRepository.find({
      where: channelId ? { channel_id: channelId } : {},
      order: { id: 'DESC' },
      take: 20,
    });
  }

  async getRun(id: number): Promise<AutomationImportRun> {
    const run = await this.runRepository.findOne({ where: { id } });
    if (!run) throw new NotFoundException('Import run not found');
    return run;
  }

  /** Imported messages, newest first, for reading and picking examples. */
  async listMessages(options: {
    direction?: 'inbound' | 'outbound';
    onlyExamples?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: AutomationHistoryMessage[]; total: number }> {
    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
    const offset = Math.max(Number(options.offset) || 0, 0);

    const query = this.messageRepository
      .createQueryBuilder('m')
      .orderBy('m.sent_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (options.direction) query.andWhere('m.direction = :d', { d: options.direction });
    if (options.onlyExamples) query.andWhere('m.is_example = true');
    if (options.search) query.andWhere('m.text ILIKE :s', { s: `%${options.search}%` });

    const [rows, total] = await query.getManyAndCount();
    return { rows, total };
  }

  /** Marks or unmarks a message as a style example for the AI system prompt. */
  async setExample(id: number, isExample: boolean): Promise<AutomationHistoryMessage> {
    const message = await this.messageRepository.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    message.is_example = isExample;
    return this.messageRepository.save(message);
  }

  async stats(): Promise<Record<string, number>> {
    const [threads, messages, inbound, outbound, examples] = await Promise.all([
      this.threadRepository.count(),
      this.messageRepository.count(),
      this.messageRepository.count({ where: { direction: 'inbound' } }),
      this.messageRepository.count({ where: { direction: 'outbound' } }),
      this.messageRepository.count({ where: { is_example: true } }),
    ]);
    return { threads, messages, inbound, outbound, examples };
  }
}
