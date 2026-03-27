import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { StockAdjustmentItem } from './stock-adjustment-item.entity';

@Entity('stock_adjustments')
export class StockAdjustment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  adjustment_number!: string;

  @Column()
  warehouse_id!: number;

  @Column({ length: 30 })
  adjustment_type!: string;

  @Column({ length: 20, default: 'draft' })
  status!: string;

  @Column({ length: 255 })
  reason!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_value_impact!: number;

  @Column()
  created_by!: number;

  @Column({ nullable: true })
  approved_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  approved_at!: Date;

  @Column({ nullable: true })
  rejected_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  rejected_at!: Date;

  @Column({ length: 255, nullable: true })
  rejection_reason!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @OneToMany(() => StockAdjustmentItem, item => item.adjustment)
  items!: StockAdjustmentItem[];
}
