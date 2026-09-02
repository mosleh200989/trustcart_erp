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
  captured: Array<{ clause: string; params: any }>;
};

function makeQueryBuilder(rows: Partial<Product>[]): QueryRecorder {
  const captured: Array<{ clause: string; params: any }> = [];
  const builder: any = {
    captured,
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

  it('returns an inactive product and reports it as in stock when it has stock', async () => {
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
    expect(found[0]).toMatchObject({
      id: 311,
      name: 'Kasri Oil',
      price: 850,
      salePrice: 699,
      inStock: true,
    });
  });

  it('reports out of stock rather than hiding the product', async () => {
    const { service } = makeService({
      productRows: [
        { id: 42, name_en: 'Gastro Care', base_price: 500 as any, stock_quantity: 0 },
      ],
    });

    const [product] = await service.findProducts('gastro care available?');

    expect(product.inStock).toBe(false);
    expect(product.price).toBe(500);
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
