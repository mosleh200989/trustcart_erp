/**
 * A single, narrow contract every model provider is adapted to.
 *
 * The reply engine only ever needs one thing: given a system prompt and a short
 * conversation, return some text. Keeping the surface this small is what makes
 * swapping providers a configuration change rather than a rewrite — the system
 * prompt, the JSON reply contract, the confidence threshold and the escalation
 * rules are all provider-agnostic and live above this line.
 */

export type AiProviderName = 'anthropic' | 'openai' | 'gemini' | 'xai' | 'custom';

export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AiCompletionRequest = {
  system: string;
  messages: AiMessage[];
  model: string;
  maxTokens: number;
  /** Anthropic-only depth control. Other providers ignore it. */
  effort?: string;
  /** Ask the provider to guarantee JSON, where it supports doing so. */
  jsonMode?: boolean;
};

export type AiCompletionResult = {
  /** Raw text. The caller parses the JSON contract out of it. */
  text: string | null;
  usage: Record<string, any> | null;
  /** Set when the provider declined rather than failed. Treated as an escalation. */
  refusal?: string | null;
};

export interface AiProvider {
  readonly name: AiProviderName;
  /** Human-readable reason when not usable, for surfacing in the panel. */
  configurationError(): string | null;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}

/** Where each hosted provider lives, and a sensible default model for it. */
export const PROVIDER_DEFAULTS: Record<
  AiProviderName,
  { baseUrl: string | null; defaultModel: string; envKey: string; label: string }
> = {
  anthropic: {
    baseUrl: null,
    defaultModel: 'claude-opus-5',
    envKey: 'ANTHROPIC_API_KEY',
    label: 'Anthropic (Claude)',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    envKey: 'OPENAI_API_KEY',
    label: 'OpenAI',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    envKey: 'GEMINI_API_KEY',
    label: 'Google Gemini',
  },
  xai: {
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-latest',
    envKey: 'XAI_API_KEY',
    label: 'xAI (Grok)',
  },
  custom: {
    baseUrl: null,
    defaultModel: '',
    envKey: 'AI_API_KEY',
    label: 'Other OpenAI-compatible endpoint',
  },
};
