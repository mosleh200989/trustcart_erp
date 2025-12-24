import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../products/product.entity';

@Entity('customer_reviews')
export class CustomerReview {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  customer_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customer_email?: string;

  @Column({ type: 'integer', nullable: true })
  rating?: number;

  @Column({ type: 'text', nullable: true })
  review_text?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  video_url?: string;

  @Column({ type: 'integer', nullable: true })
  product_id?: number;

  @Column({ type: 'boolean', default: false })
  is_featured!: boolean;

  @Column({ type: 'boolean', default: false })
  is_approved!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product?: Product;
}
