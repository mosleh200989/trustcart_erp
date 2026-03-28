import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { StockAdjustment } from './stock-adjustment.entity';

@Entity('stock_adjustment_items')
export class StockAdjustmentItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  adjustment_id!: number;

  @Column()
  product_id!: number;

  @Column({ length: 100, nullable: true })
  variant_key!: string;

  @Column({ nullable: true })
  batch_id!: number;

  @Column({ nullable: true })
  location_id!: number;

  @Column({ type: 'int' })
  quantity_before!: number;

  @Column({ type: 'int' })
  quantity_after!: number;

  @Column({ type: 'int' })
  quantity_change!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unit_cost!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  value_impact!: number;

  @Column({ length: 255, nullable: true })
  reason!: string;

  @ManyToOne(() => StockAdjustment, a => a.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adjustment_id' })
  adjustment!: StockAdjustment;
}
