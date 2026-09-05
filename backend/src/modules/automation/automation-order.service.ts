import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationOrderDraft } from './entities/automation-order-draft.entity';
import { AutomationOrderSettings } from './automation-settings.service';
import { SalesService } from '../sales/sales.service';
import { containsAnyPhrase } from './text-tokens';

/** A field the order cannot be placed without, and how to ask for it. */
export type OrderField = 'product' | 'quantity' | 'customer_name' | 'phone' | 'address';

/**
 * Asked one at a time, in this order.
 *
 * The team's own imported messages ask for name, address and mobile together
 * in one block, and that works for a person reading a form. A bot that asks
 * for five things at once and then has to parse a half-answer produces the
 * failure this whole draft table exists to avoid, so the product and quantity
 * are settled first and the contact block is asked as one step at the end.
 */
const FIELD_PROMPTS: Record<OrderField, string> = {
  product: 'কোন প্রোডাক্টটি নিতে চাচ্ছেন জানাবেন?',
  quantity: 'কয়টি নিতে চাচ্ছেন?',
  customer_name: 'আপনার নামটি জানাবেন?',
  phone: 'আপনার মোবাইল নাম্বারটি দিন।',
  address: 'আপনার সম্পূর্ণ ঠিকানা দিন (গ্রাম/এলাকা, থানা, জেলা সহ)।',
};

const ORDER_OF_ASKING: OrderField[] = ['product', 'quantity', 'customer_name', 'phone', 'address'];

/** Bengali digits for the customer-facing numbers, ASCII everywhere internal. */
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export function toBengaliDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** `4500` -> `৪,৫০০` */
export function formatMoney(value: number): string {
  return toBengaliDigits(Math.round(Number(value) || 0).toLocaleString('en-US'));
}

export type PlacedOrder = {
  id: number;
  orderNumber: string;
  total: number;
};

/**
 * Taking an order in a Messenger thread.
 *
 * Two rules shape everything here:
 *
 *   - Nothing is written to sales_orders until the customer has seen the whole
 *     order read back and said so in words. The read-back is not politeness; it
 *     is the only point at which a person can catch a misheard address.
 *   - Cash on delivery only. No payment identifier is ever asked for or stored,
 *     because a bKash number and a transaction id sitting in a Facebook thread
 *     are worth more to an attacker than they are to us, and a bot cannot
 *     verify either of them anyway.
 *
 * Stock is not consulted and never mentioned. Every product the catalogue can
 * find is orderable.
 */
@Injectable()
export class AutomationOrderService {
  private readonly logger = new Logger(AutomationOrderService.name);

  constructor(
    @InjectRepository(AutomationOrderDraft)
    private readonly draftRepository: Repository<AutomationOrderDraft>,
    private readonly sales: SalesService,
  ) {}

  // ─── Pure helpers ────────────────────────────────────────────────────────

  /** Which required fields are still blank, in the order they should be asked. */
  static missingFields(draft: Partial<AutomationOrderDraft>): OrderField[] {
    const missing: OrderField[] = [];
    if (!draft.product_id && !String(draft.product_name ?? '').trim()) missing.push('product');
    if (!Number(draft.quantity)) missing.push('quantity');
    if (!String(draft.customer_name ?? '').trim()) missing.push('customer_name');
    if (!String(draft.phone ?? '').trim()) missing.push('phone');
    if (!String(draft.address ?? '').trim()) missing.push('address');
    return ORDER_OF_ASKING.filter((field) => missing.includes(field));
  }

  /** The next question to ask, or null when the draft is complete. */
  static nextQuestion(draft: Partial<AutomationOrderDraft>): string | null {
    const [next] = AutomationOrderService.missingFields(draft);
    return next ? FIELD_PROMPTS[next] : null;
  }

