import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OfferCondition } from './offer-condition.entity';
import { OfferReward } from './offer-reward.entity';
import { OfferProduct } from './offer-product.entity';
import { OfferCategory } from './offer-category.entity';
import { OfferUsage } from './offer-usage.entity';

export enum OfferType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT_DISCOUNT = 'FLAT_DISCOUNT',
  BOGO = 'BOGO',
  FREE_PRODUCT = 'FREE_PRODUCT',
  BUNDLE = 'BUNDLE',
  CATEGORY_DISCOUNT = 'CATEGORY_DISCOUNT'
}

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: OfferType,
    name: 'offer_type'
  })
  offerType: OfferType;

  @Column({ type: 'timestamp', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamp', name: 'end_time' })
  endTime: Date;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ type: 'boolean', default: false, name: 'auto_apply' })
  autoApply: boolean;

  @Column({ type: 'int', nullable: true, name: 'max_usage_total' })
  maxUsageTotal: number;

  @Column({ type: 'int', default: 0, name: 'current_usage' })
  currentUsage: number;

  @Column({ type: 'int', default: 1, name: 'max_usage_per_user' })
  maxUsagePerUser: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'min_cart_amount' })
  minCartAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'max_discount_amount' })
  maxDiscountAmount: number;

  @Column({ type: 'int', nullable: true, name: 'created_by' })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OfferCondition, condition => condition.offer)
  conditions: OfferCondition[];

  @OneToMany(() => OfferReward, reward => reward.offer)
  rewards: OfferReward[];

  @OneToMany(() => OfferProduct, product => product.offer)
  products: OfferProduct[];

  @OneToMany(() => OfferCategory, category => category.offer)
  categories: OfferCategory[];

  @OneToMany(() => OfferUsage, usage => usage.offer)
  usages: OfferUsage[];
}
