import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { InventoryCountItem } from './inventory-count-item.entity';

@Entity('inventory_counts')
export class InventoryCount {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  count_number!: string;

  @Column()
  warehouse_id!: number;

  @Column({ length: 20 })
  count_type!: string;

  @Column({ nullable: true })
  scope_zone_id!: number;

  @Column({ nullable: true })
  scope_category_id!: number;

  @Column({ length: 20, default: 'planned' })
  status!: string;

  @Column({ nullable: true })
  started_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  started_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at!: Date;

  @Column({ nullable: true })
  approved_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  approved_at!: Date;

  @Column({ type: 'int', default: 0 })
  total_items_counted!: number;

  @Column({ type: 'int', default: 0 })
  total_variances!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_variance_value!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @OneToMany(() => InventoryCountItem, item => item.count)
  items!: InventoryCountItem[];
}
