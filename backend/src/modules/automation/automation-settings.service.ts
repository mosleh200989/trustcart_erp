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
};

export type AutomationAiSettings = {
  enabled: boolean;
  model: string;
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  max_tokens: number;
  /** Replies below this confidence are escalated to a human instead of sent. */
  min_confidence: number;
  /** How many previous turns of the thread to give the model. */
  history_turns: number;
  system_prompt: string;
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
  },
  ai: {
    enabled: false,
    model: 'claude-opus-5',
    effort: 'low',
    max_tokens: 1024,
    min_confidence: 0.6,
    history_turns: 8,
    system_prompt:
      'You are a polite customer-support assistant for an online shop in Bangladesh. ' +
      'Reply in the same language the customer used (Bangla, Banglish or English). ' +
      'Keep replies under 3 short sentences. Never invent prices, stock levels, discounts ' +
      'or delivery dates — use only the facts given to you. If you are unsure, or the ' +
      'customer asks about a specific order, a refund, or a complaint, escalate to a human ' +
      'instead of guessing.',
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

  /** Every section at once, for the panel's settings screen. The gate password hash is never included. */
  async getAll(): Promise<{
    global: AutomationGlobalSettings;
    ai: AutomationAiSettings;
    escalation: AutomationEscalationSettings;
    gate: Omit<AutomationGateSettings, 'password_hash'> & { password_set: boolean };
  }> {
    const [global, ai, escalation, gate] = await Promise.all([
      this.getGlobal(),
      this.getAi(),
      this.getEscalation(),
      this.getGate(),
    ]);

    const { password_hash, ...safeGate } = gate;
    return {
      global,
      ai,
      escalation,
      gate: { ...safeGate, password_set: Boolean(password_hash) },
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
