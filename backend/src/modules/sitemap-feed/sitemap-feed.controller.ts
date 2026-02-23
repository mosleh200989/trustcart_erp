import { Controller, Get, Header, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { SitemapFeedService } from './sitemap-feed.service';

/**
 * Sitemap & Feed Controller
 *
 * All endpoints are public (no auth required) — intended for search engine crawlers.
 *
 * Endpoints:
 *   GET /api/sitemap.xml          → Sitemap index (references sub-sitemaps)
 *   GET /api/sitemap-pages.xml    → Static pages sitemap
 *   GET /api/sitemap-products.xml → Products sitemap (with images)
 *   GET /api/sitemap-categories.xml → Categories sitemap
 *   GET /api/sitemap-blog.xml     → Blog posts sitemap
 *   GET /api/robots.txt           → Robots.txt
 *   GET /api/feed/products.xml    → Google Merchant product feed
 *   GET /api/feed/facebook.xml    → Facebook/Meta product catalog feed
 *   GET /api/feed/products.csv    → CSV product feed
 *   GET /api/feed/rss             → RSS feed (latest products)
 */
@Controller()
export class SitemapFeedController {
  constructor(private readonly sitemapFeedService: SitemapFeedService) {}

  // ── Sitemaps ──────────────────────────────────────────────

  @Public()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemapIndex(@Req() req: Request): Promise<string> {
    const apiBase = `${req.protocol}://${req.get('host')}/api`;
    return this.sitemapFeedService.generateSitemapIndex(apiBase);
  }

  @Public()
  @Get('sitemap-pages.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  async sitemapPages(): Promise<string> {
    return this.sitemapFeedService.generatePagesSitemap();
  }

  @Public()
  @Get('sitemap-products.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemapProducts(): Promise<string> {
    return this.sitemapFeedService.generateProductsSitemap();
  }

  @Public()
  @Get('sitemap-categories.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  async sitemapCategories(): Promise<string> {
    return this.sitemapFeedService.generateCategoriesSitemap();
  }

  @Public()
  @Get('sitemap-blog.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemapBlog(): Promise<string> {
    return this.sitemapFeedService.generateBlogSitemap();
  }

  @Public()
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  robotsTxt(@Req() req: Request): string {
    const apiBase = `${req.protocol}://${req.get('host')}/api`;
    return this.sitemapFeedService.generateRobotsTxt(apiBase);
  }

  // ── Product Feeds ─────────────────────────────────────────

  @Public()
  @Get('feed/products.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async googleProductFeed(): Promise<string> {
    return this.sitemapFeedService.generateGoogleProductFeedXml();
  }

  @Public()
  @Get('feed/facebook.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async facebookProductFeed(): Promise<string> {
    return this.sitemapFeedService.generateFacebookProductFeedXml();
  }

  @Public()
  @Get('feed/products.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="products.csv"')
  @Header('Cache-Control', 'public, max-age=3600')
  async csvProductFeed(): Promise<string> {
    return this.sitemapFeedService.generateProductFeedCsv();
  }

  @Public()
  @Get('feed/rss')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=1800')
  async rssFeed(): Promise<string> {
    return this.sitemapFeedService.generateProductRssFeed();
  }
}
