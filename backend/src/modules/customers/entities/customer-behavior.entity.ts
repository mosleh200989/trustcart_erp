import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Customer } from '../customer.entity';

@Entity('customer_behavior')
export class CustomerBehavior {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ 
    length: 50,
    name: 'behavior_type',
    type: 'varchar'
  })
  behaviorType: 'product_view' | 'add_to_cart' | 'wishlist' | 'search' | 'page_visit' | 'call_attempt' | 'email_open' | 'email_click' | 'other';

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ length: 255, nullable: true, name: 'session_id' })
  sessionId: string;

  @Column({ length: 50, nullable: true, name: 'device_type' })
  deviceType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Customer, customer => customer.behaviors)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
