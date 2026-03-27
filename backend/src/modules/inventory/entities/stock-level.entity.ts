import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('stock_levels')
export class StockLevel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  product_id!: number;

  @Column({ length: 100, nullable: true })
  variant_key!: string;

  @Column()
  warehouse_id!: number;

  @Column({ nullable: true })
  location_id!: number;

  @Column({ nullable: true })
  batch_id!: number;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ type: 'int', default: 0 })
  reserved_quantity!: number;

  @Column({ type: 'int', nullable: true, insert: false, update: false })
  available_quantity!: number;

  @Column({ type: 'int', default: 0 })
  damaged_quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost_price!: number;

  @Column({ type: 'timestamp', nullable: true })
  last_counted_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
