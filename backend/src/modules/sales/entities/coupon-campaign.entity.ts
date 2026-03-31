import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CampaignCustomer } from './campaign-customer.entity';

@Entity('coupon_campaigns')
export class CouponCampaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code: string | null;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'trigger_product_id', type: 'int', nullable: true })
  triggerProductId: number | null;

  @Column({ name: 'discount_type', type: 'varchar', length: 20, default: 'fixed' })
  discountType: string; // 'fixed' | 'percentage'

  @Column({ name: 'discount_value', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountValue: number;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ name: 'max_discount_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscountAmount: number | null;

  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses: number | null;

  @Column({ name: 'per_customer_limit', type: 'int', default: 1 })
  perCustomerLimit: number;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount: number;

  @Column({ name: 'expiry_days', type: 'int', default: 30 })
  expiryDays: number;

  @Column({ name: 'valid_from', type: 'timestamp', nullable: true })
  validFrom: Date | null;

  @Column({ name: 'valid_until', type: 'timestamp', nullable: true })
  validUntil: Date | null;

  @Column({ name: 'is_restricted', type: 'boolean', default: false })
  isRestricted: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CampaignCustomer, (c) => c.campaign)
  customers: CampaignCustomer[];
}
