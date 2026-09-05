import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { SalesOrder } from '../sales/sales-order.entity';
import { StorefrontProduct } from '../storefronts/storefront-product.entity';
import { Customer } from '../customers/customer.entity';
import { AutomationSettingsService } from './automation-settings.service';

/**
 * What the reply engine is allowed to know about a product.
 *
 * Deliberately carries no stock information. Stock is tracked inside the company
 * and must never be stated in a customer message, so it is not merely omitted
 * from the wording — it never enters the object that builds the reply, and
 * therefore cannot leak through a prompt change or a new template placeholder.
 * Every product the bot can find is treated as available.
 */
export type ProductFact = {
  id: number;
  name: string;
  price: number;
  salePrice: number | null;
};

export type OrderFact = {
  orderNumber: string;
  status: string;
  courierStatus: string | null;
  orderDate: string | null;
  totalAmount: number;
};

/** Everything the reply brain knows about the customer's question from our own data. */
export type ErpContext = {
  products: ProductFact[];
  /**
   * True when these are the page's headline products rather than a match for
   * anything the customer said. The prompt has to say so, or the model will
   * answer "what is the price?" as though one specific product had been named.
   */
  productsAreFeatured: boolean;
  orders: OrderFact[];
  customerId: number | null;
  customerName: string | null;
};

/** Words too generic to be worth a product lookup. */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'this', 'that', 'with', 'have', 'from',
  'price', 'koto', 'kotoo', 'dam', 'daam', 'taka', 'delivery', 'charge', 'kobe',
  'kivabe', 'please', 'plz', 'order', 'korbo', 'want', 'need', 'available',
  'ache', 'achhe', 'kore', 'kori', 'amar', 'ami', 'apnara', 'apnader', 'bhai',
  'apu', 'sir', 'madam', 'hello', 'assalamu', 'alaikum', 'inbox', 'msg',
]);

/**
 * Reads the shop's own data so replies are grounded in facts rather than guesses.
 *
 * This is the whole reason the automation lives inside the ERP rather than in a
 * separate tool: a stock or order lookup is a local query, not a network hop.
 *
 * Every method is defensive — a failed lookup returns empty rather than throwing,
 * because a customer waiting on Messenger should get a generic reply, not silence.
 */
@Injectable()
export class AutomationErpService {
  private readonly logger = new Logger(AutomationErpService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(SalesOrder)
    private readonly orderRepository: Repository<SalesOrder>,
    @InjectRepository(StorefrontProduct)
    private readonly storefrontProductRepository: Repository<StorefrontProduct>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly settings: AutomationSettingsService,
  ) {}

  /**
   * One catalogue row as the reply engine is allowed to see it.
   *
   * Shared by the search and the featured lookup so the two cannot drift — in
   * particular so neither can start carrying stock.
   */
  private toFact(product: Product): ProductFact {
    const base = Number(product.base_price) || 0;
    const sale = product.sale_price != null ? Number(product.sale_price) : null;
    return {
      id: product.id,
      name: product.name_en || product.name_bn || `#${product.id}`,
      price: base,
      // A sale price only counts when it is a real discount; 0 or a value above
      // the base price is bad data, not an offer.
      salePrice: sale && sale > 0 && sale < base ? sale : null,
    };
  }

  /** Order numbers the customer typed, e.g. `SO-1720000000-4821` or a bare 6+ digit run. */
  static extractOrderNumbers(text: string): string[] {
    const value = String(text ?? '');
    const found = new Set<string>();

    // Case-insensitive: customers type "so-1735..." as often as "SO-1735...".
    // Stored numbers are uppercase, so normalise before matching.
    const structured: string[] = [];
    for (const match of value.matchAll(/\bSO-[A-Za-z0-9-]{4,}\b/gi)) {
      const orderNumber = match[0].toUpperCase();
      structured.push(orderNumber);
      found.add(orderNumber);
    }

    // Bare digit runs, for customers who omit the SO- prefix. Skip any run that
    // is already part of a structured number we found — otherwise every proper
    // order number also triggers two pointless lookups for its own digits.
    for (const match of value.matchAll(/\b\d{6,}\b/g)) {
      if (structured.some((orderNumber) => orderNumber.includes(match[0]))) continue;
      found.add(match[0]);
    }

    return [...found].slice(0, 3);
  }

