import { Injectable, Logger } from '@nestjs/common';
import { AutomationAiSettings } from './automation-settings.service';
import { ErpContext } from './automation-erp.service';
import { FaqFact } from './automation-faq.service';
import { StyleExample } from './history/history-curation.service';
import { AiMessage } from './ai/ai-provider.types';
import {
  createAiProvider,
  normalizeProviderName,
  resolveModel,
} from './ai/ai-provider.factory';
import { AnthropicProvider } from './ai/anthropic.provider';

export type AiTurn = { role: 'user' | 'assistant'; text: string };

/**
 * What we ask the model to pull out of an order conversation.
 *
 * Extraction only — the model never decides that an order should be placed,
 * only reports what the customer has said so far. Deciding is the reply
 * brain's job, and placing is gated on an explicit confirmation from a person.
 */
const ORDER_EXTRACTION_CONTRACT = `
Read the conversation and report ONLY what the customer has actually stated.
Respond with a single JSON object and nothing else:
{
  "wants_to_order": <true if the customer is trying to buy something>,
  "product_id": <the id from CANDIDATE PRODUCTS they chose, or null>,
  "quantity": <a positive whole number, or null>,
  "customer_name": <their name, or null>,
  "phone": <their mobile number exactly as they typed it, or null>,
  "address": <their full delivery address, or null>,
  "district": <the district only, or null>
}
Rules:
- Never invent a value. If they have not said it, the field is null.
- Only use a product_id that appears in CANDIDATE PRODUCTS. If they named
  something not on that list, product_id is null.
- Do not carry over a value the customer has since corrected.
- A phone number is theirs only if they gave it as their own contact number.
`.trim();

