import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { Product } from '../products/product.entity';
import { Category } from '../categories/category.entity';
import { BlogPost } from '../blog/blog-post.entity';

import {
  SitemapUrl,
  SitemapIndex,
  SitemapConfig,
  ProductFeedItem,
  RssFeedItem,
} from './types/sitemap.types';
import {
  buildSitemapXml,
  buildSitemapIndexXml,
  buildRobotsTxt,
} from './utils/xml-builder';
import {
  buildUrl,
  ensureAbsoluteUrl,
  formatPrice,
  formatW3CDate,
  stripHtml,
  truncate,
  escapeXml,
} from './utils/xml-helpers';

@Injectable()
export class SitemapFeedService {
  private readonly logger = new Logger(SitemapFeedService.name);
  private readonly config: SitemapConfig;

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    @InjectRepository(BlogPost)
    private readonly blogPostRepo: Repository<BlogPost>,

    private readonly configService: ConfigService,
  ) {
    this.config = {
      baseUrl:
        this.configService.get<string>('SITE_BASE_URL') ||
        'https://www.trustcart.com.bd',
      defaultChangeFreq: 'daily',
      defaultPriority: 0.5,
      maxUrlsPerSitemap: 50000,
      currency: this.configService.get<string>('CURRENCY') || 'BDT',
    };
  }

  // ──────────────────────────────────────────────────────────
  //  SITEMAP INDEX  (/sitemap.xml)
  // ──────────────────────────────────────────────────────────

  async generateSitemapIndex(apiBaseUrl: string): Promise<string> {
    const now = new Date().toISOString();
    const sitemaps: SitemapIndex[] = [
      { loc: `${apiBaseUrl}/sitemap-pages.xml`, lastmod: now },
      { loc: `${apiBaseUrl}/sitemap-products.xml`, lastmod: now },
      { loc: `${apiBaseUrl}/sitemap-categories.xml`, lastmod: now },
      { loc: `${apiBaseUrl}/sitemap-blog.xml`, lastmod: now },
    ];
    return buildSitemapIndexXml(sitemaps);
  }

  // ──────────────────────────────────────────────────────────
  //  STATIC PAGES SITEMAP  (/sitemap-pages.xml)
  // ──────────────────────────────────────────────────────────

  async generatePagesSitemap(): Promise<string> {
    const { baseUrl } = this.config;
    const urls: SitemapUrl[] = [
      {
        loc: baseUrl,
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      },
      {
        loc: buildUrl(baseUrl, '/shop'),
        changefreq: 'daily',
        priority: 0.9,
      },
      {
        loc: buildUrl(baseUrl, '/categories'),
        changefreq: 'weekly',
        priority: 0.8,
      },
      {
        loc: buildUrl(baseUrl, '/blog'),
        changefreq: 'daily',
        priority: 0.7,
      },
      {
        loc: buildUrl(baseUrl, '/about'),
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: buildUrl(baseUrl, '/contact'),
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: buildUrl(baseUrl, '/offers'),
        changefreq: 'daily',
        priority: 0.8,
      },
    ];
    return buildSitemapXml(urls);
  }

  // ──────────────────────────────────────────────────────────
  //  PRODUCTS SITEMAP  (/sitemap-products.xml)
  // ──────────────────────────────────────────────────────────

  async generateProductsSitemap(): Promise<string> {
    const { baseUrl } = this.config;

    const products = await this.productRepo.query(`
      SELECT p.id, p.slug, p.name_en, p.image_url, p.updated_at,
             COALESCE(
               json_agg(json_build_object('url', pi.image_url))
               FILTER (WHERE pi.id IS NOT NULL), '[]'
             ) AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `);

    const urls: SitemapUrl[] = products.map((p: any) => {
      const images =
        p.images && Array.isArray(p.images)
          ? p.images
              .filter((img: any) => img.url)
              .map((img: any) => ({
                loc: ensureAbsoluteUrl(img.url, baseUrl),
                title: p.name_en,
              }))
          : [];

      // Include main image if present
      if (p.image_url) {
        images.unshift({
          loc: ensureAbsoluteUrl(p.image_url, baseUrl),
          title: p.name_en,
        });
      }

      return {
        loc: buildUrl(baseUrl, `/product/${p.slug}`),
        lastmod: p.updated_at,
        changefreq: 'daily' as const,
        priority: 0.8,
        images,
      };
    });

    this.logger.log(`Generated products sitemap with ${urls.length} URLs`);
    return buildSitemapXml(urls);
  }

  // ──────────────────────────────────────────────────────────
  //  CATEGORIES SITEMAP  (/sitemap-categories.xml)
  // ──────────────────────────────────────────────────────────

  async generateCategoriesSitemap(): Promise<string> {
    const { baseUrl } = this.config;

    const categories = await this.categoryRepo.find({
      where: { is_active: true },
      order: { display_order: 'ASC' },
    });

    const urls: SitemapUrl[] = categories.map((cat) => {
      const entry: SitemapUrl = {
        loc: buildUrl(baseUrl, `/category/${cat.slug}`),
        lastmod: cat.updated_at
          ? (cat.updated_at as any).toISOString?.() ||
            String(cat.updated_at)
          : undefined,
        changefreq: 'weekly',
        priority: 0.7,
      };
      if (cat.image_url) {
        entry.images = [
          {
            loc: ensureAbsoluteUrl(cat.image_url, baseUrl),
            title: cat.name_en,
          },
        ];
      }
      return entry;
    });

    this.logger.log(`Generated categories sitemap with ${urls.length} URLs`);
    return buildSitemapXml(urls);
  }

  // ──────────────────────────────────────────────────────────
  //  BLOG SITEMAP  (/sitemap-blog.xml)
  // ──────────────────────────────────────────────────────────

  async generateBlogSitemap(): Promise<string> {
    const { baseUrl } = this.config;

    let posts: BlogPost[] = [];
    try {
      posts = await this.blogPostRepo.find({
        where: { status: 'published' as any },
        order: { created_at: 'DESC' },
      });
    } catch {
      // Blog table may not exist yet
      this.logger.warn('Blog posts table not available, returning empty sitemap');
    }

    const urls: SitemapUrl[] = posts.map((post) => ({
      loc: buildUrl(baseUrl, `/blog/${post.slug}`),
      lastmod: post.updated_at
        ? (post.updated_at as any).toISOString?.() ||
          String(post.updated_at)
        : undefined,
      changefreq: 'weekly' as const,
      priority: 0.6,
    }));

    this.logger.log(`Generated blog sitemap with ${urls.length} URLs`);
    return buildSitemapXml(urls);
  }

  // ──────────────────────────────────────────────────────────
  //  ROBOTS.TXT
  // ──────────────────────────────────────────────────────────

  generateRobotsTxt(apiBaseUrl: string): string {
    return buildRobotsTxt(`${apiBaseUrl}/sitemap.xml`);
  }

  // ──────────────────────────────────────────────────────────
  //  GOOGLE MERCHANT / PRODUCT FEED (XML)
  // ──────────────────────────────────────────────────────────

  async generateGoogleProductFeedXml(): Promise<string> {
    const items = await this.getProductFeedItems();
    return this.buildGoogleMerchantXml(items);
  }

  // ──────────────────────────────────────────────────────────
  //  FACEBOOK / META PRODUCT FEED (XML)
  // ──────────────────────────────────────────────────────────

  async generateFacebookProductFeedXml(): Promise<string> {
    const items = await this.getProductFeedItems();
    return this.buildFacebookCatalogXml(items);
  }

  // ──────────────────────────────────────────────────────────
  //  PRODUCT FEED (CSV)
  // ──────────────────────────────────────────────────────────

  async generateProductFeedCsv(): Promise<string> {
    const items = await this.getProductFeedItems();
    return this.buildProductCsv(items);
  }

  // ──────────────────────────────────────────────────────────
  //  RSS FEED (/feed/rss)
  // ──────────────────────────────────────────────────────────

  async generateProductRssFeed(): Promise<string> {
    const { baseUrl } = this.config;
    const products = await this.productRepo.query(`
      SELECT p.id, p.slug, p.name_en, p.description_en, p.image_url,
             p.base_price, p.sale_price, p.created_at, p.updated_at,
             c.name_en AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active'
      ORDER BY p.updated_at DESC
      LIMIT 100
    `);

    const items: RssFeedItem[] = products.map((p: any) => ({
      title: p.name_en,
      link: buildUrl(baseUrl, `/product/${p.slug}`),
      description: truncate(stripHtml(p.description_en), 500),
      pubDate: new Date(p.updated_at || p.created_at).toUTCString(),
      guid: buildUrl(baseUrl, `/product/${p.slug}`),
      category: p.category_name || undefined,
      enclosure: p.image_url
        ? {
            url: ensureAbsoluteUrl(p.image_url, baseUrl),
            type: 'image/jpeg',
          }
        : undefined,
    }));

    return this.buildRssXml(
      'TrustKert Products',
      baseUrl,
      'Latest products from TrustKert organic grocery store',
      items,
    );
  }

  // ══════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════

  private async getProductFeedItems(): Promise<ProductFeedItem[]> {
    const { baseUrl, currency } = this.config;

    const products = await this.productRepo.query(`
      SELECT p.id, p.sku, p.slug, p.name_en, p.description_en, p.brand,
             p.image_url, p.base_price, p.sale_price, p.stock_quantity,
             p.discount_type, p.discount_value,
             p.discount_start_date, p.discount_end_date,
             p.status, p.created_at, p.updated_at,
             c.name_en AS category_name, c.slug AS category_slug,
             pc.name_en AS parent_category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories pc ON pc.id = c.parent_id
      WHERE p.status = 'active'
      ORDER BY p.id
    `);

    return products.map((p: any) => {
      // Build category path: "Parent > Child"
      const categoryParts: string[] = [];
      if (p.parent_category_name) categoryParts.push(p.parent_category_name);
      if (p.category_name) categoryParts.push(p.category_name);
      const productType = categoryParts.join(' > ') || 'Grocery';

      // Determine effective sale price
      let salePrice: string | undefined;
      if (p.sale_price && parseFloat(p.sale_price) > 0) {
        salePrice = formatPrice(p.sale_price, currency);
      }

      return {
        id: String(p.id),
        title: p.name_en || '',
        description: truncate(stripHtml(p.description_en), 5000) || p.name_en,
        link: buildUrl(baseUrl, `/product/${p.slug}`),
        image_link: ensureAbsoluteUrl(p.image_url, baseUrl),
        availability:
          p.stock_quantity > 0
            ? ('in_stock' as const)
            : ('out_of_stock' as const),
        price: formatPrice(p.base_price, currency),
        sale_price: salePrice,
        brand: p.brand || 'TrustKert',
        condition: 'new' as const,
        product_type: productType,
        identifier_exists: 'no' as const,
      };
    });
  }

  private buildGoogleMerchantXml(items: ProductFeedItem[]): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
      '  <channel>',
      '    <title>TrustKert Products</title>',
      `    <link>${escapeXml(this.config.baseUrl)}</link>`,
      '    <description>Product feed for TrustKert organic grocery store</description>',
    ];

    for (const item of items) {
      lines.push('    <item>');
      lines.push(`      <g:id>${escapeXml(item.id)}</g:id>`);
      lines.push(`      <g:title>${escapeXml(item.title)}</g:title>`);
      lines.push(
        `      <g:description>${escapeXml(item.description)}</g:description>`,
      );
      lines.push(`      <g:link>${escapeXml(item.link)}</g:link>`);
      lines.push(
        `      <g:image_link>${escapeXml(item.image_link)}</g:image_link>`,
      );
      lines.push(
        `      <g:availability>${item.availability}</g:availability>`,
      );
      lines.push(`      <g:price>${escapeXml(item.price)}</g:price>`);
      if (item.sale_price) {
        lines.push(
          `      <g:sale_price>${escapeXml(item.sale_price)}</g:sale_price>`,
        );
      }
      lines.push(`      <g:brand>${escapeXml(item.brand)}</g:brand>`);
      lines.push(`      <g:condition>${item.condition}</g:condition>`);
      lines.push(
        `      <g:product_type>${escapeXml(item.product_type)}</g:product_type>`,
      );
      if (item.identifier_exists) {
        lines.push(
          `      <g:identifier_exists>${item.identifier_exists}</g:identifier_exists>`,
        );
      }
      lines.push('    </item>');
    }

    lines.push('  </channel>');
    lines.push('</rss>');
    return lines.join('\n');
  }

  private buildFacebookCatalogXml(items: ProductFeedItem[]): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
      '  <channel>',
      '    <title>TrustKert Product Catalog</title>',
      '    <description>Facebook/Meta product catalog for TrustKert</description>',
      `    <link>${escapeXml(this.config.baseUrl)}</link>`,
    ];

    for (const item of items) {
      lines.push('    <item>');
      lines.push(`      <g:id>${escapeXml(item.id)}</g:id>`);
      lines.push(`      <g:title>${escapeXml(item.title)}</g:title>`);
      lines.push(
        `      <g:description>${escapeXml(item.description)}</g:description>`,
      );
      lines.push(
        `      <g:availability>${item.availability}</g:availability>`,
      );
      lines.push(`      <g:condition>${item.condition}</g:condition>`);
      lines.push(`      <g:price>${escapeXml(item.price)}</g:price>`);
      if (item.sale_price) {
        lines.push(
          `      <g:sale_price>${escapeXml(item.sale_price)}</g:sale_price>`,
        );
      }
      lines.push(`      <g:link>${escapeXml(item.link)}</g:link>`);
      lines.push(
        `      <g:image_link>${escapeXml(item.image_link)}</g:image_link>`,
      );
      lines.push(`      <g:brand>${escapeXml(item.brand)}</g:brand>`);
      if (item.product_type) {
        lines.push(
          `      <g:product_type>${escapeXml(item.product_type)}</g:product_type>`,
        );
      }
      lines.push('    </item>');
    }

    lines.push('  </channel>');
    lines.push('</rss>');
    return lines.join('\n');
  }

  private buildProductCsv(items: ProductFeedItem[]): string {
    const headers = [
      'id',
      'title',
      'description',
      'link',
      'image_link',
      'availability',
      'price',
      'sale_price',
      'brand',
      'condition',
      'product_type',
      'identifier_exists',
    ];

    const rows = items.map((item) =>
      [
        this.csvEscape(item.id),
        this.csvEscape(item.title),
        this.csvEscape(item.description),
        this.csvEscape(item.link),
        this.csvEscape(item.image_link),
        this.csvEscape(item.availability),
        this.csvEscape(item.price),
        this.csvEscape(item.sale_price || ''),
        this.csvEscape(item.brand || ''),
        this.csvEscape(item.condition),
        this.csvEscape(item.product_type || ''),
        this.csvEscape(item.identifier_exists || ''),
      ].join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  private buildRssXml(
    title: string,
    link: string,
    description: string,
    items: RssFeedItem[],
  ): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
      '  <channel>',
      `    <title>${escapeXml(title)}</title>`,
      `    <link>${escapeXml(link)}</link>`,
      `    <description>${escapeXml(description)}</description>`,
      `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
      '    <language>en-us</language>',
    ];

    for (const item of items) {
      lines.push('    <item>');
      lines.push(`      <title>${escapeXml(item.title)}</title>`);
      lines.push(`      <link>${escapeXml(item.link)}</link>`);
      lines.push(
        `      <description>${escapeXml(item.description)}</description>`,
      );
      lines.push(`      <pubDate>${item.pubDate}</pubDate>`);
      lines.push(
        `      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
      );
      if (item.category) {
        lines.push(
          `      <category>${escapeXml(item.category)}</category>`,
        );
      }
      if (item.enclosure) {
        lines.push(
          `      <enclosure url="${escapeXml(item.enclosure.url)}" type="${item.enclosure.type}" />`,
        );
      }
      lines.push('    </item>');
    }

    lines.push('  </channel>');
    lines.push('</rss>');
    return lines.join('\n');
  }

  private csvEscape(value: string): string {
    if (!value) return '""';
    // If value contains comma, quote, or newline, wrap in quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
