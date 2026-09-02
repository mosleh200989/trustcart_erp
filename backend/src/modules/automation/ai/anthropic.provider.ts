import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
  PROVIDER_DEFAULTS,
} from './ai-provider.types';

/**
 * Claude, through the official SDK.
 *
 * The default, and the only provider here that uses a vendor SDK rather than
 * raw HTTP — mixing the two for the same vendor is how request shapes drift out
 * of date. It is also the only one that supports adaptive thinking and the
 * effort control, which is why those live in this adapter and are ignored
 * elsewhere rather than being faked.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic' as const;
  private readonly logger = new Logger(AnthropicProvider.name);
  private client: Anthropic | null = null;

  constructor(private readonly apiKey: string) {}

  configurationError(): string | null {
    return this.apiKey
      ? null
      : `No API key. Set ${PROVIDER_DEFAULTS.anthropic.envKey} on the server, or paste a key in Settings.`;
  }

  private getClient(): Anthropic {
    if (!this.client) this.client = new Anthropic({ apiKey: this.apiKey });
    return this.client;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const response = await this.getClient().messages.create({
      model: request.model,
      max_tokens: request.maxTokens,
      system: request.system,
      thinking: { type: 'adaptive' },
      output_config: { effort: (request.effort as any) || 'low' },
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    if (response.stop_reason === 'refusal') {
      return {
        text: null,
        usage: (response.usage as any) ?? null,
        refusal: `Model declined: ${response.stop_details?.category ?? 'unknown'}`,
      };
    }

    const block = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    );

    return { text: block?.text ?? null, usage: (response.usage as any) ?? null };
  }

  /** Maps SDK exceptions to a readable reason. Most specific first. */
  static describeError(error: unknown): string {
    if (error instanceof Anthropic.BadRequestError) return `Bad request to Claude: ${error.message}`;
    if (error instanceof Anthropic.AuthenticationError) return 'Anthropic API key is invalid';
    if (error instanceof Anthropic.RateLimitError) return 'Anthropic rate limit reached';
    if (error instanceof Anthropic.APIError) return `Anthropic API error ${error.status}: ${error.message}`;
    return `Anthropic call failed: ${(error as Error)?.message}`;
  }
}
