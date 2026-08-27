import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AutomationAiSettings } from './automation-settings.service';
import { ErpContext } from './automation-erp.service';

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
  private client: Anthropic | null = null;

  /** True when an API key is available and the model can actually be called. */
  isConfigured(): boolean {
    return Boolean(String(process.env.ANTHROPIC_API_KEY ?? '').trim());
  }

  private getClient(): Anthropic {
    if (!this.client) {
      // The SDK reads ANTHROPIC_API_KEY from the environment itself.
      this.client = new Anthropic();
    }
    return this.client;
  }

  /** Renders ERP rows into the plain-text fact sheet the model is allowed to quote. */
  private renderFacts(erp: ErpContext): string {
    const lines: string[] = [];

    if (erp.products.length > 0) {
      lines.push('Products that may match the question:');
      for (const product of erp.products) {
        const price =
          product.salePrice != null
            ? `${product.salePrice} BDT (was ${product.price} BDT)`
            : `${product.price} BDT`;
        lines.push(
          `- ${product.name}: ${price}; ${product.inStock ? 'in stock' : 'out of stock'}`,
        );
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
    const model = settings.model || 'claude-opus-5';

    if (!this.isConfigured()) {
      return {
        text: null,
        confidence: 0,
        escalate: true,
        reason: 'ANTHROPIC_API_KEY is not set',
        model,
        usage: null,
      };
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

    const messages: Anthropic.MessageParam[] = [
      ...history.map((turn) => ({ role: turn.role, content: turn.text })),
      { role: 'user' as const, content: incomingText },
    ];

    try {
      const response = await this.getClient().messages.create({
        model,
        max_tokens: Number(settings.max_tokens) || 1024,
        system,
        thinking: { type: 'adaptive' },
        output_config: { effort: settings.effort || 'low' },
        messages,
      });

      if (response.stop_reason === 'refusal') {
        return {
          text: null,
          confidence: 0,
          escalate: true,
          reason: `Model declined: ${response.stop_details?.category ?? 'unknown'}`,
          model,
          usage: response.usage as any,
        };
      }

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );

      return this.parse(textBlock?.text ?? '', model, (response.usage as any) ?? null);
    } catch (error: unknown) {
      // Most specific first: a bad request is a bug in our payload, a rate limit
      // is transient, and anything else is logged for the panel to surface.
      let reason = 'Unknown AI error';
      if (error instanceof Anthropic.BadRequestError) {
        reason = `Bad request to Claude: ${error.message}`;
        this.logger.error(reason);
      } else if (error instanceof Anthropic.AuthenticationError) {
        reason = 'ANTHROPIC_API_KEY is invalid';
        this.logger.error(reason);
      } else if (error instanceof Anthropic.RateLimitError) {
        reason = 'Claude rate limit reached';
        this.logger.warn(reason);
      } else if (error instanceof Anthropic.APIError) {
        reason = `Claude API error ${error.status}: ${error.message}`;
        this.logger.error(reason);
      } else {
        this.logger.error(`AI reply failed: ${(error as Error)?.message}`);
      }

      return { text: null, confidence: 0, escalate: true, reason, model, usage: null };
    }
  }
}
