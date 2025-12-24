import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Offer } from './offer.entity';

export enum RewardType {
  DISCOUNT_PERCENT = 'DISCOUNT_PERCENT',
  DISCOUNT_FLAT = 'DISCOUNT_FLAT',
  FREE_PRODUCT = 'FREE_PRODUCT',
  FREE_SHIPPING = 'FREE_SHIPPING'
}

@Entity('offer_rewards')
export class OfferReward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'offer_id' })
  offerId: number;

  @Column({
    type: 'enum',
    enum: RewardType,
    name: 'reward_type'
  })
  rewardType: RewardType;

  @Column({ type: 'jsonb' })
  value: any; // {percent: 90} or {amount: 500} or {product_id: 123}

  @Column({ type: 'int', default: 1, name: 'max_free_qty' })
  maxFreeQty: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Offer, offer => offer.rewards)
  @JoinColumn({ name: 'offer_id' })
  offer: Offer;
}
