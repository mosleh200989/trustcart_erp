import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AutomationChannel } from '../entities/automation-channel.entity';
import { AutomationRule } from '../entities/automation-rule.entity';
import {
  AutomationReplySource,
  AutomationThreadTypeAlias,
} from '../automation.types';
import { AutomationSettingsService } from '../automation-settings.service';
import { AutomationErpService, ErpContext } from '../automation-erp.service';
import { AutomationAiService, AiTurn } from '../automation-ai.service';
import { AutomationFaqService } from '../automation-faq.service';
import { HistoryCurationService } from '../history/history-curation.service';
import { AutomationOrderService } from '../automation-order.service';
import { AutomationOrderDraft } from '../entities/automation-order-draft.entity';

export type ReplyDecision = {
  action: 'reply' | 'escalate' | 'ignore';
  text: string | null;
  privateText: string | null;
  source: AutomationReplySource | null;
  ruleId: number | null;
  /** The FAQ that answered, when the answer came from the FAQ layer. */
  faqId: number | null;
  confidence: number | null;
  /** Internal explanation, shown in the panel — never sent to the customer. */
  reason: string;
  aiModel: string | null;
  aiUsage: Record<string, any> | null;
  erp: ErpContext | null;
};

function ignore(reason: string): ReplyDecision {
  return {
    action: 'ignore',
    text: null,
    privateText: null,
    source: null,
    ruleId: null,
    faqId: null,
    confidence: null,
    reason,
    aiModel: null,
    aiUsage: null,
    erp: null,
  };
}

function escalate(reason: string, erp: ErpContext | null = null): ReplyDecision {
  return {
    action: 'escalate',
    text: null,
    privateText: null,
    source: null,
    ruleId: null,
    faqId: null,
    confidence: null,
    reason,
    aiModel: null,
    aiUsage: null,
    erp,
  };
}

/**
 * Decides what to say, in five layers, cheapest first:
 *
 *   1. escalation checks — complaints, refunds, order numbers: hand to a human
 *   2. keyword rules     — the top ~20 questions, free and instant
 *   3. ERP placeholders  — real prices filled into a rule's template
 *   4. FAQ answers       — stated policy, sent word for word, still no API call
 *   5. the AI            — anything left, grounded only in the facts above
 *
 * The layer order is the safety design, not just an optimisation: the expensive,
 * least predictable layer only ever sees messages the safe layers declined, and a
 * low-confidence answer from it becomes an escalation rather than a reply.
 *
 * This service decides. It never sends — sending is the event service's job — so
 * shadow mode is simply "decide, store, do not hand to the outbox".
 */
@Injectable()
export class ReplyBrainService {
  private readonly logger = new Logger(ReplyBrainService.name);

  constructor(
    @InjectRepository(AutomationRule)
    private readonly rulesRepository: Repository<AutomationRule>,
    private readonly settings: AutomationSettingsService,
    private readonly erpService: AutomationErpService,
    private readonly aiService: AutomationAiService,
    private readonly faqService: AutomationFaqService,
    private readonly curation: HistoryCurationService,
    private readonly orderService: AutomationOrderService,
  ) {}

  /** Rules for this channel plus the global ones, cheapest priority first. */
  private async loadRules(channelId: number): Promise<AutomationRule[]> {
    const [channelRules, globalRules] = await Promise.all([
      this.rulesRepository.find({
        where: { channel_id: channelId, is_active: true },
      }),
      this.rulesRepository.find({
        where: { channel_id: IsNull(), is_active: true },
      }),
    ]);

    return [...channelRules, ...globalRules].sort((a, b) => a.priority - b.priority);
  }

  /** Whether a single rule matches the incoming text. */
  static ruleMatches(rule: AutomationRule, text: string): boolean {
    const haystack = String(text ?? '').toLowerCase().trim();
    if (!haystack) return false;

    const patterns = Array.isArray(rule.patterns) ? rule.patterns : [];

    for (const rawPattern of patterns) {
      const pattern = String(rawPattern ?? '').trim();
      if (!pattern) continue;

      if (rule.match_type === 'regex') {
        try {
          if (new RegExp(pattern, 'i').test(haystack)) return true;
        } catch {
          // A rule saved with a broken regex must not break every other rule.
          continue;
        }
        continue;
      }

      const needle = pattern.toLowerCase();
      if (rule.match_type === 'equals' && haystack === needle) return true;
      if (rule.match_type === 'starts_with' && haystack.startsWith(needle)) return true;
      if (rule.match_type === 'contains' && haystack.includes(needle)) return true;
    }

    return false;
  }

