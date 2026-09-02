import {
  createAiProvider,
  normalizeProviderName,
  resolveApiKey,
  resolveModel,
} from './ai-provider.factory';
import { AnthropicProvider } from './anthropic.provider';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import { GeminiProvider } from './gemini.provider';

/**
 * Swapping model providers has to be a configuration change, not a rewrite.
 * These tests pin the routing and, more importantly, the key resolution — a
 * mistake there either sends a key to the wrong vendor or silently falls back
 * to an unconfigured provider that then escalates every message.
 */
describe('normalizeProviderName', () => {
  it.each(['anthropic', 'openai', 'gemini', 'xai', 'custom'])('accepts %s', (name) => {
    expect(normalizeProviderName(name)).toBe(name);
  });

  it('is case-insensitive', () => {
    expect(normalizeProviderName('OpenAI')).toBe('openai');
  });

  it('falls back to anthropic for anything unrecognised', () => {
    expect(normalizeProviderName('llama-on-my-laptop')).toBe('anthropic');
    expect(normalizeProviderName(undefined)).toBe('anthropic');
    expect(normalizeProviderName(null)).toBe('anthropic');
  });
});

describe('createAiProvider', () => {
  it('routes anthropic to the SDK-backed provider', () => {
    expect(createAiProvider({ provider: 'anthropic', api_key: 'k' })).toBeInstanceOf(
      AnthropicProvider,
    );
  });

  it('routes gemini to its native provider', () => {
    expect(createAiProvider({ provider: 'gemini', api_key: 'k' })).toBeInstanceOf(GeminiProvider);
  });

  it.each(['openai', 'xai', 'custom'])('routes %s through the OpenAI-compatible provider', (p) => {
    const provider = createAiProvider({ provider: p, api_key: 'k', base_url: 'https://x/v1' });
    expect(provider).toBeInstanceOf(OpenAiCompatibleProvider);
    expect(provider.name).toBe(p);
  });

  it('reports a missing key rather than failing at call time', () => {
    delete process.env.OPENAI_API_KEY;
    const provider = createAiProvider({ provider: 'openai', api_key: null });
    expect(provider.configurationError()).toMatch(/API key/i);
  });

  it('reports a custom provider with no base URL', () => {
    const provider = createAiProvider({ provider: 'custom', api_key: 'k', base_url: '' });
    expect(provider.configurationError()).toMatch(/base URL/i);
  });

  it('is usable once a key is present', () => {
    const provider = createAiProvider({ provider: 'xai', api_key: 'k' });
    expect(provider.configurationError()).toBeNull();
  });
});

describe('resolveApiKey', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('prefers the key entered in the panel', () => {
    process.env.OPENAI_API_KEY = 'from-env';
    expect(resolveApiKey({ provider: 'openai', api_key: 'from-panel' })).toBe('from-panel');
  });

  it('falls back to the provider-specific environment variable', () => {
    process.env.OPENAI_API_KEY = 'from-env';
    expect(resolveApiKey({ provider: 'openai', api_key: null })).toBe('from-env');
  });

  it('reads the right variable for each provider, never another vendor key', () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-key';
    process.env.GEMINI_API_KEY = 'gemini-key';
    process.env.XAI_API_KEY = 'xai-key';

    expect(resolveApiKey({ provider: 'anthropic' })).toBe('anthropic-key');
    expect(resolveApiKey({ provider: 'gemini' })).toBe('gemini-key');
    expect(resolveApiKey({ provider: 'xai' })).toBe('xai-key');
  });

  it('returns empty rather than borrowing a key when its own is unset', () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-key';
    delete process.env.GEMINI_API_KEY;
    expect(resolveApiKey({ provider: 'gemini' })).toBe('');
  });
});

describe('resolveModel', () => {
  it('uses the configured model when there is one', () => {
    expect(resolveModel({ provider: 'openai', model: 'gpt-4o-mini' })).toBe('gpt-4o-mini');
  });

  it.each([
    ['anthropic', 'claude-opus-5'],
    ['openai', 'gpt-4o'],
    ['gemini', 'gemini-2.0-flash'],
    ['xai', 'grok-2-latest'],
  ])('falls back to a sensible default for %s', (provider, expected) => {
    expect(resolveModel({ provider })).toBe(expected);
  });

  it('does not carry a model across a provider switch', () => {
    // Leaving claude-opus-5 selected after switching to OpenAI would 404 at
    // call time; blanking the field is the documented way to get the default.
    expect(resolveModel({ provider: 'openai', model: '' })).toBe('gpt-4o');
  });
});
