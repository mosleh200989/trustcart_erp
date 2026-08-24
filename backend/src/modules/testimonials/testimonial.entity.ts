import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Curated customer testimonial, reusable across landing pages and
 * storefronts. LP Maker's testimonials block copies these as snapshots,
 * so published pages never depend on this table at render time.
 */
@Entity('storefront_testimonials')
export class Testimonial {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  customer_name!: string;

  @Column({ length: 255, nullable: true })
  location!: string;

  @Column({ type: 'int', default: 5 })
  rating!: number;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'text', nullable: true })
  image_url!: string;

  // 'facebook' | 'whatsapp' | 'phone' | 'other'
  @Column({ length: 30, default: 'other' })
  source!: string;

  @Column({ type: 'int', nullable: true })
  product_id!: number | null;

  @Column({ type: 'boolean', default: true })
  is_approved!: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