  /**
   * Fills `{{placeholders}}` in a rule's reply from live ERP data.
   * Returns null when a placeholder cannot be resolved — a reply saying
   * "price is {{product_price}}" must never reach a customer.
   */
  static renderTemplate(
    template: string,
    context: { erp: ErpContext; channelName: string; displayName?: string | null },
  ): string | null {
    const product = context.erp.products[0] ?? null;
    const order = context.erp.orders[0] ?? null;

    const values: Record<string, string | null> = {
      page_name: context.channelName,
      customer_name: context.displayName || context.erp.customerName || null,
      product_name: product?.name ?? null,
      product_price:
        product == null
          ? null
          : product.salePrice != null
            ? `${product.salePrice} BDT`
            : `${product.price} BDT`,
      // No product_stock placeholder: stock is company-internal and must never
      // appear in a customer message, so the template language cannot express it.
      order_number: order?.orderNumber ?? null,
      order_status: order?.status ?? null,
    };

    let unresolved = false;
    const rendered = String(template ?? '').replace(
      /\{\{\s*([a-z_]+)\s*\}\}/gi,
      (_match, key: string) => {
        const value = values[String(key).toLowerCase()];
        if (value == null) {
          unresolved = true;
          return '';
        }
        return value;
      },
    );

    return unresolved ? null : rendered.trim();
  }

  /** True when the message contains anything that must go to a person. */
  private async escalationReason(
    text: string,
    threadType: AutomationThreadTypeAlias,
    /**
     * True while an order is being taken. The phone rule exists to catch
     * someone trying to order in a public comment; during a private order flow
     * the customer typing their number is the point, not a problem, and
     * escalating on it makes the flow impossible to finish.
     */
    orderInProgress = false,
  ): Promise<string | null> {
    const settings = await this.settings.getEscalation();
    const haystack = String(text ?? '').toLowerCase();

    for (const keyword of settings.keywords || []) {
      const needle = String(keyword ?? '').trim().toLowerCase();
      if (needle && haystack.includes(needle)) {
        return `escalation keyword: ${needle}`;
      }
    }

    if (settings.escalate_on_order_number) {
      const orderNumbers = AutomationErpService.extractOrderNumbers(text);
      if (orderNumbers.length > 0) {
        return `order number mentioned: ${orderNumbers[0]}`;
      }
    }

    // A phone number in a public comment is usually someone trying to order —
    // a person should take that, and it should not be answered in public.
    if (settings.escalate_on_phone_number && !orderInProgress) {
      const phones = AutomationErpService.extractPhoneNumbers(text);
      if (phones.length > 0) {
        return threadType === 'comment'
          ? 'phone number in a public comment'
          : 'phone number mentioned';
      }
    }

    return null;
  }

