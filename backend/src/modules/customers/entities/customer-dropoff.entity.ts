import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Customer } from '../customer.entity';

@Entity('customer_dropoff_tracking')
export class CustomerDropoff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ 
    length: 50,
    type: 'varchar'
  })
  stage: 'product_view' | 'add_to_cart' | 'checkout_initiated' | 'payment_pending' | 'payment_failed' | 'abandoned';

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'cart_value' })
  cartValue: number;

  @Column({ length: 255, nullable: true })
  reason: string;

  @Column({ default: false })
  recovered: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'recovered_at' })
  recoveredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Customer, customer => customer.dropoffs)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
