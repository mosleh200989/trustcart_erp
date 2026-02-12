import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface LandingPageOrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

@Entity('landing_page_orders')
export class LandingPageOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid', unique: true })
  uuid!: string;

  @Column({ type: 'int' })
  landing_page_id!: number;

  @Column({ length: 255, nullable: true })
  landing_page_title!: string;

  @Column({ length: 255, nullable: true })
  landing_page_slug!: string;

  // Customer info
  @Column({ length: 255 })
  customer_name!: string;

  @Column({ length: 20 })
  customer_phone!: string;

  @Column({ type: 'text' })
  customer_address!: string;

  @Column({ length: 100, default: 'Dhaka' })
  district!: string;

  @Column({ type: 'text', nullable: true })
  note!: string;

  // Order details
  @Column({ type: 'jsonb', default: '[]' })
  items!: LandingPageOrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_amount!: number;

  @Column({ length: 50, default: 'cod' })
  payment_method!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending',
  })
  status!: string;

  @Column({ type: 'text', nullable: true })
  admin_note!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