export type OrderExtraction = {
  wantsToOrder: boolean;
  productId: number | null;
  quantity: number | null;
  customerName: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
};


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

  /**
   * Renders the fact sheet the model is allowed to quote.
   *
   * Two sources, both ours: live ERP rows for anything that changes, and the
   * hand-written FAQ answers for policy that lives in no table. Without the
   * second half the model had nothing grounded to say about delivery time,
   * coverage or how to order — the most common questions on the page — so the
   * only correct behaviour left to it was to escalate every one of them.
   */
  private renderFacts(erp: ErpContext, faqs: FaqFact[]): string {
    const lines: string[] = [];

    if (erp.products.length > 0) {
      // Price only. Stock is company-internal and must never reach a customer,
      // so it is not in ProductFact at all — there is nothing here to render.
      lines.push(
        erp.productsAreFeatured
          ? 'The customer did not name a product. These are the products this page sells — ' +
              'offer them and ask which one they want, rather than assuming:'
          : 'Products that may match the question:',
      );
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

    if (faqs.length > 0) {
      lines.push('');
      lines.push('Shop policy, written by the team. Answer from these, in your own words:');
      for (const faq of faqs) {
        lines.push(`- Q: ${faq.question}`);
        lines.push(`  A: ${faq.answer.replace(/\n+/g, ' ')}`);
      }
    }

    return lines.length > 0
      ? lines.join('\n')
      : 'No matching products, orders or policy answers were found.';
  }

  /**
   * Renders the starred replies as a voice sample.
   *
   * This is the half of the grounding split that carries no truth at all. Every
   * figure in these messages was removed at import because it was already
   * stale, so the block has to say plainly what to copy and what to ignore —
   * a model shown "eta [PRICE] tk" and told nothing will cheerfully send a
   * customer the literal word [PRICE].
   */
  private renderStyle(examples: StyleExample[]): string {
    const lines = [
      'Real replies our agents sent, kept only as a sample of how we write.',
      'Copy the greeting, the tone, the sentence length and the formatting.',
      'Do NOT copy anything factual from them: every number was deleted at',
      'import because it was out of date, and [PRICE], [PHONE] and the like are',
      'holes where a figure used to be. Never write a placeholder in a reply —',
      'real numbers come from SHOP FACTS and nowhere else.',
      '',
    ];

    examples.forEach((example, index) => {
      // Indent continuation lines so a multi-line reply stays visibly one item.
      lines.push(`${index + 1}. ${example.text.replace(/\n+/g, '\n   ')}`);
    });

    return lines.join('\n');
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
    faqs?: FaqFact[];
    styleExamples?: StyleExample[];
    threadType: 'comment' | 'message';
  }): Promise<AiReply> {
    const { settings, persona, channelName, incomingText, history, erp, threadType } = options;
    const faqs = options.faqs ?? [];
    const styleExamples = options.styleExamples ?? [];
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
      this.renderFacts(erp, faqs),
      '--- END SHOP FACTS ---',
      styleExamples.length > 0
        ? [
            '--- HOW OUR TEAM WRITES (voice only, never facts) ---',
            this.renderStyle(styleExamples),
            '--- END HOW OUR TEAM WRITES ---',
          ].join('\n')
        : null,
      OUTPUT_CONTRACT,
    ]
      .filter(Boolean)
      .join('\n\n');

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

  /**
   * Pulls order details out of what the customer has written.
   *
   * A separate call from the reply, deliberately: the reply is free prose and
   * this is a form. Asking one response to do both means a formatting slip in
   * the prose can corrupt an address, and an address is the field nobody
   * notices is wrong until a parcel goes to the wrong town.
   *
   * Returns null when the model cannot be reached or answers unusably, which
   * the caller treats as "learned nothing this turn" rather than as an error.
   */
  async extractOrder(options: {
    settings: AutomationAiSettings;
    history: AiTurn[];
    incomingText: string;
    candidates: Array<{ id: number; name: string; price: number; salePrice: number | null }>;
    known: Record<string, unknown>;
  }): Promise<OrderExtraction | null> {
    const { settings, history, incomingText, candidates, known } = options;
    const provider = createAiProvider(settings as any);
    if (provider.configurationError()) return null;

    const system = [
      'You extract structured order details from a Bangla/Banglish Messenger conversation for an online shop.',
      '--- CANDIDATE PRODUCTS ---',
      candidates.length > 0
        ? candidates
            .map((c) => `- id ${c.id}: ${c.name} — ${c.salePrice ?? c.price} BDT`)
            .join('\n')
        : 'None matched yet.',
      '--- ALREADY KNOWN (do not repeat unless the customer corrected it) ---',
      JSON.stringify(known),
      ORDER_EXTRACTION_CONTRACT,
    ].join('\n\n');

    try {
      const response = await provider.complete({
        system,
        messages: [
          ...history.map((turn) => ({ role: turn.role, content: turn.text })),
          { role: 'user' as const, content: incomingText },
        ],
        model: resolveModel(settings as any),
        maxTokens: 400,
        effort: 'low',
        jsonMode: settings.json_mode !== false,
      });

      const raw = String(response.text ?? '');
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end <= start) return null;

      const parsed = JSON.parse(raw.slice(start, end + 1));
      const quantity = Number(parsed.quantity);
      const productId = Number(parsed.product_id);

      const text = (value: unknown): string | null => {
        const trimmed = typeof value === 'string' ? value.trim() : '';
        return trimmed ? trimmed.slice(0, 400) : null;
      };

      return {
        wantsToOrder: Boolean(parsed.wants_to_order),
        // Only a product the caller offered. A hallucinated id would put the
        // wrong line on a real order.
        productId:
          Number.isFinite(productId) && candidates.some((c) => c.id === productId)
            ? productId
            : null,
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : null,
        customerName: text(parsed.customer_name),
        phone: text(parsed.phone),
        address: text(parsed.address),
        district: text(parsed.district),
      };
    } catch (error: any) {
      this.logger.warn(`Order extraction failed: ${error?.message ?? error}`);
      return null;
    }
  }
}

