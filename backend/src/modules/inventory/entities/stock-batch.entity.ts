import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('stock_batches')
export class StockBatch {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50 })
  batch_number!: string;

  @Column({ length: 50, nullable: true })
  lot_number!: string;

  @Column()
  product_id!: number;

  @Column({ length: 100, nullable: true })
  variant_key!: string;

  @Column({ nullable: true })
  supplier_id!: number;

  @Column({ nullable: true })
  purchase_order_id!: number;

  @Column({ nullable: true })
  grn_id!: number;

  @Column({ nullable: true })
  warehouse_id!: number;

  @Column({ type: 'date', nullable: true })
  manufacturing_date!: Date;

  @Column({ type: 'date', nullable: true })
  expiry_date!: Date;

  @Column({ type: 'date' })
  received_date!: Date;

  @Column({ type: 'int' })
  initial_quantity!: number;

  @Column({ type: 'int' })
  remaining_quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cost_price!: number;

  @Column({ length: 20, default: 'available' })
  status!: string;

  @Column({ length: 20, default: 'accepted' })
  quality_status!: string;

  @Column({ type: 'text', nullable: true })
  quality_notes!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
