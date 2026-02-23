/**
 * Sitemap & Product Feed Type Definitions
 */

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: ChangeFrequency;
  priority?: number;
  images?: SitemapImage[];
}

export interface SitemapImage {
  loc: string;
  title?: string;
  caption?: string;
}

export interface SitemapIndex {
  loc: string;
  lastmod?: string;
}

export type ChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface ProductFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  additional_image_links?: string[];
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  price: string; // e.g., "100.00 BDT"
  sale_price?: string;
  brand?: string;
  gtin?: string;
  mpn?: string;
  condition: 'new' | 'refurbished' | 'used';
  product_type?: string; // Category path e.g., "Grocery > Organic > Fruits"
  google_product_category?: string;
  item_group_id?: string;
  custom_label_0?: string;
  custom_label_1?: string;
  custom_label_2?: string;
  shipping_weight?: string;
  identifier_exists?: 'yes' | 'no';
}

export interface RssFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  category?: string;
  enclosure?: {
    url: string;
    type: string;
    length?: number;
  };
}

export interface SitemapConfig {
  baseUrl: string;
  defaultChangeFreq: ChangeFrequency;
  defaultPriority: number;
  maxUrlsPerSitemap: number;
  currency: string;
}
