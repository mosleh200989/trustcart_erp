import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('product_consumption_profiles')
export class ProductConsumptionProfile {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('idx_consumption_profile_product', { unique: true })
  @Column({ name: 'product_id', type: 'int', nullable: true })
  productId!: number | null;

  @Index('idx_consumption_profile_category', { unique: true })
  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId!: number | null;

  @Column({ name: 'avg_consumption_days', type: 'int', default: 30 })
  avgConsumptionDays!: number;

  @Column({ name: 'buffer_days', type: 'int', default: 7 })
  bufferDays!: number;

  @Column({ name: 'min_days', type: 'int', default: 7 })
  minDays!: number;

  @Column({ name: 'max_days', type: 'int', default: 180 })
  maxDays!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
