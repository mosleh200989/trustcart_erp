import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('incomplete_orders')
export class IncompleteOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number;

  @Column({ name: 'session_id', nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'cart_data', type: 'jsonb', nullable: true })
  cartData: any;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalAmount: number;

  @Column({ name: 'abandoned_stage', nullable: true })
  abandonedStage: string;

  @Column({ name: 'recovery_email_sent', default: false })
  recoveryEmailSent: boolean;

  @Column({ name: 'recovery_sms_sent', default: false })
  recoverySmsSent: boolean;

  @Column({ default: false })
  recovered: boolean;

  @Column({ name: 'recovered_order_id', nullable: true })
  recoveredOrderId: number;

  @Column({ name: 'recovery_discount_code', nullable: true })
  recoveryDiscountCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
