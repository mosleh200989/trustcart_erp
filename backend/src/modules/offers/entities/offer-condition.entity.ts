import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Offer } from './offer.entity';

export enum ConditionType {
  CART_TOTAL = 'CART_TOTAL',
  PRODUCT_QTY = 'PRODUCT_QTY',
  CATEGORY = 'CATEGORY',
  BRAND = 'BRAND',
  FIRST_ORDER = 'FIRST_ORDER',
  USER_LEVEL = 'USER_LEVEL',
  USER_SEGMENT = 'USER_SEGMENT',
  MIN_ITEMS = 'MIN_ITEMS'
}

@Entity('offer_conditions')
export class OfferCondition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'offer_id' })
  offerId: number;

  @Column({
    type: 'enum',
    enum: ConditionType,
    name: 'condition_type'
  })
  conditionType: ConditionType;

  @Column({ length: 10 })
  operator: string; // >=, <=, =, IN, NOT IN

  @Column({ type: 'jsonb' })
  value: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Offer, offer => offer.conditions)
  @JoinColumn({ name: 'offer_id' })
  offer: Offer;
}
