import {
  SitemapUrl,
  SitemapIndex,
  SitemapImage,
} from '../types/sitemap.types';
import { escapeXml, formatW3CDate } from './xml-helpers';

/**
 * Builds a complete sitemap XML string from an array of URL entries.
 */
export function buildSitemapXml(urls: SitemapUrl[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ];

  for (const url of urls) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(url.loc)}</loc>`);

    if (url.lastmod) {
      lines.push(`    <lastmod>${formatW3CDate(url.lastmod)}</lastmod>`);
    }
    if (url.changefreq) {
      lines.push(`    <changefreq>${url.changefreq}</changefreq>`);
    }
    if (url.priority !== undefined) {
      lines.push(`    <priority>${url.priority.toFixed(1)}</priority>`);
    }

    // Image sub-elements (Google Image Sitemap extension)
    if (url.images && url.images.length > 0) {
      for (const img of url.images) {
        lines.push('    <image:image>');
        lines.push(`      <image:loc>${escapeXml(img.loc)}</image:loc>`);
        if (img.title) {
          lines.push(
            `      <image:title>${escapeXml(img.title)}</image:title>`,
          );
        }
        if (img.caption) {
          lines.push(
            `      <image:caption>${escapeXml(img.caption)}</image:caption>`,
          );
        }
        lines.push('    </image:image>');
      }
    }

    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return lines.join('\n');
}

/**
 * Builds a sitemap index XML that references multiple sub-sitemaps.
 */
export function buildSitemapIndexXml(sitemaps: SitemapIndex[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const s of sitemaps) {
    lines.push('  <sitemap>');
    lines.push(`    <loc>${escapeXml(s.loc)}</loc>`);
    if (s.lastmod) {
      lines.push(`    <lastmod>${formatW3CDate(s.lastmod)}</lastmod>`);
    }
    lines.push('  </sitemap>');
  }

  lines.push('</sitemapindex>');
  return lines.join('\n');
}

/**
 * Builds a robots.txt content pointing to the sitemap
 */
export function buildRobotsTxt(sitemapUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /api/',
    'Disallow: /admin/',
    '',
    `Sitemap: ${sitemapUrl}`,
  ].join('\n');
}
