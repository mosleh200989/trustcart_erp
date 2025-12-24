import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('price_locks')
export class PriceLock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'locked_price' })
  lockedPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'current_price' })
  currentPrice: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'locked_at' })
  lockedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;
}
