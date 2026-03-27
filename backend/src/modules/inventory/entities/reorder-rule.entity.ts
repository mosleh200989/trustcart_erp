import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reorder_rules')
export class ReorderRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  product_id!: number;

  @Column({ length: 100, nullable: true })
  variant_key!: string;

  @Column({ nullable: true })
  warehouse_id!: number;

  @Column({ type: 'int' })
  reorder_point!: number;

  @Column({ type: 'int' })
  reorder_quantity!: number;

  @Column({ type: 'int', nullable: true })
  max_stock_level!: number;

  @Column({ type: 'int', default: 0 })
  safety_stock!: number;

  @Column({ type: 'int', default: 3 })
  lead_time_days!: number;

  @Column({ nullable: true })
  preferred_supplier_id!: number;

  @Column({ default: false })
  auto_reorder!: boolean;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_triggered_at!: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
