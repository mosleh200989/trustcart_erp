import { Repository } from 'typeorm';
import { AutomationErpService } from './automation-erp.service';
import { AutomationSettingsService } from './automation-settings.service';
import { Product } from '../products/product.entity';
import { SalesOrder } from '../sales/sales-order.entity';
import { StorefrontProduct } from '../storefronts/storefront-product.entity';
import { Customer } from '../customers/customer.entity';

/**
 * Guards the catalogue filter.
 *
 * Most of this catalogue is `inactive` — which means "not listed on the main
 * site", not "discontinued" — and ads run against those products, so customers
 * ask about them. Filtering them out made the bot silently unable to quote a
 * price for three quarters of the shop, and the only symptom was that it kept
 * escalating. These tests pin the statuses that actually reach the query.
 */

type QueryRecorder = {
  where: jest.Mock;
  andWhere: jest.Mock;
  take: jest.Mock;
  getMany: jest.Mock;
  addSelect: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  captured: Array<{ clause: string; params: any }>;
  selectCalls: Array<{ expression: string; alias: string }>;
  orderCalls: Array<{ expression: string; direction?: string }>;
};

function makeQueryBuilder(rows: Partial<Product>[]): QueryRecorder {
  const captured: Array<{ clause: string; params: any }> = [];
  const selectCalls: Array<{ expression: string; alias: string }> = [];
  const orderCalls: Array<{ expression: string; direction?: string }> = [];
  const builder: any = {
    captured,
    selectCalls,
    orderCalls,
    addSelect: jest.fn((expression: string, alias: string) => {
      selectCalls.push({ expression, alias });
      return builder;
    }),
    orderBy: jest.fn((expression: string, direction?: string) => {
      orderCalls.push({ expression, direction });
      return builder;
    }),
    addOrderBy: jest.fn((expression: string, direction?: string) => {
      orderCalls.push({ expression, direction });
      return builder;
    }),
    where: jest.fn((clause: string, params: any) => {
      captured.push({ clause, params });
      return builder;
    }),
    andWhere: jest.fn((clause: string, params: any) => {
      captured.push({ clause, params });
      return builder;
    }),
    take: jest.fn(() => builder),
    getMany: jest.fn(async () => rows),
  };
  return builder;
}

function makeService(options: {
  productRows?: Partial<Product>[];
  storefrontRows?: Array<{ product_id: number }>;
  statuses?: string[];
}) {
  const builder = makeQueryBuilder(options.productRows ?? []);

  const productRepository = {
    createQueryBuilder: jest.fn(() => builder),
  } as unknown as Repository<Product>;

  const storefrontProductRepository = {
    find: jest.fn(async () => options.storefrontRows ?? []),
  } as unknown as Repository<StorefrontProduct>;

  const settings = {
    getGlobal: jest.fn(async () => ({
      product_statuses: options.statuses ?? ['active', 'inactive'],
    })),
  } as unknown as AutomationSettingsService;

  const service = new AutomationErpService(
    productRepository,
    {} as Repository<SalesOrder>,
    storefrontProductRepository,
    {} as Repository<Customer>,
    settings,
  );

  return { service, builder };
}

