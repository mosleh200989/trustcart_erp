import { Injectable, Logger } from '@nestjs/common';
import { AutomationAiSettings } from './automation-settings.service';
import { ErpContext } from './automation-erp.service';
import { AiMessage } from './ai/ai-provider.types';
import {
  createAiProvider,
  normalizeProviderName,
  resolveModel,
} from './ai/ai-provider.factory';
import { AnthropicProvider } from './ai/anthropic.provider';

export type AiTurn = { role: 'user' | 'assistant'; text: string };

export type AiReply = {
  text: string | null;
  confidence: number;
  escalate: boolean;
  reason: string | null;
  model: string;
  usage: Record<string, any> | null;
};

/**
 * The contract we ask the model to honour. Enforced by prompt plus a defensive
 * parser — a malformed response is treated as "escalate", never as a reply.
 */
const OUTPUT_CONTRACT = `
Respond with a single JSON object and nothing else:
{
  "reply": "<the message to send, or null if you cannot answer safely>",
  "confidence": <number between 0 and 1>,
  "escalate": <true if a human should handle this instead>,
  "reason": "<short internal note explaining your decision — never shown to the customer>"
}
Set "escalate" to true and "reply" to null whenever the customer asks about a
specific order, a refund, a delivery complaint, or anything the supplied facts do
not cover. Never state a price, stock level, discount or delivery date that is not
present in the SHOP FACTS section.`.trim();

/**
 * Generates free-form replies with Claude for the messages that rules cannot answer.
 *
 * Kept behind AutomationSettings.ai.enabled and behind the rules layer, so a shop
 * running purely on keyword replies never makes an API call. The model only ever
 * sees facts fetched from our own database — it is never asked to recall a price.
 */
@Injectable()
export class AutomationAiService {
  private readonly logger = new Logger(AutomationAiService.name);

  /**
   * Why a reply cannot be generated right now, or null when it can.
   * Returned as text so the panel can say what is missing rather than just
   * refusing.
   */
  configurationError(settings: AutomationAiSettings): string | null {
    return createAiProvider(settings as any).configurationError();
  }

  /** True when the selected provider has everything it needs. */
  isConfigured(settings?: AutomationAiSettings): boolean {
    return this.configurationError((settings ?? {}) as AutomationAiSettings) === null;
  }

  /** Renders ERP rows into the plain-text fact sheet the model is allowed to quote. */
  private renderFacts(erp: ErpContext): string {
    const lines: string[] = [];

    if (erp.products.length > 0) {
      // Price only. Stock is company-internal and must never reach a customer,
      // so it is not in ProductFact at all — there is nothing here to render.
      lines.push('Products that may match the question:');
      for (const product of erp.products) {
        const price =
          product.salePrice != null
            ? `${product.salePrice} BDT (was ${product.price} BDT)`
            : `${product.price} BDT`;
        lines.push(`- ${product.name}: ${price}`);
      }
    }

    if (erp.orders.length > 0) {
      lines.push('Orders found for this customer:');
      for (const order of erp.orders) {
        lines.push(
          `- ${order.orderNumber}: status ${order.status}` +
            (order.courierStatus ? `, courier ${order.courierStatus}` : '') +
            (order.orderDate ? `, placed ${order.orderDate}` : ''),
        );
      }
    }

    if (erp.customerName) {
      lines.push(`Known customer name: ${erp.customerName}`);
    }

    return lines.length > 0 ? lines.join('\n') : 'No matching products or orders were found.';
  }

  /**
   * Pulls the JSON object out of the model's reply.
   * Anything unparseable becomes an escalation rather than a guessed reply.
   */
  private parse(raw: string, model: string, usage: Record<string, any> | null): AiReply {
    const fallback: AiReply = {
      text: null,
      confidence: 0,
      escalate: true,
      reason: 'Could not parse the model response',
      model,
      usage,
    };

    const text = String(raw ?? '').trim();
    if (!text) return fallback;

    // Tolerate a fenced block or stray prose around the object.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return fallback;

    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : null;
      const confidence = Number(parsed.confidence);

      return {
        text: reply || null,
        confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0,
        escalate: Boolean(parsed.escalate) || !reply,
        reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 250) : null,
        model,
        usage,
      };
    } catch {
      return fallback;
    }
  }

  async generateReply(options: {
    settings: AutomationAiSettings;
    persona?: string | null;
    channelName: string;
    incomingText: string;
    history: AiTurn[];
    erp: ErpContext;
    threadType: 'comment' | 'message';
  }): Promise<AiReply> {
    const { settings, persona, channelName, incomingText, history, erp, threadType } = options;
    const provider = createAiProvider(settings as any);
    const model = resolveModel(settings as any);

    const configError = provider.configurationError();
    if (configError) {
      return { text: null, confidence: 0, escalate: true, reason: configError, model, usage: null };
    }

    const system = [
      settings.system_prompt,
      persona ? `Brand voice for ${channelName}: ${persona}` : `You are replying for ${channelName}.`,
      threadType === 'comment'
        ? 'This is a public comment under a Facebook post — anyone can read your reply. Keep it short and never repeat personal details.'
        : 'This is a private Messenger conversation.',
      '--- SHOP FACTS (the only facts you may state) ---',
      this.renderFacts(erp),
      '--- END SHOP FACTS ---',
      OUTPUT_CONTRACT,
    ].join('\n\n');

    const messages: AiMessage[] = [
      ...history.map((turn) => ({ role: turn.role, content: turn.text })),
      { role: 'user' as const, content: incomingText },
    ];

    try {
      const response = await provider.complete({
        system,
        messages,
        model,
        maxTokens: Number(settings.max_tokens) || 1024,
        effort: settings.effort,
        jsonMode: settings.json_mode !== false,
      });

      // A refusal is a decision, not a failure: hand it to a human rather than
      // retrying or sending nothing.
      if (response.refusal) {
        return {
          text: null,
          confidence: 0,
          escalate: true,
          reason: response.refusal,
          model,
          usage: response.usage,
        };
      }

      return this.parse(response.text ?? '', model, response.usage);
    } catch (error: unknown) {
      const reason =
        normalizeProviderName(settings.provider) === 'anthropic'
          ? AnthropicProvider.describeError(error)
          : ((error as Error)?.message ?? 'Unknown AI error');

      this.logger.error(`AI reply failed (${settings.provider ?? 'anthropic'}): ${reason}`);
      return { text: null, confidence: 0, escalate: true, reason, model, usage: null };
    }
  }
}
