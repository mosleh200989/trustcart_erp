import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('team_d_data')
export class TeamDData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', unique: true })
  customerId: number;

  @Column({ name: 'health_card_number', nullable: true })
  healthCardNumber: string;

  @Column({ name: 'health_card_expiry', type: 'date', nullable: true })
  healthCardExpiry: Date;

  @Column({ name: 'membership_card_number', nullable: true })
  membershipCardNumber: string;

  @Column({ name: 'membership_card_type', nullable: true })
  membershipCardType: string;

  @Column({ name: 'membership_expiry', type: 'date', nullable: true })
  membershipExpiry: Date;

  @Column({ name: 'coupon_codes', type: 'text', array: true, nullable: true })
  couponCodes: string[];

  @Column({ name: 'product_interest', type: 'text', array: true, nullable: true })
  productInterest: string[];

  @Column({ name: 'order_product_details', type: 'jsonb', nullable: true })
  orderProductDetails: any;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'collected_by_id', nullable: true })
  collectedById: number;

  @Column({ name: 'collected_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  collectedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
