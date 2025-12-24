import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Offer } from './offer.entity';

@Entity('offer_products')
export class OfferProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'offer_id' })
  offerId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ type: 'boolean', default: false, name: 'is_required' })
  isRequired: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Offer, offer => offer.products)
  @JoinColumn({ name: 'offer_id' })
  offer: Offer;
}