  /**
   * Delivery charge for an address.
   *
   * Inside Dhaka is cheaper, and "inside Dhaka" is decided from the words the
   * customer wrote rather than a lookup table, because they type "dhaka,
   * rampura" far more often than they name a district cleanly.
   */
  static deliveryCharge(
    draft: Pick<AutomationOrderDraft, 'district' | 'address'>,
    settings: AutomationOrderSettings,
  ): number {
    const haystack = `${draft.district ?? ''} ${draft.address ?? ''}`.toLowerCase();
    const insideDhaka = /\bdhaka\b|ঢাকা/.test(haystack);
    return Number(
      insideDhaka ? settings.delivery_charge_inside_dhaka : settings.delivery_charge_outside_dhaka,
    );
  }

  static subtotal(draft: Partial<AutomationOrderDraft>): number {
    return Number(draft.unit_price ?? 0) * Number(draft.quantity ?? 0);
  }

  static total(draft: Partial<AutomationOrderDraft>): number {
    return AutomationOrderService.subtotal(draft) + Number(draft.delivery_charge ?? 0);
  }

  /**
   * The whole order, written out, ending in an explicit instruction.
   *
   * Deliberately one fact per line with a bold label: this is the message a
   * customer is meant to actually re-read, and a paragraph does not get
   * re-read.
   */
  static readback(draft: AutomationOrderDraft): string {
    const subtotal = AutomationOrderService.subtotal(draft);
    const delivery = Number(draft.delivery_charge ?? 0);

    return [
      '*আপনার অর্ডারটি দেখে নিন:*',
      '',
      `*প্রোডাক্ট:* ${draft.product_name}`,
      `*পরিমাণ:* ${toBengaliDigits(draft.quantity)}টি`,
      `*দাম:* ${formatMoney(subtotal)} টাকা`,
      `*ডেলিভারি চার্জ:* ${formatMoney(delivery)} টাকা`,
      `*মোট বিল:* ${formatMoney(subtotal + delivery)} টাকা (ক্যাশ অন ডেলিভারি)`,
      '',
      `*নাম:* ${draft.customer_name}`,
      `*মোবাইল:* ${draft.phone}`,
      `*ঠিকানা:* ${draft.address}`,
      '',
      "সব তথ্য ঠিক থাকলে 'কনফার্ম' লিখুন। কিছু পরিবর্তন করতে চাইলে জানান।",
    ].join('\n');
  }

  /** Sent once the real order exists. Mirrors the read-back so it reads as a receipt. */
  static placedMessage(draft: AutomationOrderDraft, order: PlacedOrder): string {
    return [
      '*অর্ডার কনফার্ম হয়েছে ✅*',
      '',
      `*অর্ডার নম্বর:* ${order.orderNumber}`,
      `*প্রোডাক্ট:* ${draft.product_name} (${toBengaliDigits(draft.quantity)}টি)`,
      `*মোট বিল:* ${formatMoney(order.total)} টাকা (ক্যাশ অন ডেলিভারি)`,
      '',
      'আমাদের প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন। আমাদের সাথে থাকার জন্য ধন্যবাদ!',
      '',
      // The thread stays open on purpose: this is the moment a customer is
      // most willing to add something, and the layers below can answer.
      'আর কোনো প্রোডাক্ট নিয়ে সাহায্য করতে পারি?',
    ].join('\n');
  }

  /** What the read-back looks like when the channel is not live. */
  static shadowNote(draft: AutomationOrderDraft): string {
    return (
      `[shadow] Order NOT placed. Would have created: ${draft.product_name} x${draft.quantity}, ` +
      `total ${AutomationOrderService.total(draft)} BDT, for ${draft.customer_name} / ${draft.phone}.`
    );
  }

  /**
   * True when the customer's words are an unambiguous yes to the read-back.
   *
   * Whole words only. A substring test read "ami ei jinis nibo na" — *I won't
   * take this thing* — as a confirmation, because "ji" is a perfectly good yes
   * in Banglish and it also sits inside "jinis". This is the one comparison in
   * the module whose false positive is a real order.
   */
  static isConfirmation(text: string, settings: AutomationOrderSettings): boolean {
    return containsAnyPhrase(text, settings.confirm_words || []);
  }

  static isCancellation(text: string, settings: AutomationOrderSettings): boolean {
    return containsAnyPhrase(text, settings.cancel_words || []);
  }

