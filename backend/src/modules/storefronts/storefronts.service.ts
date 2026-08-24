import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Storefront } from './storefront.entity';
import { StorefrontCategory } from './storefront-category.entity';
import { StorefrontProduct } from './storefront-product.entity';
import { Product } from '../products/product.entity';
import { SalesOrder } from '../sales/sales-order.entity';

// Orders in these states don't count as performance
const EXCLUDED_ORDER_STATUSES = ['cancelled', 'admin_cancelled'];

export interface PublicStorefrontProduct {
  id: number;
  product_id: number;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  base_price: number;
  sale_price: number | null;
  stock_quantity: number | null;
  size_variants: any[];
  storefront_category_id: number | null;
  is_featured: boolean;
  sort_order: number;
}

@Injectable()
export class StorefrontsService {
  constructor(
    @InjectRepository(Storefront)
    private readonly storefrontRepo: Repository<Storefront>,
    @InjectRepository(StorefrontCategory)
    private readonly categoryRepo: Repository<StorefrontCategory>,
    @InjectRepository(StorefrontProduct)
    private readonly listingRepo: Repository<StorefrontProduct>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(SalesOrder)
    private readonly salesOrderRepo: Repository<SalesOrder>,
  ) {}

  // ─── Performance (admin dashboard) ───────────────────────

