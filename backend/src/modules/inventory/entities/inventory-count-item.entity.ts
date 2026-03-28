import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { InventoryCount } from './inventory-count.entity';

@Entity('inventory_count_items')
export class InventoryCountItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  count_id!: number;

  @Column()
  product_id!: number;

  @Column({ length: 100, nullable: true })
  variant_key!: string;

  @Column({ nullable: true })
  location_id!: number;

  @Column({ nullable: true })
  batch_id!: number;

  @Column({ type: 'int' })
  system_quantity!: number;

  @Column({ type: 'int', nullable: true })
  counted_quantity!: number;

  @Column({ type: 'int', nullable: true, insert: false, update: false })
  variance!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  variance_value!: number;

  @Column({ length: 255, nullable: true })
  variance_reason!: string;

  @Column({ nullable: true })
  counted_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  counted_at!: Date;

  @Column({ nullable: true })
  verified_by!: number;

  @Column({ type: 'int', nullable: true })
  verified_quantity!: number;

  @Column({ length: 20, default: 'pending' })
  status!: string;

  @ManyToOne(() => InventoryCount, c => c.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'count_id' })
  count!: InventoryCount;
}
