import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface LandingPageSection {
  id: string;
  type: 'hero' | 'benefits' | 'images' | 'trust' | 'order-form' | 'cta' | 'custom-html';
  title?: string;
  content?: string;
  items?: Array<{ icon?: string; text: string }>;
  images?: string[];
  buttonText?: string;
  buttonLink?: string;
  backgroundColor?: string;
  textColor?: string;
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

  @Column({ length: 20, nullable: true })
  phone_number!: string;

  @Column({ length: 255, nullable: true })
  whatsapp_number!: string;

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
