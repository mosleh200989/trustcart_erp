import axios from 'axios';

import { BACKEND_API_BASE_URL } from '@/config/backend';

/**
 * API client for the Automation panel.
 *
 * A separate axios instance from the main `apiClient` because every call carries
 * a second credential: the short-lived panel unlock token. Keeping it out of the
 * global client means an ordinary admin request can never accidentally present it.
 */

const AUTH_TOKEN_KEY = 'authToken';
/** Session storage, not local: the unlock dies with the browser tab. */
export const AUTOMATION_TOKEN_KEY = 'automationPanelToken';
export const AUTOMATION_TOKEN_EXPIRY_KEY = 'automationPanelTokenExpiry';

export function getAutomationToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = sessionStorage.getItem(AUTOMATION_TOKEN_KEY);
    const expiry = sessionStorage.getItem(AUTOMATION_TOKEN_EXPIRY_KEY);
    if (!token) return null;

    // Drop it locally the moment it expires, so the UI shows the password screen
    // instead of firing a request that is certain to come back 403.
    if (expiry && new Date(expiry).getTime() <= Date.now()) {
      clearAutomationToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function setAutomationToken(token: string, expiresAt: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(AUTOMATION_TOKEN_KEY, token);
    sessionStorage.setItem(AUTOMATION_TOKEN_EXPIRY_KEY, expiresAt);
  } catch {
    // sessionStorage can be blocked; the panel then simply re-asks each load.
  }
}

export function clearAutomationToken(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(AUTOMATION_TOKEN_KEY);
    sessionStorage.removeItem(AUTOMATION_TOKEN_EXPIRY_KEY);
  } catch {
    // ignore
  }
}

const automationClient = axios.create({
  baseURL: BACKEND_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    Accept: 'application/json; charset=utf-8',
  },
});

automationClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (authToken) config.headers.Authorization = `Bearer ${authToken}`;

      const panelToken = getAutomationToken();
      if (panelToken) config.headers['x-automation-token'] = panelToken;
    } catch {
      // storage may be unavailable
    }
  }
  return config;
});

/** True when the backend says the panel is locked rather than the user unauthorised. */
export function isAutomationLocked(error: any): boolean {
  return error?.response?.status === 403 && error?.response?.data?.code === 'AUTOMATION_LOCKED';
}

automationClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // A stale token is worth discarding immediately so the next render shows the
    // password screen instead of looping on failed requests. The event tells
    // AutomationLayout to swap straight back to the password form.
    if (isAutomationLocked(error)) {
      clearAutomationToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('automation:locked'));
      }
    }
    return Promise.reject(error);
  },
);

export default automationClient;

// ─── Types ─────────────────────────────────────────────────────────────────

