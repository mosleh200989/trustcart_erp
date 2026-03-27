import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Supplier } from './supplier.entity';

@Entity('supplier_products')
export class SupplierProduct {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  supplier_id!: number;

  @Column()
  product_id!: number;

  @Column({ length: 100, nullable: true })
  variant_key!: string;

  @Column({ length: 50, nullable: true })
  supplier_sku!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price!: number;

  @Column({ type: 'int', default: 1 })
  min_order_quantity!: number;

  @Column({ type: 'int', nullable: true })
  lead_time_days!: number;

  @Column({ default: false })
  is_preferred!: boolean;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_supplied_at!: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @ManyToOne(() => Supplier, s => s.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;
}
