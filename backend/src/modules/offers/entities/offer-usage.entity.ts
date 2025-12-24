import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Offer } from './offer.entity';

@Entity('offer_usage')
export class OfferUsage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'offer_id' })
  offerId: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number;

  @Column({ name: 'order_id', nullable: true })
  orderId: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'discount_amount' })
  discountAmount: number;

  @CreateDateColumn({ name: 'used_at' })
  usedAt: Date;

  @ManyToOne(() => Offer, offer => offer.usages)
  @JoinColumn({ name: 'offer_id' })
  offer: Offer;
}
