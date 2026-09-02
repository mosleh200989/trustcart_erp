import { AiProvider, AiProviderName, PROVIDER_DEFAULTS } from './ai-provider.types';
import { AnthropicProvider } from './anthropic.provider';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import { GeminiProvider } from './gemini.provider';

export type AiProviderSettings = {
  provider?: string;
  model?: string;
  base_url?: string | null;
  /** Key entered in the panel. Takes precedence over the environment. */
  api_key?: string | null;
};

/**
 * Builds the provider named in settings.
 *
 * Key resolution is panel first, environment second. The panel exists because
 * entering a key through a form is the one path that never routes the secret
 * through a chat, a shell history or a commit; the environment variable stays
 * supported because it is the better answer for anyone deploying properly.
 */
export function resolveApiKey(settings: AiProviderSettings): string {
  const fromPanel = String(settings?.api_key ?? '').trim();
  if (fromPanel) return fromPanel;

  const name = normalizeProviderName(settings?.provider);
  const envKey = PROVIDER_DEFAULTS[name].envKey;
  return String(process.env[envKey] ?? '').trim();
}

export function normalizeProviderName(value: unknown): AiProviderName {
  const name = String(value ?? 'anthropic').toLowerCase();
  return (name in PROVIDER_DEFAULTS ? name : 'anthropic') as AiProviderName;
}

/** The model to use, falling back to the provider's sensible default. */
export function resolveModel(settings: AiProviderSettings): string {
  const explicit = String(settings?.model ?? '').trim();
  if (explicit) return explicit;
  return PROVIDER_DEFAULTS[normalizeProviderName(settings?.provider)].defaultModel;
}

export function createAiProvider(settings: AiProviderSettings): AiProvider {
  const name = normalizeProviderName(settings?.provider);
  const apiKey = resolveApiKey(settings);
  const configuredBase = String(settings?.base_url ?? '').trim();

  switch (name) {
    case 'anthropic':
      return new AnthropicProvider(apiKey);

    case 'gemini':
      return new GeminiProvider(apiKey, configuredBase || PROVIDER_DEFAULTS.gemini.baseUrl!);

    case 'openai':
    case 'xai':
      return new OpenAiCompatibleProvider(
        name,
        apiKey,
        configuredBase || PROVIDER_DEFAULTS[name].baseUrl!,
      );

    case 'custom':
    default:
      // Anything else that speaks the OpenAI shape: Groq, Together, OpenRouter,
      // DeepSeek, a local Ollama. The base URL is the only thing that differs.
      return new OpenAiCompatibleProvider('custom', apiKey, configuredBase);
  }
}