  /** Bangladeshi phone numbers in any of the usual shapes, normalised to 01XXXXXXXXX. */
  static extractPhoneNumbers(text: string): string[] {
    const value = String(text ?? '');
    const found = new Set<string>();

    for (const match of value.matchAll(/(?:\+?88)?0?1[3-9]\d{8}/g)) {
      const digits = match[0].replace(/\D/g, '');
      const local = digits.slice(-11);
      if (local.length === 11 && local.startsWith('01')) found.add(local);
    }
    return [...found].slice(0, 3);
  }

  /** Candidate product words: long enough to be meaningful, not a stop word. */
  private static tokenize(text: string): string[] {
    return String(text ?? '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
      .slice(0, 8);
  }

  /**
   * Products the message might be about.
   *
   * Which catalogue statuses count is a setting, not a constant. `inactive` here
   * means "not listed on the main site", not "discontinued" — most of the
   * catalogue carries it, ads run against those products, so customers ask about
   * them and the bot has to answer. Stock is not consulted at all: every product
   * found is treated as available, and availability is never discussed.
   *
   * When the channel belongs to a storefront, only that brand's published
   * products are considered — a Handsome Man page must never quote a
   * TrustCart-only grocery item.
   */
  async findProducts(text: string, storefrontId?: number | null): Promise<ProductFact[]> {
    const tokens = AutomationErpService.tokenize(text);
    if (tokens.length === 0) return [];

    const { product_statuses: statuses } = await this.settings.getGlobal();
    const allowedStatuses =
      Array.isArray(statuses) && statuses.length > 0 ? statuses : ['active', 'inactive'];

    try {
      const query = this.productRepository
        .createQueryBuilder('p')
        .where('p.status IN (:...statuses)', { statuses: allowedStatuses })
        .take(5);

      const matches = (index: number) => `(p.name_en ILIKE :t${index} OR p.name_bn ILIKE :t${index})`;

      query.andWhere(
        `(${tokens.map((_, index) => matches(index)).join(' OR ')})`,
        Object.fromEntries(tokens.map((token, index) => [`t${index}`, `%${token}%`])),
      );

      // Rank, rather than take whatever the planner returns first.
      //
      // The clause above is an OR, so "kasri oil er dam koto" matches every
      // product with "oil" in its name. Unordered, that let a question about
      // Kasri Oil be answered with the price of a coconut oil trial pack — the
      // rule template quotes products[0] and there was no products[0] worth
      // trusting. Most tokens matched wins; a shorter name breaks the tie,
      // because "Kasri Oil" is a better answer to "kasri oil" than
      // "Kasri oil (1 piece) + hot water bag + joint guard" is.
      const score = tokens
        .map((_, index) => `(CASE WHEN ${matches(index)} THEN 1 ELSE 0 END)`)
        .join(' + ');
      query
        .addSelect(score, 'match_score')
        .orderBy('match_score', 'DESC')
        .addOrderBy("length(COALESCE(p.name_en, p.name_bn, ''))", 'ASC')
        .addOrderBy('p.id', 'ASC');

      if (storefrontId) {
        const scoped = await this.storefrontProductRepository.find({
          where: { storefront_id: storefrontId, is_published: true },
          select: ['product_id'],
        });
        const ids = scoped.map((row) => row.product_id);
        if (ids.length === 0) {
          // Loud, because it is silent otherwise: a channel pointed at a
          // storefront with nothing published can never quote any product, and
          // the symptom is just "the bot keeps escalating".
          this.logger.warn(
            `Storefront ${storefrontId} has no published products — product lookup will ` +
              'return nothing for this channel. Publish products to it, or clear the ' +
              "channel's storefront so it searches the whole catalogue.",
          );
          return [];
        }
        query.andWhere('p.id IN (:...ids)', { ids });
      }

      const products = await query.getMany();
      return products.map((product) => this.toFact(product));
    } catch (error: any) {
      this.logger.warn(`Product lookup failed: ${error?.message}`);
      return [];
    }
  }

  /** Orders matching the order numbers or phone numbers found in the message. */
  async findOrders(text: string): Promise<OrderFact[]> {
    const orderNumbers = AutomationErpService.extractOrderNumbers(text);
    const phones = AutomationErpService.extractPhoneNumbers(text);
    if (orderNumbers.length === 0 && phones.length === 0) return [];

    try {
      const query = this.orderRepository
        .createQueryBuilder('o')
        .orderBy('o.createdAt', 'DESC')
        .take(3);

      const conditions: string[] = [];
      const params: Record<string, any> = {};

      if (orderNumbers.length > 0) {
        conditions.push('o.salesOrderNumber IN (:...orderNumbers)');
        params.orderNumbers = orderNumbers;
      }
      if (phones.length > 0) {
        conditions.push('o.customerPhone IN (:...phones)');
        params.phones = phones;
      }

      query.where(`(${conditions.join(' OR ')})`, params);
      const orders = await query.getMany();

      return orders.map((order) => ({
        orderNumber: order.salesOrderNumber,
        status: order.status,
        courierStatus: (order as any).courierStatus ?? null,
        orderDate: order.orderDate ? String(order.orderDate) : null,
        totalAmount: Number(order.totalAmount) || 0,
      }));
    } catch (error: any) {
      this.logger.warn(`Order lookup failed: ${error?.message}`);
      return [];
    }
  }

  /** Matches the person to an existing customer by any phone number they typed. */
  async findCustomerByText(text: string): Promise<{ id: number; name: string | null } | null> {
    const phones = AutomationErpService.extractPhoneNumbers(text);
    if (phones.length === 0) return null;

    try {
      const customer = await this.customerRepository
        .createQueryBuilder('c')
        .where('c.phone IN (:...phones)', { phones })
        .getOne();
      if (!customer) return null;
      return { id: customer.id, name: (customer as any).name ?? null };
    } catch (error: any) {
      this.logger.warn(`Customer lookup failed: ${error?.message}`);
      return null;
    }
  }

  /** Everything the reply brain needs from our own data, in one pass. */
  /**
   * The products a page is mainly about, by id.
   *
   * Used as the fallback when the customer's words match nothing. Returns them
   * in the order the channel lists them, so the shop decides what gets
   * mentioned first rather than the database.
   */
  async findFeaturedProducts(ids: number[]): Promise<ProductFact[]> {
    const wanted = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isFinite);
    if (wanted.length === 0) return [];

    try {
      const { product_statuses: statuses } = await this.settings.getGlobal();
      const allowedStatuses =
        Array.isArray(statuses) && statuses.length > 0 ? statuses : ['active', 'inactive'];

      const rows = await this.productRepository
        .createQueryBuilder('p')
        .where('p.id IN (:...ids)', { ids: wanted })
        .andWhere('p.status IN (:...statuses)', { statuses: allowedStatuses })
        .getMany();

      const byId = new Map(rows.map((row) => [row.id, row]));
      return wanted
        .map((id) => byId.get(id))
        .filter((row): row is Product => Boolean(row))
        .map((product) => this.toFact(product));
    } catch (error: any) {
      this.logger.warn(`Featured product lookup failed: ${error?.message}`);
      return [];
    }
  }

  async buildContext(
    text: string,
    storefrontId?: number | null,
    featuredProductIds?: number[] | null,
  ): Promise<ErpContext> {
    const [matched, orders, customer] = await Promise.all([
      this.findProducts(text, storefrontId),
      this.findOrders(text),
      this.findCustomerByText(text),
    ]);

    // Only when nothing matched. A customer who named a product must never be
    // shown a different one just because it is the page's headline item.
    const products =
      matched.length > 0 ? matched : await this.findFeaturedProducts(featuredProductIds ?? []);

    return {
      products,
      productsAreFeatured: matched.length === 0 && products.length > 0,
      orders,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? null,
    };
  }
}