  // ─── Persistence ─────────────────────────────────────────────────────────

  /** The open draft for a conversation, if there is one. */
  async openDraft(conversationId: number): Promise<AutomationOrderDraft | null> {
    return this.draftRepository
      .createQueryBuilder('d')
      .where('d.conversation_id = :conversationId', { conversationId })
      .andWhere('d.status IN (:...open)', { open: ['collecting', 'confirming'] })
      .orderBy('d.id', 'DESC')
      .getOne();
  }

  async startDraft(conversationId: number, channelId: number): Promise<AutomationOrderDraft> {
    const existing = await this.openDraft(conversationId);
    if (existing) return existing;

    return this.draftRepository.save(
      this.draftRepository.create({
        conversation_id: conversationId,
        channel_id: channelId,
        status: 'collecting',
        quantity: 0,
      }),
    );
  }

  async apply(
    draft: AutomationOrderDraft,
    patch: Partial<AutomationOrderDraft>,
  ): Promise<AutomationOrderDraft> {
    Object.assign(draft, patch);
    return this.draftRepository.save(draft);
  }

  async cancel(draft: AutomationOrderDraft): Promise<void> {
    draft.status = 'cancelled';
    await this.draftRepository.save(draft);
  }

  /**
   * Creates the real order.
   *
   * The row is claimed first — `status -> placed` only succeeds while the draft
   * is still `confirming` and carries no order id — so a duplicated webhook or
   * a customer typing "confirm" twice cannot produce two orders. The same
   * shape as the outbox's claim-before-send, for the same reason.
   *
   * Routed through SalesService rather than writing rows directly, so a
   * Messenger order is indistinguishable downstream from a website one:
   * order number, customer linking, courier, Meta CAPI and the dashboards all
   * behave identically.
   */
  async place(draft: AutomationOrderDraft): Promise<PlacedOrder | null> {
    const claim = await this.draftRepository
      .createQueryBuilder()
      .update(AutomationOrderDraft)
      .set({ status: 'placed', placed_at: new Date() })
      .where('id = :id AND status = :status AND sales_order_id IS NULL', {
        id: draft.id,
        status: 'confirming',
      })
      .execute();

    if (!claim.affected) {
      this.logger.warn(`Order draft ${draft.id} was already placed or is not ready; skipping.`);
      return null;
    }

    const unitPrice = Number(draft.unit_price ?? 0);
    const quantity = Number(draft.quantity ?? 1);
    const deliveryCharge = Number(draft.delivery_charge ?? 0);

    try {
      const order: any = await this.sales.create({
        order_source: 'messenger_bot',
        status: 'processing',
        payment_method: 'cash',
        payment_status: 'unpaid',
        customer_name: draft.customer_name,
        customer_phone: draft.phone,
        shipping_address: draft.address,
        district: draft.district,
        delivery_charge: deliveryCharge,
        items: [
          {
            product_id: draft.product_id,
            product_name: draft.product_name,
            quantity,
            unit_price: unitPrice,
          },
        ],
        notes: `Placed by the Messenger bot from automation conversation #${draft.conversation_id}.`,
      });

      const placed: PlacedOrder = {
        id: Number(order?.id),
        orderNumber: String(order?.salesOrderNumber ?? order?.sales_order_number ?? ''),
        total: Number(order?.totalAmount ?? order?.total_amount ?? unitPrice * quantity + deliveryCharge),
      };

      await this.draftRepository.update(
        { id: draft.id },
        { sales_order_id: placed.id, sales_order_number: placed.orderNumber },
      );

      this.logger.log(
        `Messenger order ${placed.orderNumber} created from conversation ${draft.conversation_id}.`,
      );
      return placed;
    } catch (error: any) {
      // Hand the claim back so a person, or the customer, can try again rather
      // than the thread sitting in a state that can never place anything.
      await this.draftRepository.update(
        { id: draft.id },
        { status: 'confirming', placed_at: null },
      );
      this.logger.error(
        `Could not create the order for draft ${draft.id}: ${error?.message ?? error}`,
      );
      throw error;
    }
  }
}
