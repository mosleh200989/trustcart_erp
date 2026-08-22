import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';

/**
 * Listing table: which inventory products are published on which storefront.
 * No price override by design — the storefront always shows the product's
 * TrustCart price (base_price / sale_price).
 */
@Entity('storefront_products')
@Index(['storefront_id', 'product_id'], { unique: true })
export class StorefrontProduct {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  storefront_id!: number;

  @Column({ type: 'int' })
  product_id!: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'int', nullable: true })
  storefront_category_id!: number;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @Column({ type: 'boolean', default: true })
  is_published!: boolean;

  @Column({ type: 'boolean', default: false })
  is_featured!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