describe('AutomationErpService.findProducts', () => {
  it('searches both active and inactive products by default', async () => {
    const { service, builder } = makeService({});

    await service.findProducts('kasri oil dam koto?');

    const statusClause = builder.captured.find((entry) => entry.clause.includes('p.status'));
    expect(statusClause).toBeDefined();
    expect(statusClause!.params.statuses).toEqual(['active', 'inactive']);
  });

  it('honours a narrowed status list from settings', async () => {
    const { service, builder } = makeService({ statuses: ['active'] });

    await service.findProducts('beard oil price');

    const statusClause = builder.captured.find((entry) => entry.clause.includes('p.status'));
    expect(statusClause!.params.statuses).toEqual(['active']);
  });

  it('falls back to both statuses when the setting is empty, rather than matching nothing', async () => {
    // An empty list would make `IN ()` match zero rows and silently mute the bot.
    const { service, builder } = makeService({ statuses: [] });

    await service.findProducts('kasri oil');

    const statusClause = builder.captured.find((entry) => entry.clause.includes('p.status'));
    expect(statusClause!.params.statuses).toEqual(['active', 'inactive']);
  });

  it('returns an inactive product with its price', async () => {
    const { service } = makeService({
      productRows: [
        {
          id: 311,
          name_en: 'Kasri Oil',
          base_price: 850 as any,
          sale_price: 699 as any,
          stock_quantity: 12,
        },
      ],
    });

    const found = await service.findProducts('kasri oil dam koto?');

    expect(found).toHaveLength(1);
    expect(found[0]).toEqual({ id: 311, name: 'Kasri Oil', price: 850, salePrice: 699 });
  });

  it('carries no stock information at all, whatever the catalogue says', async () => {
    // Stock is company-internal. It must not reach a customer message, so it is
    // absent from the object the reply is built from rather than merely unused.
    const { service } = makeService({
      productRows: [
        { id: 42, name_en: 'Gastro Care', base_price: 500 as any, stock_quantity: 0 },
        { id: 43, name_en: 'Gastro Care Plus', base_price: 900 as any, stock_quantity: 25 },
      ],
    });

    const found = await service.findProducts('gastro care');

    for (const product of found) {
      expect(Object.keys(product).sort()).toEqual(['id', 'name', 'price', 'salePrice']);
      expect(JSON.stringify(product).toLowerCase()).not.toContain('stock');
    }
    expect(found[0].price).toBe(500);
  });

  it('ignores a sale price of zero rather than quoting 0 BDT', async () => {
    const { service } = makeService({
      productRows: [
        { id: 7, name_en: 'Coconut oil trial', base_price: 300 as any, sale_price: 0 as any },
      ],
    });

    const [product] = await service.findProducts('coconut oil');

    expect(product.salePrice).toBeNull();
    expect(product.price).toBe(300);
  });

  it('returns nothing when the message has no searchable words', async () => {
    const { service } = makeService({});
    expect(await service.findProducts('ok')).toEqual([]);
  });

  it('returns nothing when the channel is scoped to a storefront with no published products', async () => {
    const { service } = makeService({ storefrontRows: [] });

    expect(await service.findProducts('beard oil', 1)).toEqual([]);
  });

  it('restricts to the storefront catalogue when one is published', async () => {
    const { service, builder } = makeService({
      storefrontRows: [{ product_id: 7 }, { product_id: 9 }],
    });

    await service.findProducts('beard oil', 1);

    const idClause = builder.captured.find((entry) => entry.clause.includes('p.id IN'));
    expect(idClause!.params.ids).toEqual([7, 9]);
  });
});

/**
 * Ranking, added after a shadow-mode draft quoted the wrong product.
 *
 * A real customer asked "kasri oil er dam koto" and was told the price of a
 * coconut oil trial pack. The match clause is an OR across every token, so
 * anything with "oil" in its name qualified, and nothing ordered the result —
 * the rule template quotes products[0] and there was no products[0] worth
 * trusting.
 */
describe('AutomationErpService.findProducts — ranking', () => {
  function orderClauses(builder: QueryRecorder): string {
    return JSON.stringify((builder as any).orderCalls ?? []);
  }

  it('orders by how many of the question’s words the name matches', async () => {
    const { service, builder } = makeService({});

    await service.findProducts('kasri oil er dam koto');

    const scored = (builder as any).selectCalls.find((c: any) =>
      String(c.expression).includes('CASE WHEN'),
    );
    expect(scored).toBeDefined();
    // Two searchable tokens survive the stop-word list: kasri, oil.
    expect(String(scored.expression).match(/CASE WHEN/g)).toHaveLength(2);
    expect(scored.alias).toBe('match_score');
    expect(orderClauses(builder)).toContain('match_score');
  });

  it('breaks a tie on the shorter name, so the plain product wins', async () => {
    // "Kasri Oil" answers "kasri oil" better than
    // "Kasri oil (1 piece) + hot water bag + joint guard" does.
    const { service, builder } = makeService({});

    await service.findProducts('kasri oil');

    expect(orderClauses(builder)).toContain('length');
  });

  it('still ranks when a single word is searched', async () => {
    const { service, builder } = makeService({});

    await service.findProducts('gastro');

    expect(orderClauses(builder)).toContain('match_score');
  });
});
