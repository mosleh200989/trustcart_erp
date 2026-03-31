import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CouponCampaign } from './coupon-campaign.entity';

@Entity('campaign_customers')
export class CampaignCustomer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'campaign_id', type: 'int' })
  campaignId: number;

  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId: number | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 30, nullable: true })
  customerPhone: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 150, nullable: true })
  customerName: string | null;

  @Column({ name: 'times_used', type: 'int', default: 0 })
  timesUsed: number;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'last_used_order_id', type: 'int', nullable: true })
  lastUsedOrderId: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CouponCampaign, (c) => c.customers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: CouponCampaign;
}