  /**
   * Orders and revenue per storefront (by order_source) and per landing
   * page (by utm_source where utm_medium = 'landing_page'), within an
   * optional trailing window. Views live on landing_pages rows and are
   * lifetime numbers — the frontend merges and labels them accordingly.
   */
  async performanceSummary(days: number | null) {
    const from = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

    const applyWindow = (qb: any) => {
      qb.andWhere('o.status NOT IN (:...excluded)', { excluded: EXCLUDED_ORDER_STATUSES });
      if (from) qb.andWhere('o.created_at >= :from', { from });
      return qb;
    };

    const storefronts = await this.storefrontRepo.find({ order: { id: 'ASC' } });
    const storefrontRows = storefronts.length
      ? await applyWindow(
          this.salesOrderRepo
            .createQueryBuilder('o')
            .select('o.order_source', 'slug')
            .addSelect('COUNT(*)', 'orders')
            .addSelect('COALESCE(SUM(o.total_amount), 0)', 'revenue')
            .where('o.order_source IN (:...slugs)', { slugs: storefronts.map((s) => s.slug) }),
        )
          .groupBy('o.order_source')
          .getRawMany()
      : [];
    const sfStats = new Map<string, { orders: any; revenue: any }>(
      storefrontRows.map((r: any) => [r.slug, r]),
    );

    const landingRows = await applyWindow(
      this.salesOrderRepo
        .createQueryBuilder('o')
        .select('o.utm_source', 'slug')
        .addSelect('COUNT(*)', 'orders')
        .addSelect('COALESCE(SUM(o.total_amount), 0)', 'revenue')
        .where("o.utm_medium = 'landing_page'")
        .andWhere('o.utm_source IS NOT NULL'),
    )
      .groupBy('o.utm_source')
      .getRawMany();

    return {
      days,
      storefronts: storefronts.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        domain: s.domain,
        is_active: s.is_active,
        orders: Number(sfStats.get(s.slug)?.orders || 0),
        revenue: Number(sfStats.get(s.slug)?.revenue || 0),
      })),
      landing_pages: landingRows.map((r: any) => ({
        slug: r.slug,
        orders: Number(r.orders || 0),
        revenue: Number(r.revenue || 0),
      })),
    };
  }

  // ─── Storefront CRUD (admin) ─────────────────────────────

  findAll(): Promise<Storefront[]> {
    return this.storefrontRepo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Storefront> {
    const storefront = await this.storefrontRepo.findOne({ where: { id } });
    if (!storefront) throw new NotFoundException(`Storefront ${id} not found`);
    return storefront;
  }

  async create(data: Partial<Storefront>): Promise<Storefront> {
    if (data.slug) {
      const existing = await this.storefrontRepo.findOne({ where: { slug: data.slug } });
      if (existing) throw new ConflictException(`Slug "${data.slug}" already in use`);
    }
    const storefront = this.storefrontRepo.create(data);
    return this.storefrontRepo.save(storefront);
  }

  async update(id: number, data: Partial<Storefront>): Promise<Storefront> {
    const storefront = await this.findOne(id);
    // Slug is written into historical orders' order_source — never silently change it
    if (data.slug && data.slug !== storefront.slug) {
      const existing = await this.storefrontRepo.findOne({ where: { slug: data.slug } });
      if (existing) throw new ConflictException(`Slug "${data.slug}" already in use`);
    }
    Object.assign(storefront, data);
    return this.storefrontRepo.save(storefront);
  }

  async remove(id: number): Promise<void> {
    const storefront = await this.findOne(id);
    await this.listingRepo.delete({ storefront_id: id });
    await this.categoryRepo.delete({ storefront_id: id });
    await this.storefrontRepo.remove(storefront);
  }

  // ─── Categories (admin) ──────────────────────────────────

  findCategories(storefrontId: number): Promise<StorefrontCategory[]> {
    return this.categoryRepo.find({
      where: { storefront_id: storefrontId },
      order: { sort_order: 'ASC', id: 'ASC' },
    });
  }

  async createCategory(
    storefrontId: number,
    data: Partial<StorefrontCategory>,
  ): Promise<StorefrontCategory> {
    const category = this.categoryRepo.create({ ...data, storefront_id: storefrontId });
    return this.categoryRepo.save(category);
  }

  async updateCategory(
    storefrontId: number,
    categoryId: number,
    data: Partial<StorefrontCategory>,
  ): Promise<StorefrontCategory> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, storefront_id: storefrontId },
    });
    if (!category) throw new NotFoundException(`Category ${categoryId} not found`);
    // storefront_id is immutable — a category never moves between storefronts
    const { storefront_id: _ignored, id: _id, ...rest } = data as any;
    Object.assign(category, rest);
    return this.categoryRepo.save(category);
  }

  async removeCategory(storefrontId: number, categoryId: number): Promise<void> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, storefront_id: storefrontId },
    });
    if (!category) throw new NotFoundException(`Category ${categoryId} not found`);
    // Detach products from the category, keep them listed on the storefront
    await this.listingRepo.update(
      { storefront_id: storefrontId, storefront_category_id: categoryId },
      { storefront_category_id: null as any },
    );
    await this.categoryRepo.remove(category);
  }

  // ─── Product listings (admin) ────────────────────────────

  findListings(storefrontId: number): Promise<StorefrontProduct[]> {
    return this.listingRepo.find({
      where: { storefront_id: storefrontId },
      relations: ['product'],
      order: { sort_order: 'ASC', id: 'ASC' },
    });
  }

  async addProduct(
    storefrontId: number,
    data: { product_id: number; storefront_category_id?: number },
  ): Promise<StorefrontProduct> {
    const product = await this.productRepo.findOne({ where: { id: data.product_id } });
    if (!product) throw new NotFoundException(`Product ${data.product_id} not found in inventory`);

    const existing = await this.listingRepo.findOne({
      where: { storefront_id: storefrontId, product_id: data.product_id },
    });
    if (existing) throw new ConflictException('Product is already listed on this storefront');

    const listing = this.listingRepo.create({
      storefront_id: storefrontId,
      product_id: data.product_id,
      storefront_category_id: data.storefront_category_id ?? null as any,
    });
    return this.listingRepo.save(listing);
  }

  async updateListing(
    storefrontId: number,
    listingId: number,
    data: Partial<StorefrontProduct>,
  ): Promise<StorefrontProduct> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId, storefront_id: storefrontId },
    });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);
    const { storefront_id: _sf, product_id: _pid, id: _id, product: _p, ...rest } = data as any;
    Object.assign(listing, rest);
    return this.listingRepo.save(listing);
  }

  async removeListing(storefrontId: number, listingId: number): Promise<void> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId, storefront_id: storefrontId },
    });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);
    await this.listingRepo.remove(listing);
  }

  // ─── Public API (consumed by storefront websites) ────────

  async findActiveBySlug(slug: string): Promise<Storefront | null> {
    return this.storefrontRepo.findOne({ where: { slug, is_active: true } });
  }

  /** Storefront config + active category tree, keyed by slug. Tokens stripped. */
  async getPublicConfig(slug: string) {
    const storefront = await this.findActiveBySlug(slug);
    if (!storefront) throw new NotFoundException(`Storefront "${slug}" not found`);

    const categories = await this.categoryRepo.find({
      where: { storefront_id: storefront.id, is_active: true },
      order: { sort_order: 'ASC', id: 'ASC' },
    });

    // Never expose the CAPI access token publicly
    const { meta_capi_access_token, ...publicStorefront } = storefront as any;
    return { ...publicStorefront, categories };
  }

  /** Published products with inventory data joined in. */
  async getPublicProducts(
    slug: string,
    opts: { category?: string; search?: string; featured?: boolean } = {},
  ): Promise<PublicStorefrontProduct[]> {
    const storefront = await this.findActiveBySlug(slug);
    if (!storefront) throw new NotFoundException(`Storefront "${slug}" not found`);

    const qb = this.listingRepo
      .createQueryBuilder('listing')
      .innerJoinAndSelect('listing.product', 'product')
      .where('listing.storefront_id = :sfId', { sfId: storefront.id })
      .andWhere('listing.is_published = true')
      .andWhere("product.status = 'active'")
      .orderBy('listing.sort_order', 'ASC')
      .addOrderBy('listing.id', 'ASC');

    if (opts.featured) {
      qb.andWhere('listing.is_featured = true');
    }

    if (opts.category) {
      const category = await this.categoryRepo.findOne({
        where: { storefront_id: storefront.id, slug: opts.category },
      });
      if (!category) return [];
      qb.andWhere('listing.storefront_category_id = :catId', { catId: category.id });
    }

    if (opts.search) {
      qb.andWhere('(product.name_en ILIKE :q OR product.name_bn ILIKE :q)', {
        q: `%${opts.search}%`,
      });
    }

    const listings = await qb.getMany();
    return listings.map((listing) => this.toPublicProduct(listing));
  }

  /** Single product detail by the product's inventory slug. */
  async getPublicProduct(slug: string, productSlug: string): Promise<PublicStorefrontProduct> {
    const storefront = await this.findActiveBySlug(slug);
    if (!storefront) throw new NotFoundException(`Storefront "${slug}" not found`);

    const listing = await this.listingRepo
      .createQueryBuilder('listing')
      .innerJoinAndSelect('listing.product', 'product')
      .where('listing.storefront_id = :sfId', { sfId: storefront.id })
      .andWhere('listing.is_published = true')
      .andWhere('product.slug = :productSlug', { productSlug })
      .getOne();

    if (!listing) throw new NotFoundException(`Product "${productSlug}" not found on this storefront`);
    return this.toPublicProduct(listing);
  }

  private toPublicProduct(listing: StorefrontProduct): PublicStorefrontProduct {
    const p = listing.product;
    return {
      id: listing.id,
      product_id: p.id,
      name: p.name_en,
      slug: p.slug,
      short_description: p.short_description || null,
      description: p.description_en || null,
      image_url: p.image_url || null,
      base_price: Number(p.base_price),
      sale_price: p.sale_price != null ? Number(p.sale_price) : null,
      stock_quantity: p.stock_quantity,
      size_variants: p.size_variants || [],
      storefront_category_id: listing.storefront_category_id,
      is_featured: listing.is_featured,
      sort_order: listing.sort_order,
    };
  }
}
