import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Category tree scoped to a single storefront.
 * Deliberately separate from the main `categories` table so a storefront's
 * menu can never leak into the TrustCart site (and vice versa).
 */
@Entity('storefront_categories')
@Index(['storefront_id', 'slug'], { unique: true })
export class StorefrontCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  storefront_id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 255 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'text', nullable: true })
  image_url!: string;

  @Column({ type: 'int', nullable: true })
  parent_id!: number;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
