import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { SalesOrder } from './sales-order.entity';

@Entity('sales_order_items')
export class SalesOrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'sales_order_id', type: 'int' })
  salesOrderId!: number;

  @Column({ name: 'product_id', type: 'int', nullable: true })
  productId!: number | null;

  @Column({ name: 'product_name', type: 'varchar', length: 500, nullable: true })
  productName!: string | null;

  @Column({ name: 'product_image', type: 'varchar', length: 1000, nullable: true })
  productImage!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 15, scale: 2, nullable: true })
  lineTotal!: number;

  @Column({ name: 'batch_id', type: 'int', nullable: true })
  batchId!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => SalesOrder)
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder!: SalesOrder;
}
