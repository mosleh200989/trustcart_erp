import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationSetting } from './entities/automation-setting.entity';

export type AutomationGlobalSettings = {
  /** Master on/off for the whole automation system. */
  enabled: boolean;
  /** Emergency brake — stops all outgoing replies without changing anything else. */
  kill_switch: boolean;
  /** Mode applied to newly created channels. */
  default_mode: 'off' | 'shadow' | 'live';
  /** Reject webhook events whose X-Hub-Signature-256 does not verify. */
  verify_signature: boolean;
  /** Events/messages older than this are pruned by the nightly sweep. 0 = keep forever. */
  log_retention_days: number;
  typing_indicator: boolean;
  mark_seen: boolean;
  /**
   * What to do with a message no rule matched when the AI layer is off.
   * `escalate` puts it in the panel inbox; `ignore` drops it silently, which is
   * usually what a busy public comment thread wants.
   */
  fallback_action: 'escalate' | 'ignore';
  /**
   * Which `products.status` values the bot may quote from.
   *
   * Includes `inactive` by default: in this catalogue that means "not listed on
   * the main site", not "discontinued" — most products carry it, many still have
   * stock, and ads run against them, so customers ask and the bot must answer.
   * Narrow this list if a status ever comes to mean genuinely unsellable.
   */
  product_statuses: string[];
  /**
   * Whether the panel asks for its own password on top of the admin login.
   *
   * Off by default. The panel is already behind the admin login and the
   * `view-automation` permission; the extra password is a re-authentication step
   * for teams who want one, not a load-bearing control. Turn it on in Settings
   * if you want an unattended admin session to be insufficient here.
   */
  require_panel_password: boolean;
  /**
   * Human-paced replying. An instant answer is the clearest possible signal
   * that a machine is talking, so a reply is generated immediately but held
   * before sending, scaled by how long it would plausibly take to type.
   */
  reply_delay_enabled: boolean;
  /** Milliseconds per character. ~80ms is a fast human typist. */
  reply_delay_ms_per_char: number;
  /** Never reply faster than this, however short the message. */
  reply_delay_min_ms: number;
  /** Never make anyone wait longer than this, however long the message. */
  reply_delay_max_ms: number;
  /**
   * Whether a confident FAQ match answers on its own, without the AI.
   *
   * On by default, and the only reason the FAQ layer does anything while the
   * AI is switched off. Turn it off to keep FAQs as prompt facts only.
   */
  faq_direct_reply: boolean;
  /**
   * How strong a match has to be before a stated answer is sent.
   *
   * At the default, one multi-word keyword is enough on its own, but a single
   * shared word is not — "delivery" alone fits both "delivery koto din" and
   * "delivery charge koto", and answering the wrong one is worse than asking a
   * human. Below this the message carries on to the AI or the fallback.
   */
  faq_min_score: number;
  /**
   * How many answers are pasted into the AI prompt. Capped because this rides
   * on every message: an unbounded list makes every reply more expensive as
   * the panel fills up.
   */
  faq_max_in_prompt: number;
};

export type AutomationAiSettings = {
  enabled: boolean;
  /** anthropic | openai | gemini | xai | custom. Claude is the default. */
  provider: string;
  /** Only for `custom`, or to point a hosted provider at a proxy. */
  base_url: string | null;
  /**
   * API key entered through the panel. Never returned by the API. Falls back to
   * the provider's environment variable when empty.
   */
  api_key: string | null;
  /** Ask the provider to guarantee JSON. Turn off if yours rejects the field. */
  json_mode: boolean;
  model: string;
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  max_tokens: number;
  /** Replies below this confidence are escalated to a human instead of sent. */
  min_confidence: number;
  /** How many previous turns of the thread to give the model. */
  history_turns: number;
  /**
   * Whether the starred replies from the history import are pasted into the
   * system prompt as a voice sample.
   *
   * They teach shape, never truth: every figure in them was removed at import
   * because it was already stale. Turn this off to fall back on the written
   * persona alone.
   */
  style_examples_enabled: boolean;
  /** How many starred replies to include. These ride on every message. */
  max_style_examples: number;
  system_prompt: string;
};

