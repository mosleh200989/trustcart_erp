import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PurchaseOrderItem } from './purchase-order-item.entity';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  po_number!: string;

  @Column()
  supplier_id!: number;

  @Column()
  warehouse_id!: number;

  @Column({ length: 20, default: 'draft' })
  status!: string;

  @Column({ length: 10, default: 'normal' })
  priority!: string;

  @Column({ type: 'date' })
  order_date!: Date;

  @Column({ type: 'date', nullable: true })
  expected_delivery_date!: Date;

  @Column({ type: 'date', nullable: true })
  actual_delivery_date!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax_amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shipping_cost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_amount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_amount!: number;

  @Column({ length: 20, default: 'unpaid' })
  payment_status!: string;

  @Column({ length: 50, nullable: true })
  payment_terms!: string;

  @Column({ type: 'date', nullable: true })
  payment_due_date!: Date;

  @Column({ length: 3, default: 'BDT' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'text', nullable: true })
  internal_notes!: string;

  @Column({ type: 'text', nullable: true })
  terms_and_conditions!: string;

  @Column()
  created_by!: number;

  @Column({ nullable: true })
  approved_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  approved_at!: Date;

  @Column({ nullable: true })
  cancelled_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at!: Date;

  @Column({ length: 255, nullable: true })
  cancel_reason!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @OneToMany(() => PurchaseOrderItem, item => item.purchase_order)
  items!: PurchaseOrderItem[];
}
