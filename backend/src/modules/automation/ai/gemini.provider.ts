import { Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
  PROVIDER_DEFAULTS,
} from './ai-provider.types';

/**
 * Google Gemini, on its native generateContent endpoint.
 *
 * Google also publishes an OpenAI-compatible shim, which would have let the
 * OpenAI adapter cover this too. Native is used instead so the request shape is
 * ours rather than dependent on how faithfully that shim tracks the real API —
 * the differences are small and explicit here: `contents` instead of `messages`,
 * `model` instead of `assistant`, and the system prompt as `systemInstruction`.
 */
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini' as const;
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = PROVIDER_DEFAULTS.gemini.baseUrl!,
  ) {}

  configurationError(): string | null {
    return this.apiKey
      ? null
      : `No API key. Set ${PROVIDER_DEFAULTS.gemini.envKey} on the server, or paste a key in Settings.`;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const body: Record<string, any> = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: request.messages.map((m) => ({
        // Gemini calls the assistant "model"; everything else maps directly.
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        maxOutputTokens: request.maxTokens,
        ...(request.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const url =
      `${this.baseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(request.model)}:generateContent`;

    try {
      const response = await axios.post(url, body, {
        params: { key: this.apiKey },
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      });

      const candidate = response.data?.candidates?.[0];
      const finish = String(candidate?.finishReason ?? '');

      // Gemini reports a blocked prompt as a 200 with no candidate, so an
      // unchecked response reads as an empty reply rather than a refusal.
      const blockReason = response.data?.promptFeedback?.blockReason;
      if (blockReason) {
        return { text: null, usage: response.data?.usageMetadata ?? null, refusal: `Prompt blocked: ${blockReason}` };
      }
      if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT') {
        return {
          text: null,
          usage: response.data?.usageMetadata ?? null,
          refusal: `Gemini stopped for ${finish}`,
        };
      }

      const text = (candidate?.content?.parts ?? [])
        .map((p: any) => p?.text ?? '')
        .join('')
        .trim();

      return { text: text || null, usage: response.data?.usageMetadata ?? null };
    } catch (error) {
      throw new Error(GeminiProvider.describeError(error));
    }
  }

  static describeError(error: unknown): string {
    const axiosError = error as AxiosError<any>;
    const status = axiosError?.response?.status;
    const message = axiosError?.response?.data?.error?.message ?? axiosError?.message;

    if (status === 400 && /API key/i.test(String(message))) return 'Gemini API key is invalid';
    if (status === 403) return 'Gemini rejected the key or the model is not enabled for it';
    if (status === 404) return 'Gemini: model not found — check the model name';
    if (status === 429) return 'Gemini rate limit reached';
    if (status && status >= 500) return `Gemini is unavailable (${status})`;
    return `Gemini call failed: ${message ?? 'unknown error'}`;
  }
}