/**
 * Taking an order in the thread.
 *
 * Off by default. Everything else in this panel can only produce words; this
 * one creates a row in sales_orders, so it is opt-in the way live mode is.
 */
export type AutomationOrderSettings = {
  enabled: boolean;
  /** Charges quoted in the read-back and written onto the order. */
  delivery_charge_inside_dhaka: number;
  delivery_charge_outside_dhaka: number;
  /**
   * Words that count as agreeing to the read-back. Matched as substrings, so
   * "confirm" also catches "ok confirm korlam".
   */
  confirm_words: string[];
  /** Words that abandon the draft. */
  cancel_words: string[];
};

export type AutomationEscalationSettings = {
  keywords: string[];
  escalate_on_order_number: boolean;
  escalate_on_phone_number: boolean;
  create_support_ticket: boolean;
};

export type AutomationGateSettings = {
  password_hash: string | null;
  session_minutes: number;
  max_attempts: number;
  lockout_minutes: number;
  failed_attempts: number;
  locked_until: string | null;
};

const DEFAULTS: {
  global: AutomationGlobalSettings;
  ai: AutomationAiSettings;
  escalation: AutomationEscalationSettings;
  gate: AutomationGateSettings;
  order: AutomationOrderSettings;
} = {
  global: {
    enabled: false,
    kill_switch: false,
    default_mode: 'shadow',
    verify_signature: true,
    log_retention_days: 90,
    typing_indicator: true,
    mark_seen: true,
    fallback_action: 'escalate',
    product_statuses: ['active', 'inactive'],
    require_panel_password: false,
    reply_delay_enabled: true,
    reply_delay_ms_per_char: 80,
    reply_delay_min_ms: 3000,
    reply_delay_max_ms: 25000,
    faq_direct_reply: true,
    faq_min_score: 0.75,
    faq_max_in_prompt: 20,
  },
  ai: {
    enabled: false,
    provider: 'anthropic',
    base_url: null,
    api_key: null,
    json_mode: true,
    model: 'claude-opus-5',
    effort: 'low',
    max_tokens: 1024,
    min_confidence: 0.6,
    history_turns: 8,
    style_examples_enabled: true,
    max_style_examples: 24,
    system_prompt:
      'You are a polite customer-support assistant for an online shop in Bangladesh. ' +
      'Reply in the same language the customer used (Bangla, Banglish or English). ' +
      'Keep replies under 3 short sentences. Never invent prices, discounts or delivery ' +
      'dates — use only the facts given to you. Never discuss stock, inventory or ' +
      'availability, and never say a product is out of stock or unavailable: treat every ' +
      'product in SHOP FACTS as available to order. If you are unsure, or the customer asks ' +
      'about a specific order, a refund, or a complaint, escalate to a human instead of guessing.',
  },
  order: {
    enabled: false,
    delivery_charge_inside_dhaka: 60,
    delivery_charge_outside_dhaka: 110,
    confirm_words: ['confirm', 'কনফার্ম', 'কনফার্ম করুন', 'ok korun', 'হ্যাঁ', 'জি', 'ji'],
    cancel_words: ['cancel', 'বাতিল', 'lagbe na', 'লাগবে না', 'nibo na', 'নিব না'],
  },
  escalation: {
    keywords: [
      'refund',
      'complain',
      'complaint',
      'fraud',
      'police',
      'lawyer',
      'manager',
      'taka ferot',
      'ferot dibo',
      'return korbo',
      'vul product',
      'kharap',
    ],
    escalate_on_order_number: true,
    escalate_on_phone_number: true,
    create_support_ticket: true,
  },
  gate: {
    password_hash: null,
    session_minutes: 30,
    max_attempts: 5,
    lockout_minutes: 15,
    failed_attempts: 0,
    locked_until: null,
  },
};

