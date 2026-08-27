import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { META_GRAPH_BASE_URL } from '../../../common/constants/meta-webhook.constants';
import { AutomationChannel } from '../entities/automation-channel.entity';

/** Messenger rejects message bodies longer than this. */
export const MESSENGER_MAX_CHARS = 2000;
/** Comments are capped far higher, but long replies read badly anyway. */
export const COMMENT_MAX_CHARS = 8000;

/**
 * Graph API error codes that are worth retrying. Everything else is a permanent
 * problem with the request — retrying an invalid token or a missing permission
 * just burns attempts and delays the alert to a human.
 *
 *   1, 2       transient/unknown platform errors
 *   4, 17, 32  application / user / page rate limits
 *   613        calls-per-second limit
 *   -1         internal Graph error
 */
const RETRYABLE_GRAPH_CODES = new Set([-1, 1, 2, 4, 17, 32, 613]);

export class GraphApiError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
    readonly subcode: number | null,
    readonly status: number | null,
    readonly retryable: boolean,
    readonly fbtraceId?: string | null,
  ) {
    super(message);
    this.name = 'GraphApiError';
  }
}

/**
 * Every outbound call to Meta's Graph API.
 *
 * Deliberately the only place in the module that talks to Facebook, so the token
 * handling, error classification and character limits live in one file. Tokens
 * come from the channel row, never from the environment, so a brand can be
 * connected from the panel without a deploy.
 */
@Injectable()
export class FacebookApiService {
  private readonly logger = new Logger(FacebookApiService.name);

  private token(channel: AutomationChannel): string {
    const token = String(channel?.page_access_token ?? '').trim();
    if (!token) {
      throw new GraphApiError(
        `Channel "${channel?.name}" has no page access token configured`,
        null,
        null,
        null,
        false,
      );
    }
    return token;
  }

  /** Turns an axios failure into a GraphApiError carrying a retry verdict. */
  private toGraphError(error: unknown, context: string): GraphApiError {
    const axiosError = error as AxiosError<any>;
    const status = axiosError?.response?.status ?? null;
    const graphError = axiosError?.response?.data?.error;

    if (graphError) {
      const code = Number(graphError.code ?? NaN);
      const retryable =
        RETRYABLE_GRAPH_CODES.has(code) || (status != null && status >= 500);
      return new GraphApiError(
        `${context}: ${graphError.message || 'Graph API error'}`,
        Number.isFinite(code) ? code : null,
        graphError.error_subcode != null ? Number(graphError.error_subcode) : null,
        status,
        retryable,
        graphError.fbtrace_id ?? null,
      );
    }

    // No structured Graph error: network failure or a 5xx from the edge.
    const isNetwork =
      !axiosError?.response ||
      ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(
        String((axiosError as any)?.code || ''),
      );
    return new GraphApiError(
      `${context}: ${axiosError?.message || 'Unknown error'}`,
      null,
      null,
      status,
      isNetwork || (status != null && status >= 500),
      null,
    );
  }

