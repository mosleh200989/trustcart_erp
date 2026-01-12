import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Offer } from './offer.entity';

@Entity('offer_codes')
export class OfferCode {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'offer_id', type: 'int' })
  offerId!: number;

  @Column({ name: 'code', type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses!: number | null;

  @Column({ name: 'current_uses', type: 'int', default: 0 })
  currentUses!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'assigned_customer_id', type: 'int', nullable: true })
  assignedCustomerId!: number | null;

  @Column({ name: 'max_uses_per_customer', type: 'int', nullable: true })
  maxUsesPerCustomer!: number | null;

  @Column({ name: 'valid_from', type: 'timestamp', nullable: true })
  validFrom!: Date | null;

  @Column({ name: 'valid_to', type: 'timestamp', nullable: true })
  validTo!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Offer)
  @JoinColumn({ name: 'offer_id' })
  offer!: Offer;
}