  async decide(options: {
    channel: AutomationChannel;
    threadType: AutomationThreadTypeAlias;
    text: string;
    history: AiTurn[];
    displayName?: string | null;
    /** Needed to keep an order draft; omitted by the panel's dry-run tester. */
    conversationId?: number | null;
  }): Promise<ReplyDecision> {
    const { channel, threadType, text, history, displayName, conversationId } = options;

    const incoming = String(text ?? '').trim();
    if (!incoming) {
      return ignore('no_text');
    }

    // Emoji-only / single-character comments ("👍", "?") are not questions.
    if (incoming.replace(/[\p{Emoji}\p{P}\s]/gu, '').length < 2) {
      return ignore('no_meaningful_text');
    }

    // 0. Is an order being taken in this thread?
    //
    // Looked up before anything else because it changes what the escalation
    // rules mean: a customer typing their mobile number mid-order is the flow
    // working, not a reason to hand the thread to a person.
    const orderSettings = await this.settings.getOrder();
    const orderFlowAvailable =
      Boolean(orderSettings.enabled) && threadType === 'message' && Boolean(conversationId);
    const draft = orderFlowAvailable
      ? await this.orderService.openDraft(Number(conversationId))
      : null;

    // 1. Escalation — runs before rules so "I want a refund for X" never gets a
    //    cheerful keyword answer about X.
    const escalation = await this.escalationReason(incoming, threadType, Boolean(draft));
    if (escalation) {
      const erp = await this.erpService.buildContext(incoming, channel.storefront_id);
      if (draft) await this.orderService.cancel(draft);
      return escalate(escalation, erp);
    }

    // 1b. The order flow, once it is open or the customer asks to buy.
    if (orderFlowAvailable && (draft || ReplyBrainService.looksLikeOrderIntent(incoming))) {
      const decision = await this.runOrderFlow({
        channel,
        conversationId: Number(conversationId),
        draft,
        incoming,
        history,
        displayName,
        orderSettings,
      });
      if (decision) return decision;
    }

    // 2. Rules.
    const rules = await this.loadRules(channel.id);
    let erp: ErpContext | null = null;

    for (const rule of rules) {
      if (rule.applies_to !== 'both' && rule.applies_to !== threadType) continue;
      if (!ReplyBrainService.ruleMatches(rule, incoming)) continue;

      if (rule.action === 'ignore') {
        return { ...ignore(`rule ${rule.id} (${rule.name}): ignore`), ruleId: rule.id };
      }

      if (rule.action === 'escalate') {
        erp = erp ?? (await this.erpService.buildContext(incoming, channel.storefront_id));
        return { ...escalate(`rule ${rule.id} (${rule.name}): escalate`, erp), ruleId: rule.id };
      }

      if (rule.action === 'ai') {
        // Deliberate hand-off: stop rule evaluation and let the model answer.
        break;
      }

      // action === 'reply'
      const template = String(rule.reply_text ?? '').trim();
      if (!template) continue;

      const needsErp = /\{\{\s*[a-z_]+\s*\}\}/i.test(template);
      if (needsErp && !erp) {
        erp = await this.erpService.buildContext(incoming, channel.storefront_id);
      }

      const context = {
        erp: erp ?? { products: [], orders: [], customerId: null, customerName: null },
        channelName: channel.name,
        displayName,
      };

      const rendered = ReplyBrainService.renderTemplate(template, context);
      if (rendered == null) {
        // A placeholder could not be resolved — e.g. "price?" with no product
        // matched. Fall through to the next rule rather than send a broken reply.
        this.logger.debug(
          `Rule ${rule.id} skipped: unresolved placeholder for "${incoming.slice(0, 60)}"`,
        );
        if (rule.stop_on_match) break;
        continue;
      }

      const privateText = rule.private_reply_text
        ? ReplyBrainService.renderTemplate(rule.private_reply_text, context)
        : null;

      return {
        action: 'reply',
        text: rendered,
        privateText,
        source: needsErp ? 'erp' : 'rule',
        ruleId: rule.id,
        faqId: null,
        confidence: 1,
        reason: `rule ${rule.id} (${rule.name})`,
        aiModel: null,
        aiUsage: null,
        erp,
      };
    }

    // 3. FAQ.
    //
    // Stated answers to the questions no table can answer: delivery time,
    // coverage, how to order. A confident match is sent word for word, which is
    // what lets this layer work at all while the AI is switched off — and what
    // keeps a routine "koto din lagbe?" from costing an API call once it is on.
    const global = await this.settings.getGlobal();
    const faqs = await this.faqService.activeForChannel(channel.id);

    if (global.faq_direct_reply !== false) {
      const match = AutomationFaqService.bestMatch(
        faqs,
        incoming,
        Number(global.faq_min_score ?? 0.75),
      );

      if (match) {
        return {
          action: 'reply',
          text: match.faq.answer,
          privateText: null,
          source: 'faq',
          ruleId: null,
          faqId: match.faq.id,
          confidence: match.score,
          reason: `FAQ ${match.faq.id} (${match.faq.question}) — matched ${match.matched.join(', ')}`,
          aiModel: null,
          aiUsage: null,
          erp,
        };
      }
    }

    // 4. AI.
    const aiSettings = await this.settings.getAi();
    if (!aiSettings.enabled) {
      return global.fallback_action === 'ignore'
        ? ignore('no rule or FAQ matched and AI is off')
        : escalate('no rule or FAQ matched and AI is off');
    }

    erp = erp ?? (await this.erpService.buildContext(incoming, channel.storefront_id));

    const ai = await this.aiService.generateReply({
      settings: aiSettings,
      persona: channel.persona,
      channelName: channel.name,
      incomingText: incoming,
      history: history.slice(-Math.max(1, Number(aiSettings.history_turns) || 8)),
      erp,
      // Every active answer, not just the ones the matcher liked: a question
      // phrased in a way the scorer missed is exactly the case the model is
      // here to handle, and it can only do that grounded.
      faqs: AutomationFaqService.toFacts(faqs, Number(global.faq_max_in_prompt ?? 20)),
      // How the team writes, taken from the imported threads. Voice only —
      // every figure in them was stripped at import.
      styleExamples:
        aiSettings.style_examples_enabled === false
          ? []
          : await this.curation.styleExamples(
              channel.id,
              Number(aiSettings.max_style_examples ?? 24),
            ),
      threadType,
    });

    if (ai.escalate || !ai.text) {
      return {
        ...escalate(`AI escalated: ${ai.reason ?? 'no reason given'}`, erp),
        aiModel: ai.model,
        aiUsage: ai.usage,
        confidence: ai.confidence,
      };
    }

    if (ai.confidence < Number(aiSettings.min_confidence ?? 0.6)) {
      return {
        ...escalate(
          `AI confidence ${ai.confidence.toFixed(2)} below threshold ${aiSettings.min_confidence}`,
          erp,
        ),
        aiModel: ai.model,
        aiUsage: ai.usage,
        confidence: ai.confidence,
      };
    }

    return {
      action: 'reply',
      text: ai.text,
      privateText: null,
      source: 'ai',
      ruleId: null,
      faqId: null,
      confidence: ai.confidence,
      reason: ai.reason ?? 'AI reply',
      aiModel: ai.model,
      aiUsage: ai.usage,
      erp,
    };
  }

