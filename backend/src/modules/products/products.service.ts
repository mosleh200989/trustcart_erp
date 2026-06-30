import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { DealOfTheDay } from './deal-of-the-day.entity';
import { HotDeal } from './hot-deal.entity';
import { ProductSuggestion } from './product-suggestion.entity';

@Injectable()
export class ProductsService {
  private productSuggestionShortlistSchemaReady?: Promise<void>;

  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(DealOfTheDay)
    private dealOfTheDayRepository: Repository<DealOfTheDay>,
    @InjectRepository(HotDeal)
    private hotDealRepository: Repository<HotDeal>,
    @InjectRepository(ProductSuggestion)
    private productSuggestionRepository: Repository<ProductSuggestion>,
  ) {}

  private readonly productOrderSections = new Map<string, { label: string; where: string }>([
    ['products_page', { label: 'Products Page', where: `p.status = 'active'` }],
    ['homepage_featured', { label: 'Homepage Featured Products', where: `p.status = 'active'` }],
    ['hot_deals', {
      label: 'Hot Deals',
      where: `p.status = 'active' AND (
        EXISTS (SELECT 1 FROM hot_deals hd WHERE hd.product_id = p.id AND hd.is_active = true)
        OR (p.sale_price IS NOT NULL AND p.sale_price < p.base_price)
        OR (p.discount_value IS NOT NULL AND p.discount_value > 0)
      )`,
    }],
    ['combo_products', { label: 'Combo Products', where: `p.status = 'active' AND p.is_combo = TRUE` }],
    ['featured_products', { label: 'Featured Flag Products', where: `p.status = 'active' AND p.is_featured = TRUE` }],
    ['popular_products', { label: 'Popular Products', where: `p.status = 'active' AND p.is_popular = TRUE` }],
    ['new_arrivals', { label: 'New Arrivals', where: `p.status = 'active' AND p.is_new_arrival = TRUE` }],
  ]);

  private normalizeSectionKey(sectionKey?: string) {
    const key = String(sectionKey || 'products_page').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!this.productOrderSections.has(key)) {
      throw new BadRequestException('Unsupported product ordering section');
    }
    return key;
  }

  private sectionOrderJoin(sectionKey: string) {
    return `LEFT JOIN product_section_orders pso ON pso.product_id = p.id AND pso.section_key = '${sectionKey.replace(/'/g, "''")}'`;
  }

  private sectionOrderClause(fallback = 'p.created_at DESC') {
    return `CASE WHEN pso.display_order IS NULL THEN 1 ELSE 0 END, pso.display_order ASC, ${fallback}`;
  }

  private availabilityJoin(alias = 'p') {
    return `LEFT JOIN LATERAL (
      SELECT
        SUM(v.available)::int AS available_stock,
        COALESCE(
          jsonb_object_agg(v.variant_key, v.available) FILTER (WHERE v.variant_key IS NOT NULL),
          '{}'::jsonb
        ) AS variant_stock
      FROM (
        SELECT
          sl.variant_key,
          SUM(GREATEST(COALESCE(sl.quantity, 0) - COALESCE(sl.reserved_quantity, 0), 0))::int AS available
        FROM stock_levels sl
        WHERE sl.product_id = ${alias}.id
        GROUP BY sl.variant_key
      ) v
    ) inv ON TRUE`;
  }

  private availabilitySelect(alias = 'p') {
    return `
      COALESCE(inv.available_stock, ${alias}.stock_quantity, 0)::int AS stock_quantity,
      COALESCE(inv.available_stock, ${alias}.stock_quantity, 0)::int AS total_available,
      (COALESCE(inv.available_stock, ${alias}.stock_quantity, 0) > 0) AS is_in_stock,
      COALESCE(inv.variant_stock, '{}'::jsonb) AS variant_stock,
      ${alias}.stock_quantity AS product_stock_quantity
    `;
  }

  private availabilityExpression(alias = 'p') {
    return `COALESCE(inv.available_stock, ${alias}.stock_quantity, 0)`;
  }

  async findAll() {
    try {
      // Use raw query with slug column included and JOIN with categories
      const rawResults = await this.productsRepository.query(`
        SELECT 
          p.id, p.slug, p.sku, p.product_code, 
          p.name_en, p.name_bn, p.description_en, p.short_description,
          p.category_id, 
          c.name_en as category_name,
          p.base_price, 
          p.base_price as price,
          p.base_price as selling_price,
          p.wholesale_price, 
          ${this.availabilitySelect('p')},
          p.display_position,
          p.additional_info,
          p.status, 
          COALESCE(p.image_url, pi.image_url) as image_url,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.brand,
          p.unit_of_measure,
          p.size_variants,
          p.created_at
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        LEFT JOIN categories c ON p.category_id = c.id
        ${this.sectionOrderJoin('products_page')}
        WHERE p.status = 'active'
        ORDER BY 
          CASE WHEN pso.display_order IS NULL THEN 1 ELSE 0 END,
          pso.display_order ASC,
          CASE WHEN p.display_position IS NOT NULL THEN 0 ELSE 1 END,
          p.display_position ASC,
          p.created_at DESC
        LIMIT 100
      `);
      return rawResults;
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      return [];
    }
  }

  async findAllPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    sort: string;
    minPrice?: number;
    maxPrice?: number;
    inStock: boolean;
    isCombo?: boolean;
    section?: string;
  }) {
    try {
      const { page, limit, search, category, sort, minPrice, maxPrice, inStock, isCombo } = params;
      const offset = (page - 1) * limit;
      const sectionKey = this.normalizeSectionKey(params.section || 'products_page');

      const conditions: string[] = [`p.status = 'active'`];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (search) {
        conditions.push(`(
          LOWER(p.name_en) LIKE $${paramIndex}
          OR LOWER(p.name_bn) LIKE $${paramIndex}
          OR LOWER(p.description_en) LIKE $${paramIndex}
          OR LOWER(p.sku) LIKE $${paramIndex}
          OR LOWER(c.name_en) LIKE $${paramIndex}
        )`);
        queryParams.push(`%${search.toLowerCase()}%`);
        paramIndex++;
      }

      if (category) {
        conditions.push(`c.slug = $${paramIndex}`);
        queryParams.push(category);
        paramIndex++;
      }

      if (minPrice !== undefined && !isNaN(minPrice)) {
        conditions.push(`COALESCE(p.sale_price, p.base_price) >= $${paramIndex}`);
        queryParams.push(minPrice);
        paramIndex++;
      }

      if (maxPrice !== undefined && !isNaN(maxPrice)) {
        conditions.push(`COALESCE(p.sale_price, p.base_price) <= $${paramIndex}`);
        queryParams.push(maxPrice);
        paramIndex++;
      }

      if (inStock) {
        conditions.push(`${this.availabilityExpression('p')} > 0`);
      }

      if (isCombo) {
        conditions.push(`p.is_combo = TRUE`);
      }

      const whereClause = conditions.join(' AND ');

      let orderClause: string;
      switch (sort) {
        case 'price-low':
          orderClause = 'COALESCE(p.sale_price, p.base_price) ASC';
          break;
        case 'price-high':
          orderClause = 'COALESCE(p.sale_price, p.base_price) DESC';
          break;
        case 'discount':
          orderClause = `CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.base_price
            THEN ((p.base_price - p.sale_price) / NULLIF(p.base_price, 0)) ELSE 0 END DESC`;
          break;
        case 'name':
          orderClause = 'p.name_en ASC';
          break;
        default:
          orderClause = this.sectionOrderClause(`CASE WHEN p.display_position IS NOT NULL THEN 0 ELSE 1 END,
            p.display_position ASC, p.created_at DESC`);
      }

      // Count total matching rows
      const countResult = await this.productsRepository.query(
        `SELECT COUNT(*)::int as total
         FROM products p
         ${this.availabilityJoin('p')}
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE ${whereClause}`,
        queryParams,
      );
      const total = countResult[0]?.total || 0;

      // Fetch paginated data
      const data = await this.productsRepository.query(
        `SELECT 
          p.id, p.slug, p.sku, p.product_code,
          p.name_en, p.name_bn, p.description_en, p.short_description,
          p.category_id,
          c.name_en as category_name,
          p.base_price,
          p.base_price as price,
          p.base_price as selling_price,
          p.wholesale_price,
          ${this.availabilitySelect('p')},
          p.display_position,
          p.additional_info,
          p.status,
          COALESCE(p.image_url, pi.image_url) as image_url,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.brand,
          p.unit_of_measure,
          p.size_variants,
          p.landing_page_delivery_charge,
          p.landing_page_delivery_charge_outside,
          p.created_at
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        LEFT JOIN categories c ON p.category_id = c.id
        ${this.sectionOrderJoin(sectionKey)}
        WHERE ${whereClause}
        ORDER BY ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset],
      );

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error in findAllPaginated:', error);
      return { data: [], total: 0, page: params.page, limit: params.limit, totalPages: 0 };
    }
  }

  async findAllAdmin() {
    try {
      console.log('Starting findAllAdmin query (includes inactive products)...');
      
      // Return ALL products including inactive ones for admin
      const rawResults = await this.productsRepository.query(`
        SELECT 
          p.id, p.slug, p.sku, p.product_code, 
          p.name_en, p.name_bn, p.description_en, p.short_description,
          p.category_id, 
          c.name_en as category_name,
          p.base_price, 
          p.base_price as price,
          p.base_price as selling_price,
          p.wholesale_price, 
          p.stock_quantity,
          p.display_position,
          p.additional_info,
          p.status, 
          COALESCE(p.image_url, pi.image_url) as image_url,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.brand,
          p.unit_of_measure,
          p.size_variants,
          p.landing_page_delivery_charge,
          p.landing_page_delivery_charge_outside,
          p.created_at
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.created_at DESC
      `);
      console.log(`findAllAdmin found ${rawResults.length} products`);
      
      return rawResults;
    } catch (error) {
      console.error('Error fetching all products for admin:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      return [];
    }
  }

  private normalizeSuggestionVariantName(value?: string | null) {
    const text = String(value || '').trim();
    return text.length > 0 ? text : null;
  }

  private async ensureProductSuggestionShortlistSchema() {
    if (!this.productSuggestionShortlistSchemaReady) {
      this.productSuggestionShortlistSchemaReady = (async () => {
        await this.productsRepository.query(`
          CREATE TABLE IF NOT EXISTS product_suggestion_shortlist (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            variant_name TEXT NULL,
            variant_key TEXT NOT NULL DEFAULT '',
            display_order INTEGER NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
            updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          )
        `);

        await this.productsRepository.query(`
          ALTER TABLE product_suggestion_shortlist
            ADD COLUMN IF NOT EXISTS variant_name TEXT NULL,
            ADD COLUMN IF NOT EXISTS variant_key TEXT,
            ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS created_by INTEGER NULL,
            ADD COLUMN IF NOT EXISTS updated_by INTEGER NULL,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        `);

        await this.productsRepository.query(`
          UPDATE product_suggestion_shortlist
          SET variant_key = COALESCE(variant_key, variant_name, '')
          WHERE variant_key IS NULL
        `);

        await this.productsRepository.query(`
          ALTER TABLE product_suggestion_shortlist
            ALTER COLUMN variant_key SET DEFAULT '',
            ALTER COLUMN variant_key SET NOT NULL
        `);

        await this.productsRepository.query(`
          DELETE FROM product_suggestion_shortlist newer
          USING product_suggestion_shortlist older
          WHERE newer.id > older.id
            AND newer.product_id = older.product_id
            AND COALESCE(newer.variant_key, '') = COALESCE(older.variant_key, '')
        `);

        await this.productsRepository.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'product_suggestion_shortlist_unique_entry'
                AND conrelid = 'product_suggestion_shortlist'::regclass
            ) THEN
              ALTER TABLE product_suggestion_shortlist
                ADD CONSTRAINT product_suggestion_shortlist_unique_entry UNIQUE (product_id, variant_key);
            END IF;
          END $$;
        `);

        await this.productsRepository.query(`
          CREATE INDEX IF NOT EXISTS idx_product_suggestion_shortlist_active_order
          ON product_suggestion_shortlist (is_active, display_order, created_at)
        `);

        await this.productsRepository.query(`
          CREATE INDEX IF NOT EXISTS idx_product_suggestion_shortlist_product
          ON product_suggestion_shortlist (product_id)
        `);
      })().catch((error) => {
        this.productSuggestionShortlistSchemaReady = undefined;
        throw error;
      });
    }

    return this.productSuggestionShortlistSchemaReady;
  }

  private async getNextSuggestionShortlistOrder() {
    await this.ensureProductSuggestionShortlistSchema();
    const rows = await this.productsRepository.query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM product_suggestion_shortlist`,
    );
    return Number(rows?.[0]?.next_order || 0);
  }

  async getProductSuggestionShortlist() {
    await this.ensureProductSuggestionShortlistSchema();
    const rows = await this.productsRepository.query(`
      SELECT
        pss.id,
        pss.product_id,
        pss.variant_name,
        pss.variant_key,
        pss.display_order,
        pss.is_active,
        pss.created_at,
        pss.updated_at,
        p.id AS product_id_check,
        p.slug,
        p.sku,
        p.product_code,
        p.name_en,
        p.name_bn,
        p.base_price,
        p.sale_price,
        p.stock_quantity,
        p.status,
        p.size_variants,
        COALESCE(p.image_url, pi.image_url) AS image_url,
        c.name_en AS category_name
      FROM product_suggestion_shortlist pss
      INNER JOIN products p ON p.id = pss.product_id
      LEFT JOIN LATERAL (
        SELECT image_url
        FROM product_images
        WHERE product_id = p.id
        ORDER BY is_primary DESC, display_order ASC
        LIMIT 1
      ) pi ON TRUE
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY pss.display_order ASC, pss.created_at ASC, pss.id ASC
    `);

    return (rows || []).map((row: any) => ({
      id: Number(row.id),
      productId: Number(row.product_id),
      variantName: row.variant_name || null,
      variantKey: row.variant_key || '',
      displayOrder: Number(row.display_order || 0),
      isActive: row.is_active !== false,
      slug: row.slug,
      sku: row.sku,
      productCode: row.product_code,
      name_en: row.name_en,
      name_bn: row.name_bn,
      base_price: row.base_price,
      price: row.base_price,
      sale_price: row.sale_price,
      stock_quantity: row.stock_quantity,
      status: row.status,
      size_variants: row.size_variants,
      image_url: row.image_url,
      category_name: row.category_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      suggestionOptionKey: `shortlist:${row.id}`,
      suggestionOptionLabel: `${row.name_en || row.name_bn || `Product #${row.product_id}`}${row.variant_name ? ` (${row.variant_name})` : ''}`,
    }));
  }

  async getProductSuggestionShortlistOptions() {
    const rows = await this.getProductSuggestionShortlist();
    return rows
      .filter((row: any) => row.isActive)
      .map((row: any) => ({
        ...row,
        id: row.productId,
        productId: row.productId,
        size_variants: [],
        suggestionVariantName: row.variantName,
      }));
  }

  async addProductSuggestionShortlistItem(data: { productId: number; variantName?: string | null; userId?: number | null }) {
    await this.ensureProductSuggestionShortlistSchema();

    if (!Number.isFinite(data.productId) || data.productId <= 0) {
      throw new BadRequestException('Invalid product');
    }

    const product = await this.productsRepository.findOne({ where: { id: data.productId } });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const variantName = this.normalizeSuggestionVariantName(data.variantName);
    const variantKey = variantName || '';
    const displayOrder = await this.getNextSuggestionShortlistOrder();

    const rows = await this.productsRepository.query(
      `INSERT INTO product_suggestion_shortlist
        (product_id, variant_name, variant_key, display_order, is_active, created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, $5, $5, NOW(), NOW())
       ON CONFLICT (product_id, variant_key) DO UPDATE SET
         is_active = TRUE,
         variant_name = EXCLUDED.variant_name,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING id`,
      [data.productId, variantName, variantKey, displayOrder, data.userId || null],
    );

    const id = Number(rows?.[0]?.id);
    const shortlist = await this.getProductSuggestionShortlist();
    return shortlist.find((item: any) => Number(item.id) === id) || { id };
  }

  async updateProductSuggestionShortlistItem(
    id: number,
    data: { isActive?: boolean; displayOrder?: number; userId?: number | null },
  ) {
    await this.ensureProductSuggestionShortlistSchema();

    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('Invalid shortlist item');
    }

    const updates: string[] = ['updated_at = NOW()', `updated_by = $2`];
    const params: any[] = [id, data.userId || null];
    if (typeof data.isActive === 'boolean') {
      params.push(data.isActive);
      updates.push(`is_active = $${params.length}`);
    }
    if (data.displayOrder != null && Number.isFinite(Number(data.displayOrder))) {
      params.push(Number(data.displayOrder));
      updates.push(`display_order = $${params.length}`);
    }
    if (updates.length <= 2) {
      throw new BadRequestException('Nothing to update');
    }

    await this.productsRepository.query(
      `UPDATE product_suggestion_shortlist SET ${updates.join(', ')} WHERE id = $1`,
      params,
    );

    const shortlist = await this.getProductSuggestionShortlist();
    const item = shortlist.find((row: any) => Number(row.id) === id);
    if (!item) throw new BadRequestException('Shortlist item not found');
    return item;
  }

  async deleteProductSuggestionShortlistItem(id: number) {
    await this.ensureProductSuggestionShortlistSchema();

    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('Invalid shortlist item');
    }
    await this.productsRepository.query(`DELETE FROM product_suggestion_shortlist WHERE id = $1`, [id]);
    return { success: true };
  }

  async getSectionOrder(sectionKeyInput: string) {
    const sectionKey = this.normalizeSectionKey(sectionKeyInput);
    const section = this.productOrderSections.get(sectionKey)!;

    const products = await this.productsRepository.query(`
      SELECT
        p.id,
        p.slug,
        p.sku,
        p.name_en,
        p.name_bn,
        p.base_price,
        p.sale_price,
        p.stock_quantity,
        p.status,
        c.name_en AS category_name,
        COALESCE(p.image_url, pi.image_url) AS image_url,
        pso.display_order
      FROM products p
      LEFT JOIN LATERAL (
        SELECT image_url
        FROM product_images
        WHERE product_id = p.id
        ORDER BY is_primary DESC, display_order ASC
        LIMIT 1
      ) pi ON TRUE
      LEFT JOIN categories c ON p.category_id = c.id
      ${this.sectionOrderJoin(sectionKey)}
      WHERE ${section.where}
      ORDER BY ${this.sectionOrderClause('p.created_at DESC')}
    `);

    return {
      sectionKey,
      label: section.label,
      products,
    };
  }

  async updateSectionOrder(sectionKeyInput: string, productIds: number[]) {
    const sectionKey = this.normalizeSectionKey(sectionKeyInput);
    const uniqueIds = Array.from(new Set(
      (productIds || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ));

    await this.productsRepository.manager.transaction(async (manager) => {
      await manager.query(`DELETE FROM product_section_orders WHERE section_key = $1`, [sectionKey]);

      for (let index = 0; index < uniqueIds.length; index += 1) {
        await manager.query(
          `INSERT INTO product_section_orders (section_key, product_id, display_order, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (section_key, product_id)
           DO UPDATE SET display_order = EXCLUDED.display_order, updated_at = NOW()`,
          [sectionKey, uniqueIds[index], index],
        );
      }
    });

    return {
      success: true,
      sectionKey,
      total: uniqueIds.length,
    };
  }

  async findAllCategories() {
    try {
      const categories = await this.productsRepository.query(`
        SELECT id, name_en, name_bn, slug, description, image_url, is_active, display_order
        FROM categories
        WHERE is_active = true
        ORDER BY display_order ASC, name_en ASC
      `);
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async findOne(id: string) {
    const numericId = parseInt(id, 10);
    if (!Number.isFinite(numericId)) {
      throw new BadRequestException('Invalid product id');
    }
    const result = await this.productsRepository.query(`
      SELECT 
        p.id, p.slug, p.sku, p.product_code, 
        p.name_en, p.name_bn, 
        p.description_en, p.description_bn, p.short_description,
        p.category_id,
        c.name_en as category_name,
        p.base_price, 
        p.base_price as price,
        p.base_price as selling_price,
        p.wholesale_price, 
        ${this.availabilitySelect('p')},
        p.display_position,
        p.brand, p.unit_of_measure, 
        COALESCE(p.image_url, pi.image_url) as image_url,
        p.status,
        p.additional_info,
        p.size_variants,
        p.discount_type,
        p.discount_value,
        p.sale_price,
        p.landing_page_delivery_charge,
        p.landing_page_delivery_charge_outside,
        p.created_at
      FROM products p
      LEFT JOIN LATERAL (
        SELECT image_url
        FROM product_images
        WHERE product_id = p.id
        ORDER BY is_primary DESC, display_order ASC
        LIMIT 1
      ) pi ON TRUE
      ${this.availabilityJoin('p')}
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1 
      LIMIT 1
    `, [numericId]);
    return result?.[0] || null;
  }

  async searchProducts(query: string, options?: { includeInactive?: boolean }) {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      const statusFilter = options?.includeInactive ? '' : `p.status = 'active' AND`;
      const results = await this.productsRepository.query(`
        SELECT 
          p.id, p.slug, p.sku, p.product_code, 
          p.name_en, p.name_bn, p.description_en, p.short_description,
          p.category_id, 
          c.name_en as category_name,
          p.base_price, 
          p.base_price as price,
          p.wholesale_price, 
          ${this.availabilitySelect('p')},
          COALESCE(p.image_url, pi.image_url) as image_url, 
          p.additional_info,
          p.status,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.brand,
          p.size_variants,
          p.landing_page_delivery_charge,
          p.landing_page_delivery_charge_outside
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ${statusFilter} (
            LOWER(p.name_en) LIKE $1 
            OR LOWER(p.name_bn) LIKE $1 
            OR LOWER(p.description_en) LIKE $1
            OR LOWER(p.sku) LIKE $1
            OR LOWER(c.name_en) LIKE $1
          )
        ORDER BY p.created_at DESC
        LIMIT 20
      `, [searchTerm]);
      
      return results || [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async findBySlug(slug: string) {
    try {
      const result = await this.productsRepository.query(`
        SELECT 
          p.id, p.slug, p.sku, p.product_code, 
          p.name_en, p.name_bn, 
          p.description_en, p.description_bn, p.short_description,
          p.category_id,
          c.name_en as category_name,
          p.base_price, 
          p.base_price as price,
          p.base_price as selling_price,
          p.wholesale_price, 
          ${this.availabilitySelect('p')},
          p.display_position,
          p.brand, p.unit_of_measure, 
          COALESCE(p.image_url, pi.image_url) as image_url,
          p.status,
          p.additional_info,
          p.size_variants,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.landing_page_delivery_charge,
          p.landing_page_delivery_charge_outside,
          p.created_at
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.slug = $1 
        LIMIT 1
      `, [slug]);
      
      if (result && result.length > 0) {
        return result[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching product by slug:', error);
      throw error;
    }
  }

  async create(createProductDto: any) {
    try {
      console.log('Creating product with data:', createProductDto);

      // If display_position is provided, shift existing products to make room
      if (createProductDto.display_position != null) {
        await this.shiftDisplayPositions(createProductDto.display_position);
      }
      
      // Generate UUID if not provided
      const productData = {
        ...createProductDto,
        uuid: createProductDto.uuid || null,
        name_bn: createProductDto.name_bn || null,
        description_en: createProductDto.description_en || null,
        description_bn: createProductDto.description_bn || null,
        product_code: createProductDto.product_code || null,
        brand: createProductDto.brand || null,
        unit_of_measure: createProductDto.unit_of_measure || null,
        wholesale_price: createProductDto.wholesale_price ?? null,
        sale_price: createProductDto.sale_price ?? null,
        image_url: createProductDto.image_url || null,
        stock_quantity: createProductDto.stock_quantity ?? null,
        display_position: createProductDto.display_position ?? null,
        status: createProductDto.status || 'active'
      };
      
      console.log('Processed product data:', productData);
      const product = this.productsRepository.create(productData);
      const saved = await this.productsRepository.save(product);
      const savedProduct = Array.isArray(saved) ? saved[0] : saved;
      console.log('Product created successfully:', savedProduct?.id);
      return saved;
    } catch (error: any) {
      console.error('Error creating product:', error);
      if (error?.code) {
        console.error('Database error code:', error.code);
      }
      if (error?.detail) {
        console.error('Error detail:', error.detail);
      }
      throw error;
    }
  }

  async update(id: string, updateProductDto: any) {
    try {
      console.log('Updating product:', id, updateProductDto);

      // If display_position is being changed, shift other products
      if (updateProductDto.display_position !== undefined) {
        const numericId = parseInt(id, 10);
        const existingProduct = await this.productsRepository.findOne({ where: { id: numericId } });
        if (existingProduct && existingProduct.display_position !== updateProductDto.display_position) {
          if (updateProductDto.display_position != null) {
            await this.shiftDisplayPositions(updateProductDto.display_position, numericId);
          }
        }
      }

      const result = await this.productsRepository.update(parseInt(id), updateProductDto);
      console.log('Update result:', result);
      return this.findOne(id);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Shift display_position of products >= the given position by +1
   * Optionally exclude a specific product ID (useful for updates)
   */
  private async shiftDisplayPositions(fromPosition: number, excludeId?: number): Promise<void> {
    let query = this.productsRepository
      .createQueryBuilder()
      .update(Product)
      .set({ display_position: () => 'display_position + 1' })
      .where('display_position >= :fromPosition', { fromPosition })
      .andWhere('display_position IS NOT NULL');
    
    if (excludeId) {
      query = query.andWhere('id != :excludeId', { excludeId });
    }
    
    await query.execute();
  }

  async remove(id: string) {
    return this.productsRepository.delete(parseInt(id));
  }

  // Homepage Features
  async findDealOfDay() {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, p.base_price, p.selling_price, 
               p.deal_price, p.deal_expires_at,
               COALESCE(p.image_url, pi.image_url) as image_url,
               ${this.availabilitySelect('p')},
               p.status
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        WHERE is_deal_of_day = TRUE 
          AND status = 'active'
          AND (deal_expires_at IS NULL OR deal_expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 10
      `);
      return results;
    } catch (error) {
      console.error('Error fetching deal of day products:', error);
      return [];
    }
  }

  async findPopular() {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, p.base_price, p.selling_price,
               COALESCE(p.image_url, pi.image_url) as image_url,
               ${this.availabilitySelect('p')},
               p.status
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        ${this.sectionOrderJoin('popular_products')}
        WHERE is_popular = TRUE AND status = 'active'
        ORDER BY ${this.sectionOrderClause('p.created_at DESC')}
        LIMIT 8
      `);
      return results;
    } catch (error) {
      console.error('Error fetching popular products:', error);
      return [];
    }
  }

  async findNewArrivals() {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, p.base_price, p.selling_price,
               COALESCE(p.image_url, pi.image_url) as image_url,
               ${this.availabilitySelect('p')},
               p.status
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        ${this.sectionOrderJoin('new_arrivals')}
        WHERE is_new_arrival = TRUE AND status = 'active'
        ORDER BY ${this.sectionOrderClause('p.created_at DESC')}
        LIMIT 8
      `);
      return results;
    } catch (error) {
      console.error('Error fetching new arrival products:', error);
      return [];
    }
  }

  async findFeatured() {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, p.base_price, p.selling_price,
               COALESCE(p.image_url, pi.image_url) as image_url,
               ${this.availabilitySelect('p')},
               p.status
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        ${this.sectionOrderJoin('featured_products')}
        WHERE is_featured = TRUE AND status = 'active'
        ORDER BY ${this.sectionOrderClause('p.created_at DESC')}
        LIMIT 8
      `);
      return results;
    } catch (error) {
      console.error('Error fetching featured products:', error);
      return [];
    }
  }

  async findComboProducts() {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en,
               p.base_price, p.sale_price, ${this.availabilitySelect('p')}, p.size_variants,
               COALESCE(p.image_url, pi.image_url) as image_url,
               p.status, c.name_en as category_name
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        LEFT JOIN categories c ON p.category_id = c.id
        ${this.sectionOrderJoin('combo_products')}
        WHERE p.is_combo = TRUE AND p.status = 'active'
        ORDER BY ${this.sectionOrderClause('p.display_position ASC NULLS LAST, p.created_at DESC')}
        LIMIT 8
      `);
      return results;
    } catch (error) {
      console.error('Error fetching combo products:', error);
      return [];
    }
  }

  async findRelated(productId: number, limit: number = 4) {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, 
               p.base_price, p.sale_price, p.discount_type, p.discount_value,
               COALESCE(p.image_url, pi.image_url) as image_url,
               p.status, ${this.availabilitySelect('p')}, c.name_en as category_name
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active' 
          AND p.id != $1
          AND p.category_id = (SELECT category_id FROM products WHERE id = $1)
        ORDER BY RANDOM()
        LIMIT $2
      `, [productId, limit]);
      return results;
    } catch (error) {
      console.error('Error fetching related products:', error);
      return [];
    }
  }

  async findSuggested(limit: number = 4) {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, p.base_price, p.sale_price, p.discount_type, p.discount_value,
               COALESCE(p.image_url, pi.image_url) as image_url,
               p.status, ${this.availabilitySelect('p')}, c.name_en as category_name
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active'
        ORDER BY RANDOM()
        LIMIT $1
      `, [limit]);
      return results;
    } catch (error) {
      console.error('Error fetching suggested products:', error);
      return [];
    }
  }

  async findRecentlyViewed(userId?: number, sessionId?: string, limit: number = 8) {
    try {
      let query = `
        SELECT DISTINCT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, 
               p.base_price, p.selling_price,
               COALESCE(p.image_url, pi.image_url) as image_url,
               ${this.availabilitySelect('p')},
               p.status, upv.viewed_at
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        INNER JOIN user_product_views upv ON p.id = upv.product_id
        WHERE p.status = 'active'
      `;
      
      const params: any[] = [];
      if (userId) {
        query += ` AND upv.user_id = $1`;
        params.push(userId);
      } else if (sessionId) {
        query += ` AND upv.session_id = $1`;
        params.push(sessionId);
      }
      
      query += ` ORDER BY upv.viewed_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const results = await this.productsRepository.query(query, params);
      return results;
    } catch (error) {
      console.error('Error fetching recently viewed products:', error);
      return [];
    }
  }

  // Product Images Methods
  async getProductImages(productId: number) {
    try {
      console.log('Fetching images for product ID:', productId);
      const images = await this.productsRepository.query(`
        SELECT id, product_id, image_url, display_order, is_primary, created_at
        FROM product_images
        WHERE product_id = $1
        ORDER BY is_primary DESC, display_order ASC
      `, [productId]);
      console.log('Found images:', images.length, images);
      return images;
    } catch (error) {
      console.error('Error fetching product images:', error);
      return [];
    }
  }

  async addProductImage(productId: number, imageData: { image_url: string; display_order?: number; is_primary?: boolean }) {
    try {
      // If this is to be set as primary, unset any existing primary image
      if (imageData.is_primary) {
        await this.productsRepository.query(`
          UPDATE product_images SET is_primary = FALSE WHERE product_id = $1
        `, [productId]);
      }

      const result = await this.productsRepository.query(`
        INSERT INTO product_images (product_id, image_url, display_order, is_primary)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        productId,
        imageData.image_url,
        imageData.display_order || 0,
        imageData.is_primary || false
      ]);
      return result[0];
    } catch (error) {
      console.error('Error adding product image:', error);
      throw error;
    }
  }

  async deleteProductImage(imageId: number) {
    try {
      await this.productsRepository.query(`
        DELETE FROM product_images WHERE id = $1
      `, [imageId]);
      return { success: true, message: 'Image deleted successfully' };
    } catch (error) {
      console.error('Error deleting product image:', error);
      throw error;
    }
  }

  async updateProductImage(imageId: number, imageData: { display_order?: number; is_primary?: boolean }) {
    try {
      // If setting as primary, get the product_id first and unset others
      if (imageData.is_primary) {
        const currentImage = await this.productsRepository.query(`
          SELECT product_id FROM product_images WHERE id = $1
        `, [imageId]);
        
        if (currentImage.length > 0) {
          await this.productsRepository.query(`
            UPDATE product_images SET is_primary = FALSE WHERE product_id = $1
          `, [currentImage[0].product_id]);
        }
      }

      const updateFields: string[] = [];
      const params: any[] = [];
      let paramCounter = 1;

      if (imageData.display_order !== undefined) {
        updateFields.push(`display_order = $${paramCounter}`);
        params.push(imageData.display_order);
        paramCounter++;
      }

      if (imageData.is_primary !== undefined) {
        updateFields.push(`is_primary = $${paramCounter}`);
        params.push(imageData.is_primary);
        paramCounter++;
      }

      if (updateFields.length === 0) {
        return { success: false, message: 'No fields to update' };
      }

      params.push(imageId);
      const result = await this.productsRepository.query(`
        UPDATE product_images 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `, params);

      return result[0];
    } catch (error) {
      console.error('Error updating product image:', error);
      throw error;
    }
  }

  // Deal of the Day methods
  async getDealOfTheDay() {
    try {
      console.log('🔍 Fetching active deal from database...');
      const deal = await this.dealOfTheDayRepository.findOne({
        where: { is_active: true },
      });

      console.log('📦 Deal found:', deal);

      if (!deal) {
        console.log('⚠️ No active deal found in database');
        return null;
      }

      if (!deal.product_id || deal.product_id === null || isNaN(Number(deal.product_id))) {
        console.log('⚠️ Deal exists but product_id is invalid:', deal.product_id);
        return null;
      }

      // Check if deal has expired
      if (deal.end_date && new Date(deal.end_date) < new Date()) {
        console.log('⏰ Deal has expired, deactivating...');
        await this.dealOfTheDayRepository.update(deal.id, { is_active: false });
        return null;
      }

      // Get full product details with category
      console.log('🔍 Fetching product with ID:', deal.product_id);
      
      const productDetails = await this.productsRepository.query(`
        SELECT 
          p.id, p.slug, p.sku, p.name_en, p.name_bn, 
          p.base_price, p.sale_price, p.discount_type, p.discount_value,
          p.brand, p.image_url, ${this.availabilitySelect('p')}, p.status,
          c.name_en as category_name
        FROM products p
        ${this.availabilityJoin('p')}
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1 AND p.status = 'active'
      `, [Number(deal.product_id)]);

      console.log('✅ Product details fetched:', productDetails[0] ? 'Found' : 'Not found');
      return productDetails[0] || null;
    } catch (error) {
      console.error('❌ Error fetching deal of the day:', error);
      return null;
    }
  }

  async setDealOfTheDay(productId: number, endDate?: Date) {
    try {
      // Deactivate all existing deals
      await this.dealOfTheDayRepository.update(
        { is_active: true },
        { is_active: false }
      );

      // Create new deal
      const deal = this.dealOfTheDayRepository.create({
        product_id: productId,
        start_date: new Date(),
        end_date: endDate,
        is_active: true,
      });

      return await this.dealOfTheDayRepository.save(deal);
    } catch (error) {
      console.error('Error setting deal of the day:', error);
      throw error;
    }
  }

  async removeDealOfTheDay() {
    try {
      await this.dealOfTheDayRepository.update(
        { is_active: true },
        { is_active: false }
      );
      return { success: true, message: 'Deal of the day removed' };
    } catch (error) {
      console.error('Error removing deal of the day:', error);
      throw error;
    }
  }

  // ==================== HOT DEALS ====================

  async getHotDeals() {
    try {
      const deals = await this.hotDealRepository.query(`
        SELECT 
          hd.id, hd.product_id, hd.special_price, hd.discount_percent,
          hd.display_order, hd.start_date, hd.end_date, hd.is_active,
          hd.created_at, hd.updated_at,
          p.name_en, p.name_bn, p.slug, p.sku, p.base_price, p.sale_price,
          p.image_url, p.stock_quantity, p.status as product_status,
          c.name_en as category_name
        FROM hot_deals hd
        JOIN products p ON hd.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY hd.display_order ASC, hd.created_at DESC
      `);
      return deals;
    } catch (error) {
      console.error('Error fetching hot deals:', error);
      return [];
    }
  }

  async getActiveHotDeals() {
    try {
      const now = new Date();
      const deals = await this.hotDealRepository.query(`
        SELECT 
          hd.id, hd.product_id, hd.special_price, hd.discount_percent,
          hd.display_order, hd.start_date, hd.end_date, hd.is_active,
          p.name_en, p.name_bn, p.slug, p.sku, p.base_price, p.sale_price,
          p.image_url, ${this.availabilitySelect('p')},
          c.name_en as category_name
        FROM hot_deals hd
        JOIN products p ON hd.product_id = p.id
        ${this.availabilityJoin('p')}
        LEFT JOIN categories c ON p.category_id = c.id
        ${this.sectionOrderJoin('hot_deals')}
        WHERE hd.is_active = true
          AND p.status = 'active'
          AND (hd.start_date IS NULL OR hd.start_date <= $1)
          AND (hd.end_date IS NULL OR hd.end_date >= $1)
        ORDER BY CASE WHEN pso.display_order IS NULL THEN 1 ELSE 0 END, pso.display_order ASC, hd.display_order ASC, hd.created_at DESC
      `, [now]);
      return deals;
    } catch (error) {
      console.error('Error fetching active hot deals:', error);
      return [];
    }
  }

  async addHotDeal(data: {
    productId: number;
    specialPrice?: number;
    discountPercent?: number;
    displayOrder?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      // Check if product already exists in hot deals
      const existing = await this.hotDealRepository.findOne({
        where: { product_id: data.productId }
      });
      if (existing) {
        throw new BadRequestException('Product is already in hot deals');
      }

      const hotDeal = this.hotDealRepository.create({
        product_id: data.productId,
        special_price: data.specialPrice,
        discount_percent: data.discountPercent,
        display_order: data.displayOrder || 0,
        start_date: data.startDate,
        end_date: data.endDate,
        is_active: true,
      });

      return await this.hotDealRepository.save(hotDeal);
    } catch (error) {
      console.error('Error adding hot deal:', error);
      throw error;
    }
  }

  async updateHotDeal(id: number, data: {
    specialPrice?: number;
    discountPercent?: number;
    displayOrder?: number;
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
  }) {
    try {
      const hotDeal = await this.hotDealRepository.findOne({ where: { id } });
      if (!hotDeal) {
        throw new BadRequestException('Hot deal not found');
      }

      if (data.specialPrice !== undefined) hotDeal.special_price = data.specialPrice;
      if (data.discountPercent !== undefined) hotDeal.discount_percent = data.discountPercent;
      if (data.displayOrder !== undefined) hotDeal.display_order = data.displayOrder;
      if (data.startDate !== undefined) hotDeal.start_date = data.startDate;
      if (data.endDate !== undefined) hotDeal.end_date = data.endDate;
      if (data.isActive !== undefined) hotDeal.is_active = data.isActive;

      return await this.hotDealRepository.save(hotDeal);
    } catch (error) {
      console.error('Error updating hot deal:', error);
      throw error;
    }
  }

  async removeHotDeal(id: number) {
    try {
      const result = await this.hotDealRepository.delete(id);
      return { success: true, message: 'Hot deal removed', affected: result.affected };
    } catch (error) {
      console.error('Error removing hot deal:', error);
      throw error;
    }
  }

  async toggleHotDealStatus(id: number) {
    try {
      const hotDeal = await this.hotDealRepository.findOne({ where: { id } });
      if (!hotDeal) {
        throw new BadRequestException('Hot deal not found');
      }

      hotDeal.is_active = !hotDeal.is_active;
      return await this.hotDealRepository.save(hotDeal);
    } catch (error) {
      console.error('Error toggling hot deal status:', error);
      throw error;
    }
  }

  async getSuggestions(productId: number): Promise<any[]> {
    try {
      const results = await this.productsRepository.query(`
        SELECT 
          p.id, p.slug, p.sku, p.product_code, 
          p.name_en, p.name_bn, p.short_description,
          p.category_id,
          p.base_price, 
          p.base_price as price,
          p.wholesale_price, 
          ${this.availabilitySelect('p')},
          COALESCE(p.image_url, pi.image_url) as image_url,
          p.status,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.landing_page_delivery_charge,
          p.landing_page_delivery_charge_outside
        FROM product_suggestions ps
        INNER JOIN products p ON ps.suggested_product_id = p.id
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        ${this.availabilityJoin('p')}
        WHERE ps.product_id = $1 AND p.status = 'active'
        ORDER BY ps.display_order ASC, ps.created_at ASC
      `, [productId]);
      return results || [];
    } catch (error) {
      console.error('Error fetching product suggestions:', error);
      return [];
    }
  }

  async updateSuggestions(productId: number, suggestedProductIds: number[]): Promise<{ success: boolean }> {
    try {
      await this.productsRepository.manager.transaction(async (manager) => {
        // Delete existing suggestions
        await manager.query(
          `DELETE FROM product_suggestions WHERE product_id = $1`,
          [productId]
        );

        // Insert new suggestions
        for (let index = 0; index < suggestedProductIds.length; index++) {
          const suggestedId = suggestedProductIds[index];
          await manager.query(
            `INSERT INTO product_suggestions (product_id, suggested_product_id, display_order, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())`,
            [productId, suggestedId, index]
          );
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating suggestions:', error);
      throw error;
    }
  }
}