export type AutomationChannel = {
  id: number;
  name: string;
  platform: 'facebook' | 'instagram';
  page_id: string;
  ig_account_id: string | null;
  storefront_id: number | null;
  storefront_name?: string | null;
  mode: 'off' | 'shadow' | 'live';
  reply_to_comments: boolean;
  reply_to_messages: boolean;
  private_reply_to_comments: boolean;
  persona: string | null;
  greeting: string | null;
  signature: string | null;
  max_replies_per_thread_hour: number;
  business_hours: Record<string, any>;
  is_active: boolean;
  has_token: boolean;
  last_event_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AutomationRule = {
  id: number;
  channel_id: number | null;
  name: string;
  match_type: 'contains' | 'equals' | 'starts_with' | 'regex';
  patterns: string[];
  applies_to: 'comment' | 'message' | 'both';
  action: 'reply' | 'escalate' | 'ignore' | 'ai';
  reply_text: string | null;
  private_reply_text: string | null;
  priority: number;
  stop_on_match: boolean;
  is_active: boolean;
  hit_count: number;
  last_hit_at: string | null;
};

export type AutomationConversation = {
  id: number;
  channel_id: number;
  thread_type: 'comment' | 'message';
  thread_key: string;
  psid: string | null;
  post_id: string | null;
  customer_id: number | null;
  display_name: string | null;
  status: 'bot' | 'needs_human' | 'human' | 'closed';
  escalation_reason: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  message_count: number;
  updated_at: string;
};

export type AutomationMessage = {
  id: number;
  conversation_id: number;
  channel_id: number;
  direction: 'inbound' | 'outbound';
  kind: string;
  external_id: string | null;
  text: string | null;
  source: string | null;
  rule_id: number | null;
  confidence: number | null;
  shadow: boolean;
  status: 'pending' | 'sent' | 'failed' | 'held';
  error: string | null;
  ai_model: string | null;
  meta: Record<string, any> | null;
  created_at: string;
};

export type AutomationEvent = {
  id: number;
  channel_id: number | null;
  platform: string;
  page_id: string | null;
  event_type: string;
  meta_event_id: string;
  signature_valid: boolean;
  status: 'received' | 'handled' | 'skipped' | 'failed';
  skip_reason: string | null;
  payload: Record<string, any>;
  error: string | null;
  received_at: string;
  processed_at: string | null;
};

export type AutomationOutboxRow = {
  id: number;
  channel_id: number;
  conversation_id: number | null;
  message_id: number | null;
  action: string;
  payload: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  external_id: string | null;
  created_at: string;
  sent_at: string | null;
};

export type AutomationAuditRow = {
  id: number;
  user_id: number | null;
  user_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  ip: string | null;
  created_at: string;
};

export type AutomationSettings = {
  global: {
    enabled: boolean;
    kill_switch: boolean;
    default_mode: 'off' | 'shadow' | 'live';
    verify_signature: boolean;
    log_retention_days: number;
    typing_indicator: boolean;
    mark_seen: boolean;
    fallback_action: 'escalate' | 'ignore';
    product_statuses: string[];
    require_panel_password: boolean;
  };
  ai: {
    enabled: boolean;
    model: string;
    effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    max_tokens: number;
    min_confidence: number;
    history_turns: number;
    system_prompt: string;
  };
  escalation: {
    keywords: string[];
    escalate_on_order_number: boolean;
    escalate_on_phone_number: boolean;
    create_support_ticket: boolean;
  };
  gate: {
    password_set: boolean;
    session_minutes: number;
    max_attempts: number;
    lockout_minutes: number;
  };
};

export type AutomationOverview = {
  settings: AutomationSettings;
  channels: AutomationChannel[];
  counters: {
    events_24h: number;
    handled_24h: number;
    skipped_24h: number;
    failed_24h: number;
    replies_24h: number;
    held_total: number;
    needs_human: number;
    outbox_pending: number;
    outbox_failed: number;
    active_rules: number;
  };
  last_event_at: string | null;
  webhook: {
    callback_path: string;
    verify_token_configured: boolean;
    app_secret_configured: boolean;
    ai_key_configured: boolean;
  };
};

// ─── Endpoints ─────────────────────────────────────────────────────────────

export const automationGate = {
  async status(): Promise<{
    required: boolean;
    configured: boolean;
    locked: boolean;
    locked_until: string | null;
    attempts_remaining: number;
    session_minutes: number;
  }> {
    const res = await automationClient.get('/automation/gate/status');
    return res.data;
  },
  async unlock(password: string) {
    const res = await automationClient.post('/automation/gate/unlock', { password });
    if (res.data?.token) setAutomationToken(res.data.token, res.data.expiresAt);
    return res.data;
  },
  async setPassword(newPassword: string, currentPassword?: string) {
    const res = await automationClient.post('/automation/gate/password', {
      new_password: newPassword,
      ...(currentPassword ? { current_password: currentPassword } : {}),
    });
    return res.data;
  },
  async resetPassword() {
    const res = await automationClient.delete('/automation/gate/password');
    return res.data;
  },
  lock() {
    clearAutomationToken();
  },
};

export const automation = {
  async overview(): Promise<AutomationOverview> {
    const res = await automationClient.get('/automation/overview');
    return res.data;
  },

  async getSettings(): Promise<AutomationSettings> {
    const res = await automationClient.get('/automation/settings');
    return res.data;
  },
  async updateSettings(section: 'global' | 'ai' | 'escalation', patch: Record<string, any>) {
    const res = await automationClient.put(`/automation/settings/${section}`, { patch });
    return res.data;
  },
  async setKillSwitch(on: boolean) {
    const res = await automationClient.post(`/automation/kill-switch?on=${on ? 'true' : 'false'}`);
    return res.data;
  },

  async listChannels(): Promise<AutomationChannel[]> {
    const res = await automationClient.get('/automation/channels');
    return Array.isArray(res.data) ? res.data : [];
  },
  async createChannel(data: Record<string, any>): Promise<AutomationChannel> {
    const res = await automationClient.post('/automation/channels', data);
    return res.data;
  },
  async updateChannel(id: number, data: Record<string, any>): Promise<AutomationChannel> {
    const res = await automationClient.put(`/automation/channels/${id}`, data);
    return res.data;
  },
  async deleteChannel(id: number) {
    const res = await automationClient.delete(`/automation/channels/${id}`);
    return res.data;
  },
  async verifyChannel(id: number) {
    const res = await automationClient.post(`/automation/channels/${id}/verify`);
    return res.data;
  },
  async subscribeChannel(id: number, fields?: string[]) {
    const res = await automationClient.post(`/automation/channels/${id}/subscribe`,
      fields ? { fields } : {});
    return res.data;
  },
  async publishPost(id: number, message: string, link?: string) {
    const res = await automationClient.post(`/automation/channels/${id}/post`, {
      message,
      ...(link ? { link } : {}),
    });
    return res.data;
  },

  async listRules(channelId?: number): Promise<AutomationRule[]> {
    const res = await automationClient.get('/automation/rules', {
      params: channelId ? { channel_id: channelId } : undefined,
    });
    return Array.isArray(res.data) ? res.data : [];
  },
  async createRule(data: Record<string, any>): Promise<AutomationRule> {
    const res = await automationClient.post('/automation/rules', data);
    return res.data;
  },
  async updateRule(id: number, data: Record<string, any>): Promise<AutomationRule> {
    const res = await automationClient.put(`/automation/rules/${id}`, data);
    return res.data;
  },
  async deleteRule(id: number) {
    const res = await automationClient.delete(`/automation/rules/${id}`);
    return res.data;
  },
  async testRules(channelId: number, text: string, threadType: 'comment' | 'message') {
    const res = await automationClient.post('/automation/rules/test', {
      channel_id: channelId,
      text,
      thread_type: threadType,
    });
    return res.data;
  },

  async listConversations(params: Record<string, any> = {}): Promise<{
    rows: AutomationConversation[];
    total: number;
  }> {
    const res = await automationClient.get('/automation/conversations', { params });
    return res.data;
  },
  async getConversation(id: number): Promise<{
    conversation: AutomationConversation;
    messages: AutomationMessage[];
  }> {
    const res = await automationClient.get(`/automation/conversations/${id}`);
    return res.data;
  },
  async reply(id: number, text: string) {
    const res = await automationClient.post(`/automation/conversations/${id}/reply`, { text });
    return res.data;
  },
  async setConversationStatus(id: number, status: string) {
    const res = await automationClient.put(`/automation/conversations/${id}/status`, { status });
    return res.data;
  },

  async listHeldMessages(limit = 50): Promise<AutomationMessage[]> {
    const res = await automationClient.get('/automation/held-messages', { params: { limit } });
    return Array.isArray(res.data) ? res.data : [];
  },
  async approveHeld(id: number) {
    const res = await automationClient.post(`/automation/messages/${id}/approve`);
    return res.data;
  },

  async listEvents(params: Record<string, any> = {}): Promise<{
    rows: AutomationEvent[];
    total: number;
  }> {
    const res = await automationClient.get('/automation/events', { params });
    return res.data;
  },
  async getEvent(id: number): Promise<AutomationEvent> {
    const res = await automationClient.get(`/automation/events/${id}`);
    return res.data;
  },

  async listOutbox(params: Record<string, any> = {}): Promise<{
    rows: AutomationOutboxRow[];
    total: number;
  }> {
    const res = await automationClient.get('/automation/outbox', { params });
    return res.data;
  },
  async retryOutbox(id: number) {
    const res = await automationClient.post(`/automation/outbox/${id}/retry`);
    return res.data;
  },
  async cancelOutbox(id: number) {
    const res = await automationClient.post(`/automation/outbox/${id}/cancel`);
    return res.data;
  },

  async listAudit(params: Record<string, any> = {}): Promise<{
    rows: AutomationAuditRow[];
    total: number;
  }> {
    const res = await automationClient.get('/automation/audit', { params });
    return res.data;
  },
};
