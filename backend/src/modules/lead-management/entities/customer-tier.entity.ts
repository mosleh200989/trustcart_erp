import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('customer_tiers')
export class CustomerTier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', unique: true })
  customerId: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ default: 'tier_3' })
  tier: string; // tier_1, tier_2, tier_3, tier_4, tier_5, tier_6, rejected

  @Column({ name: 'tier_assigned_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  tierAssignedAt: Date;

  @Column({ name: 'tier_assigned_by_id', nullable: true })
  tierAssignedById: number;

  @Column({ name: 'auto_assigned', default: false })
  autoAssigned: boolean;

  @Column({ name: 'last_activity_date', type: 'timestamp', nullable: true })
  lastActivityDate: Date;

  @Column({ name: 'days_inactive', default: 0 })
  daysInactive: number;

  @Column({ name: 'total_purchases', default: 0 })
  totalPurchases: number;

  @Column({ name: 'total_spent', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSpent: number;

  @Column({ name: 'engagement_score', default: 0 })
  engagementScore: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