  private async post<T = any>(
    path: string,
    body: Record<string, any>,
    token: string,
    context: string,
  ): Promise<T> {
    try {
      const response = await axios.post<T>(`${META_GRAPH_BASE_URL}${path}`, body, {
        params: { access_token: token },
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      throw this.toGraphError(error, context);
    }
  }

  private async get<T = any>(
    path: string,
    params: Record<string, any>,
    token: string,
    context: string,
  ): Promise<T> {
    try {
      const response = await axios.get<T>(`${META_GRAPH_BASE_URL}${path}`, {
        params: { ...params, access_token: token },
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      throw this.toGraphError(error, context);
    }
  }

  /** Trims a reply to the platform limit, cutting on a word boundary where possible. */
  static truncate(text: string, limit: number): string {
    const value = String(text ?? '').trim();
    if (value.length <= limit) return value;
    const cut = value.slice(0, limit - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
  }

  /** Confirms the stored token works and returns the page it belongs to. */
  async verifyToken(channel: AutomationChannel): Promise<{ id: string; name: string }> {
    return this.get<{ id: string; name: string }>(
      '/me',
      { fields: 'id,name' },
      this.token(channel),
      'Verify page token',
    );
  }

  /** Public reply under a comment. Returns Meta's id for the new comment. */
  async replyToComment(
    channel: AutomationChannel,
    commentId: string,
    message: string,
  ): Promise<string | null> {
    const data = await this.post<{ id?: string }>(
      `/${encodeURIComponent(commentId)}/comments`,
      { message: FacebookApiService.truncate(message, COMMENT_MAX_CHARS) },
      this.token(channel),
      `Reply to comment ${commentId}`,
    );
    return data?.id ?? null;
  }

  /**
   * One private message to a commenter, moving the conversation to the inbox.
   * Meta allows exactly one private reply per comment; a second attempt fails
   * permanently, which is why the outbox must not retry that error.
   */
  async privateReplyToComment(
    channel: AutomationChannel,
    commentId: string,
    message: string,
  ): Promise<string | null> {
    const data = await this.post<{ id?: string }>(
      `/${encodeURIComponent(commentId)}/private_replies`,
      { message: FacebookApiService.truncate(message, MESSENGER_MAX_CHARS) },
      this.token(channel),
      `Private reply to comment ${commentId}`,
    );
    return data?.id ?? null;
  }

  /** Sends a Messenger message to a page-scoped user id. */
  async sendMessage(
    channel: AutomationChannel,
    psid: string,
    text: string,
    messagingType: 'RESPONSE' | 'UPDATE' = 'RESPONSE',
  ): Promise<string | null> {
    const data = await this.post<{ message_id?: string }>(
      '/me/messages',
      {
        recipient: { id: psid },
        messaging_type: messagingType,
        message: { text: FacebookApiService.truncate(text, MESSENGER_MAX_CHARS) },
      },
      this.token(channel),
      `Send message to ${psid}`,
    );
    return data?.message_id ?? null;
  }

  /**
   * Typing indicator / read receipt. Cosmetic, so failures are swallowed —
   * a missing "typing…" bubble must never stop the actual reply.
   */
  async senderAction(
    channel: AutomationChannel,
    psid: string,
    action: 'mark_seen' | 'typing_on' | 'typing_off',
  ): Promise<void> {
    try {
      await this.post(
        '/me/messages',
        { recipient: { id: psid }, sender_action: action },
        this.token(channel),
        `Sender action ${action}`,
      );
    } catch (error: any) {
      this.logger.debug(`sender_action ${action} failed (ignored): ${error?.message}`);
    }
  }

  /** Publishes a post on the page feed. */
  async publishPost(
    channel: AutomationChannel,
    message: string,
    link?: string | null,
  ): Promise<string | null> {
    const body: Record<string, any> = { message };
    if (link) body.link = link;

    const data = await this.post<{ id?: string }>(
      `/${encodeURIComponent(channel.page_id)}/feed`,
      body,
      this.token(channel),
      'Publish page post',
    );
    return data?.id ?? null;
  }

  async hideComment(channel: AutomationChannel, commentId: string): Promise<void> {
    await this.post(
      `/${encodeURIComponent(commentId)}`,
      { is_hidden: true },
      this.token(channel),
      `Hide comment ${commentId}`,
    );
  }

  async deleteComment(channel: AutomationChannel, commentId: string): Promise<void> {
    try {
      await axios.delete(`${META_GRAPH_BASE_URL}/${encodeURIComponent(commentId)}`, {
        params: { access_token: this.token(channel) },
        timeout: 15000,
      });
    } catch (error) {
      throw this.toGraphError(error, `Delete comment ${commentId}`);
    }
  }

  /** Best-effort display name for a Messenger user. Returns null when unavailable. */
  async getUserProfile(
    channel: AutomationChannel,
    psid: string,
  ): Promise<{ name: string | null } | null> {
    try {
      const data = await this.get<{ name?: string; first_name?: string; last_name?: string }>(
        `/${encodeURIComponent(psid)}`,
        { fields: 'name,first_name,last_name' },
        this.token(channel),
        `Fetch profile ${psid}`,
      );
      const name =
        data?.name ||
        [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim() ||
        null;
      return { name: name || null };
    } catch (error: any) {
      // Profile access needs extra permissions and often fails before App Review.
      this.logger.debug(`Profile lookup failed for ${psid} (ignored): ${error?.message}`);
      return null;
    }
  }

  /**
   * Subscribes the app to this page's webhook fields. Run once per page after the
   * token is saved; `feed` carries comments, `messages` carries Messenger.
   */
  async subscribePage(
    channel: AutomationChannel,
    fields: string[] = ['feed', 'messages', 'messaging_postbacks', 'message_reactions'],
  ): Promise<boolean> {
    const data = await this.post<{ success?: boolean }>(
      `/${encodeURIComponent(channel.page_id)}/subscribed_apps`,
      { subscribed_fields: fields.join(',') },
      this.token(channel),
      'Subscribe page to webhooks',
    );
    return Boolean(data?.success);
  }

  /** Which fields the app is currently subscribed to for this page. */
  async getPageSubscriptions(channel: AutomationChannel): Promise<any> {
    return this.get(
      `/${encodeURIComponent(channel.page_id)}/subscribed_apps`,
      { fields: 'subscribed_fields' },
      this.token(channel),
      'Read page subscriptions',
    );
  }
}
