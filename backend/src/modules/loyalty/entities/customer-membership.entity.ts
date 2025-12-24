import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('customer_memberships')
export class CustomerMembership {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', unique: true })
  customerId: number;

  @Column({ 
    name: 'membership_tier',
    type: 'varchar',
    length: 20,
    default: 'none'
  })
  membershipTier: 'none' | 'silver' | 'gold';

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'discount_percentage' })
  discountPercentage: number;

  @Column({ name: 'free_delivery_count', default: 0 })
  freeDeliveryCount: number;

  @Column({ name: 'free_delivery_used', default: 0 })
  freeDeliveryUsed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_monthly_spend' })
  totalMonthlySpend: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'current_month_spend' })
  currentMonthSpend: number;

  @Column({ type: 'date', nullable: true, name: 'last_order_date' })
  lastOrderDate: Date;

  @Column({ name: 'price_lock_enabled', default: false })
  priceLockEnabled: boolean;

  @Column({ name: 'birthday_gift_sent', default: false })
  birthdayGiftSent: boolean;

  @Column({ name: 'eid_gift_sent', default: false })
  eidGiftSent: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'tier_achieved_at' })
  tierAchievedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'tier_expires_at' })
  tierExpiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
