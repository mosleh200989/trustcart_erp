import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A Storefront is a customer-facing brand site (own domain, own look)
 * that sells products from the shared TrustCart inventory.
 * Orders land in the main Sales module with order_source = storefront slug.
 */
export interface StorefrontTheme {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  font_display?: string;
  font_body?: string;
  [key: string]: any;
}

@Entity('storefronts')
export class Storefront {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  name!: string;

  // Written into sales_orders.order_source for every order from this storefront
  @Column({ length: 100, unique: true })
  slug!: string;

  // Primary domain, e.g. handsomemanbd.com (without protocol / www)
  @Column({ length: 255, nullable: true })
  domain!: string;

  // Extra domains that resolve to the same storefront (www., alt TLDs)
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  extra_domains!: string[];

  // Which hand-coded frontend template renders this storefront
  @Column({ length: 100, default: 'handsomeman' })
  template!: string;

  @Column({ type: 'text', nullable: true })
  logo_url!: string;

  @Column({ type: 'text', nullable: true })
  favicon_url!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  theme!: StorefrontTheme;

  // Hero / branding copy the template can consume
  @Column({ length: 255, nullable: true })
  tagline!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ length: 50, nullable: true })
  contact_phone!: string;

  @Column({ length: 255, nullable: true })
  contact_email!: string;

  @Column({ type: 'text', nullable: true })
  contact_address!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  social_links!: Record<string, string>;

  // Meta / Facebook tracking — per-brand pixel and CAPI credentials
  @Column({ length: 100, nullable: true })
  meta_pixel_id!: string;

  @Column({ type: 'text', nullable: true })
  meta_capi_access_token!: string;

  @Column({ length: 100, nullable: true })
  meta_test_event_code!: string;

  // SEO
  @Column({ length: 255, nullable: true })
  seo_title!: string;

  @Column({ type: 'text', nullable: true })
  seo_description!: string;

  // Delivery charges (BDT) — inside / outside Dhaka
  @Column('decimal', { precision: 10, scale: 2, default: 60 })
  delivery_charge_inside!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 110 })
  delivery_charge_outside!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  free_delivery_threshold!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
