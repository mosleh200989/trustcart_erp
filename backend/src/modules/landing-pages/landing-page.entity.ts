import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface LandingPageSection {
  id: string;
  type: 'hero' | 'benefits' | 'images' | 'trust' | 'order-form' | 'cta' | 'custom-html' | 'event-rules' | 'event-prizes' | 'event-how-to' | 'event-countdown' | 'phone-cta' | 'spacer';
  title?: string;
  content?: string;
  items?: Array<{ icon?: string; text: string }>;
  images?: string[];
  videoUrl?: string;
  videoTitlePosition?: 'above-video' | 'below-video';
  buttonText?: string;
  buttonLink?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonBorderColor?: string;
  buttonBorderRadius?: number;
  backgroundColor?: string;
  textColor?: string;
  paddingY?: number;
  order: number;
  is_visible: boolean;
}

export interface LandingPageProduct {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  compare_price?: number;
  sku?: string;
  product_id?: number; // link to actual product
  is_default: boolean;
  allow_quantity_selector?: boolean;
}

export interface CrossSellProduct {
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  compare_price?: number;
  product_id?: number;
  badge_text?: string;
  suggestion_text?: string;
}

@Entity('landing_pages')
export class LandingPage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid', unique: true })
  uuid!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ length: 255, unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ length: 500, nullable: true })
  hero_image_url!: string;

  @Column({ length: 500, nullable: true })
  hero_background_image_url!: string;

  @Column({ length: 255, nullable: true })
  hero_title!: string;

  @Column({ type: 'text', nullable: true })
  hero_subtitle!: string;

  @Column({ length: 100, nullable: true })
  hero_button_text!: string;

  @Column({ length: 50, default: '#FF6B35' })
  primary_color!: string;

  @Column({ length: 50, default: '#FFFFFF' })
  secondary_color!: string;

  @Column({ length: 50, default: '#1a1a2e' })
  background_color!: string;

  @Column({ length: 50, default: '#ffffff' })
  order_form_bg_color!: string;

  @Column({ length: 50, default: '#ffffff' })
  order_form_card_bg_color!: string;

  @Column({ length: 50, default: '#1f2937' })
  order_form_title_color!: string;

  @Column({ length: 50, default: '#374151' })
  order_form_text_color!: string;

  @Column({ length: 50, default: '#2d6a4f' })
  order_form_accent_color!: string;

  @Column({ length: 50, default: '#e5e7eb' })
  order_form_border_color!: string;

  @Column({ length: 50, default: '#16a34a' })
  order_form_button_bg_color!: string;

  @Column({ length: 50, default: '#ffffff' })
  order_form_button_text_color!: string;

  @Column({ length: 50, default: 'transparent' })
  order_form_button_border_color!: string;

  @Column({ type: 'int', default: 16 })
  order_form_button_border_radius!: number;

  @Column({ length: 50, default: '#111827' })
  footer_bg_color!: string;

  @Column({ length: 50, default: '#ffffff' })
  footer_text_color!: string;

  @Column({ length: 50, default: '#f59e0b' })
  footer_link_bg_color!: string;

  @Column({ length: 50, default: '#111827' })
  footer_link_text_color!: string;

  @Column({ length: 50, default: 'transparent' })
  footer_link_border_color!: string;

  @Column({ type: 'int', default: 999 })
  footer_link_border_radius!: number;

  @Column({ length: 50, default: '#1f2937' })
  footer_border_color!: string;

  @Column({ length: 50, default: '#2d6a4f' })
  btn_bg_color!: string;

  @Column({ length: 50, default: '#ffffff' })
  btn_text_color!: string;

  @Column({ length: 50, default: 'transparent' })
  btn_border_color!: string;

  @Column({ type: 'int', default: 16 })
  btn_border_radius!: number;

  @Column({ length: 50, default: 'classic' })
  template!: string;

  @Column({ length: 20, default: 'image-first' })
  hero_layout!: string;

  @Column({ type: 'boolean', default: true })
  show_hero_price!: boolean;

  @Column({ length: 20, default: 'above-image' })
  hero_subtitle_position!: string;

  @Column({ length: 500, nullable: true })
  meta_title!: string;

  @Column({ type: 'text', nullable: true })
  meta_description!: string;

  @Column({ length: 500, nullable: true })
  og_image_url!: string;

  @Column({ type: 'jsonb', default: '[]' })
  sections!: LandingPageSection[];

  @Column({ type: 'jsonb', default: '[]' })
  products!: LandingPageProduct[];

  @Column({ type: 'jsonb', nullable: true, default: null })
  cross_sell_product!: CrossSellProduct | null;

  @Column({ length: 20, nullable: true })
  phone_number!: string;

  @Column({ length: 255, nullable: true })
  whatsapp_number!: string;

  @Column({ length: 50, default: '#25D366' })
  floating_whatsapp_color!: string;

  @Column({ length: 50, default: '#FF6B35' })
  floating_phone_color!: string;

  @Column({ type: 'boolean', default: true })
  show_order_form!: boolean;

  @Column({ type: 'boolean', default: true })
  cash_on_delivery!: boolean;

  @Column({ type: 'boolean', default: false })
  free_delivery!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  delivery_charge!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  delivery_charge_outside!: number;

  @Column({ type: 'text', nullable: true })
  delivery_note!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'int', default: 0 })
  view_count!: number;

  @Column({ type: 'int', default: 0 })
  order_count!: number;

  @Column({ type: 'timestamp', nullable: true })
  start_date!: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
