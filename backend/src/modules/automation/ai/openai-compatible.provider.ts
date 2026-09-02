import { Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
  AiProviderName,
} from './ai-provider.types';

/**
 * Anything that speaks the OpenAI chat-completions shape.
 *
 * That is OpenAI itself, xAI (Grok), Groq, Together, OpenRouter, DeepSeek,
 * Fireworks and a local Ollama — one adapter covers all of them, because the
 * request and response shapes are identical and only the base URL and model
 * name differ. Hence a single "custom" option with a base URL field rather than
 * a growing list of near-identical classes.
 *
 * The system prompt becomes a leading `system` message; everything else maps
 * across unchanged.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);

  constructor(
    readonly name: AiProviderName,
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  configurationError(): string | null {
    if (!this.apiKey) return 'No API key. Paste one in Settings, or set the provider env var.';
    if (!this.baseUrl) return 'No base URL configured for this provider.';
    return null;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const body: Record<string, any> = {
      model: request.model,
      max_tokens: request.maxTokens,
      messages: [
        { role: 'system', content: request.system },
        ...request.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    };

    // Widely supported and materially improves how reliably the JSON contract
    // comes back. Switchable, because a few niche endpoints reject the field.
    if (request.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`,
        body,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        },
      );

      const choice = response.data?.choices?.[0];
      const finish = String(choice?.finish_reason ?? '');

      // OpenAI-style refusals arrive as a field on the message, not an error.
      const refusal = choice?.message?.refusal;
      if (refusal) {
        return { text: null, usage: response.data?.usage ?? null, refusal: String(refusal) };
      }
      if (finish === 'content_filter') {
        return {
          text: null,
          usage: response.data?.usage ?? null,
          refusal: 'Provider content filter blocked the reply',
        };
      }

      return {
        text: choice?.message?.content ?? null,
        usage: response.data?.usage ?? null,
      };
    } catch (error) {
      throw new Error(OpenAiCompatibleProvider.describeError(error, this.name));
    }
  }

  static describeError(error: unknown, provider: string): string {
    const axiosError = error as AxiosError<any>;
    const status = axiosError?.response?.status;
    const message =
      axiosError?.response?.data?.error?.message ??
      axiosError?.response?.data?.message ??
      axiosError?.message;

    if (status === 401) return `${provider} API key is invalid`;
    if (status === 404) return `${provider}: model not found — check the model name`;
    if (status === 429) return `${provider} rate limit reached`;
    if (status && status >= 500) return `${provider} is unavailable (${status})`;
    return `${provider} call failed: ${message ?? 'unknown error'}`;
  }
}