  /**
   * Words that mean "I want to buy this".
   *
   * Cheap and explicit, so the extraction model is only paid for once a
   * conversation is plausibly an order — not on every "dam koto?".
   */
  static looksLikeOrderIntent(text: string): boolean {
    const value = String(text ?? '').toLowerCase();
    return [
      'order',
      'অর্ডার',
      'nibo',
      'nibe',
      'nite chai',
      'niboi',
      'নিব',
      'নিতে চাই',
      'কিনব',
      'kinbo',
      'confirm',
      'কনফার্ম',
    ].some((needle) => value.includes(needle));
  }

  /**
   * One turn of taking an order.
   *
   * Returns a decision when the order flow owns this message, or null to let
   * the ordinary layers answer — which is what happens when someone says
   * "order korbo" and the shop has no idea yet what they want.
   */
  private async runOrderFlow(context: {
    channel: AutomationChannel;
    conversationId: number;
    draft: AutomationOrderDraft | null;
    incoming: string;
    history: AiTurn[];
    displayName?: string | null;
    orderSettings: Awaited<ReturnType<AutomationSettingsService['getOrder']>>;
  }): Promise<ReplyDecision | null> {
    const { channel, conversationId, incoming, history, displayName, orderSettings } = context;
    let draft = context.draft;

    const reply = (text: string, reason: string): ReplyDecision => ({
      action: 'reply',
      text,
      privateText: null,
      source: 'order',
      ruleId: null,
      faqId: null,
      confidence: 1,
      reason,
      aiModel: null,
      aiUsage: null,
      erp: null,
    });

    // The customer backing out. Checked before anything else so "na, lagbe na"
    // never gets read as an answer to whatever was last asked.
    if (draft && AutomationOrderService.isCancellation(incoming, orderSettings)) {
      await this.orderService.cancel(draft);
      return reply(
        'ঠিক আছে, অর্ডারটি বাতিল করা হলো। আর কিছু জানার থাকলে বলবেন।',
        `order draft ${draft.id} cancelled by the customer`,
      );
    }

    // The confirmation. This is the only path that creates a real order.
    if (
      draft &&
      draft.status === 'confirming' &&
      AutomationOrderService.isConfirmation(incoming, orderSettings)
    ) {
      // Shadow and off mode decide but never act, and creating a row in
      // sales_orders is acting. Enforced here rather than trusted to the
      // caller, the same way the outbox refuses to send.
      if (channel.mode !== 'live') {
        return reply(
          AutomationOrderService.placedMessage(draft, {
            id: 0,
            orderNumber: '(shadow — no order created)',
            total: AutomationOrderService.total(draft),
          }),
          AutomationOrderService.shadowNote(draft),
        );
      }

      try {
        const placed = await this.orderService.place(draft);
        if (!placed) {
          return escalate(`order draft ${draft.id} could not be claimed — already placed?`);
        }
        return reply(
          AutomationOrderService.placedMessage(draft, placed),
          `order ${placed.orderNumber} created from draft ${draft.id}`,
        );
      } catch (error: any) {
        // A failure here means the customer has agreed to something the shop
        // has no record of. That is a person's problem, immediately.
        return escalate(`order creation failed: ${error?.message ?? error}`);
      }
    }

    // Otherwise: learn what we can from this message and ask for the next
    // missing piece.
    const aiSettings = await this.settings.getAi();
    if (!aiSettings.enabled) {
      // Without extraction there is no way to read a name or an address out of
      // free text, so the flow cannot run. Say nothing and let a person take it.
      return draft ? escalate('order flow needs the AI layer, which is off') : null;
    }

    const erp = await this.erpService.buildContext(incoming, channel.storefront_id);
    const known = {
      product: draft?.product_name ?? null,
      quantity: draft?.quantity || null,
      customer_name: draft?.customer_name ?? null,
      phone: draft?.phone ?? null,
      address: draft?.address ?? null,
    };

    const extracted = await this.aiService.extractOrder({
      settings: aiSettings,
      history: history.slice(-8),
      incomingText: incoming,
      candidates: erp.products,
      known,
    });

    if (!extracted) {
      return draft ? escalate('order extraction failed') : null;
    }

    // "order korbo" with nothing else said and no product matched is not yet an
    // order — let the ordinary layers greet and qualify first.
    if (!draft && !extracted.wantsToOrder && extracted.productId == null) {
      return null;
    }

    draft = draft ?? (await this.orderService.startDraft(conversationId, channel.id));

    const patch: Partial<AutomationOrderDraft> = {};
    if (extracted.productId != null) {
      const product = erp.products.find((candidate) => candidate.id === extracted.productId);
      if (product) {
        patch.product_id = product.id;
        patch.product_name = product.name;
        // Snapshot the price the customer is agreeing to.
        patch.unit_price = product.salePrice ?? product.price;
      }
    }
    if (extracted.quantity != null) patch.quantity = extracted.quantity;
    if (extracted.customerName) patch.customer_name = extracted.customerName;
    else if (!draft.customer_name && displayName) patch.customer_name = displayName;
    if (extracted.phone) patch.phone = extracted.phone;
    if (extracted.address) patch.address = extracted.address;
    if (extracted.district) patch.district = extracted.district;

    const merged = { ...draft, ...patch } as AutomationOrderDraft;
    patch.delivery_charge = AutomationOrderService.deliveryCharge(merged, orderSettings);

    draft = await this.orderService.apply(draft, patch);

    const question = AutomationOrderService.nextQuestion(draft);
    if (question) {
      return reply(question, `order draft ${draft.id}: asking for the next missing detail`);
    }

    draft = await this.orderService.apply(draft, { status: 'confirming' });
    return reply(
      AutomationOrderService.readback(draft),
      `order draft ${draft.id}: read back, waiting for confirmation`,
    );
  }

  /** Bumps the hit counter for an FAQ that produced a reply. Best-effort. */
  async recordFaqHit(faqId: number): Promise<void> {
    await this.faqService.recordHit(faqId);
  }

  /** Bumps the hit counter for a rule that produced a reply. Best-effort. */
  async recordRuleHit(ruleId: number): Promise<void> {
    try {
      await this.rulesRepository.increment({ id: ruleId }, 'hit_count', 1);
      await this.rulesRepository.update({ id: ruleId }, { last_hit_at: new Date() });
    } catch (error: any) {
      this.logger.debug(`Could not record hit for rule ${ruleId}: ${error?.message}`);
    }
  }
}
