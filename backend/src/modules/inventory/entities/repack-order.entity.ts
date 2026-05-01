import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('repack_orders')
export class RepackOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  repack_number!: string;

  @Column()
  warehouse_id!: number;

  @Column({ nullable: true })
  config_id!: number;

  @Column()
  source_product_id!: number;

  @Column({ nullable: true })
  source_variant_key!: string;

  @Column({ nullable: true })
  source_batch_id!: number;

  @Column({ type: 'numeric', precision: 10, scale: 3 })
  source_qty_to_consume!: number;

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true })
  source_qty_consumed!: number;

  @Column()
  output_product_id!: number;

  @Column({ nullable: true })
  output_variant_key!: string;

  @Column()
  output_qty_expected!: number;

  @Column({ nullable: true })
  output_qty_actual!: number;

  @Column({ nullable: true })
  output_batch_number!: string;

  @Column({ type: 'numeric', precision: 10, scale: 3, default: 0 })
  waste_qty!: number;

  @Column({ nullable: true, type: 'text' })
  notes!: string;

  @Column({ length: 20, default: 'draft' })
  status!: string; // draft | in_progress | completed | cancelled

  @Column({ nullable: true })
  created_by!: number;

  @Column({ nullable: true })
  completed_by!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ nullable: true, type: 'timestamp' })
  completed_at!: Date;
}