/**
 * Reads and writes the Automation panel's settings.
 *
 * Values are stored as jsonb keyed by section, and every read is merged over the
 * defaults above. That means a section added in code works immediately against an
 * older database row — no migration needed to introduce a new knob, which is what
 * "everything should be configurable from the panel" requires in practice.
 *
 * Reads are cached for a few seconds because the webhook path touches them on
 * every event; any write clears the cache immediately.
 */
@Injectable()
export class AutomationSettingsService {
  private readonly logger = new Logger(AutomationSettingsService.name);
  private cache = new Map<string, { value: any; expiresAt: number }>();
  private static readonly CACHE_MS = 5000;

  constructor(
    @InjectRepository(AutomationSetting)
    private readonly settingsRepository: Repository<AutomationSetting>,
  ) {}

  private async readSection<T>(key: string, defaults: T): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    let stored: Record<string, any> = {};
    try {
      const row = await this.settingsRepository.findOne({ where: { key } });
      stored = (row?.value as Record<string, any>) || {};
    } catch (error: any) {
      // A missing table (migration not run yet) must not take the webhook down.
      this.logger.warn(
        `Could not read automation settings section "${key}": ${error?.message}. Using defaults.`,
      );
    }

    const merged = { ...(defaults as any), ...stored } as T;
    this.cache.set(key, {
      value: merged,
      expiresAt: Date.now() + AutomationSettingsService.CACHE_MS,
    });
    return merged;
  }

  getGlobal(): Promise<AutomationGlobalSettings> {
    return this.readSection('global', DEFAULTS.global);
  }

  getAi(): Promise<AutomationAiSettings> {
    return this.readSection('ai', DEFAULTS.ai);
  }

  getEscalation(): Promise<AutomationEscalationSettings> {
    return this.readSection('escalation', DEFAULTS.escalation);
  }

  getGate(): Promise<AutomationGateSettings> {
    return this.readSection('gate', DEFAULTS.gate);
  }

  getOrder(): Promise<AutomationOrderSettings> {
    return this.readSection('order', DEFAULTS.order);
  }

  /** Every section at once, for the panel's settings screen. The gate password hash is never included. */
  async getAll(): Promise<{
    global: AutomationGlobalSettings;
    ai: AutomationAiSettings;
    escalation: AutomationEscalationSettings;
    gate: Omit<AutomationGateSettings, 'password_hash'> & { password_set: boolean };
    order: AutomationOrderSettings;
  }> {
    const [global, ai, escalation, gate, order] = await Promise.all([
      this.getGlobal(),
      this.getAi(),
      this.getEscalation(),
      this.getGate(),
      this.getOrder(),
    ]);

    const { password_hash, ...safeGate } = gate;
    // The provider key is write-only, exactly like the panel password hash and
    // the page access token: it goes in through a form and never comes back out.
    const { api_key, ...safeAi } = ai;
    return {
      global,
      ai: { ...safeAi, api_key_set: Boolean(api_key) } as any,
      escalation,
      gate: { ...safeGate, password_set: Boolean(password_hash) },
      order,
    };
  }

  /** Shallow-merges `patch` into the section and returns the merged result. */
  async update<T extends Record<string, any>>(
    key: string,
    patch: Partial<T>,
    userId?: number | null,
  ): Promise<T> {
    const existing = await this.settingsRepository.findOne({ where: { key } });
    const nextValue = { ...((existing?.value as any) || {}), ...patch };

    if (existing) {
      existing.value = nextValue;
      existing.updated_by = userId ?? null;
      await this.settingsRepository.save(existing);
    } else {
      await this.settingsRepository.save(
        this.settingsRepository.create({
          key,
          value: nextValue,
          updated_by: userId ?? null,
        }),
      );
    }

    this.cache.delete(key);
    return this.readSection(key, (DEFAULTS as any)[key] || {}) as Promise<T>;
  }

  /** Drops the read cache. Used after a write made outside `update()`. */
  invalidate(key?: string): void {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }

  /** True when automation is on and the kill switch is not engaged. */
  async isOperational(): Promise<boolean> {
    const global = await this.getGlobal();
    return Boolean(global.enabled) && !global.kill_switch;
  }
}
