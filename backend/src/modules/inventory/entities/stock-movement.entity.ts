import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  reference_number!: string;

  @Column({ length: 30 })
  movement_type!: string;

  @Column()
  product_id!: number;

  @Column({ length: 100, nullable: true })
  variant_key!: string;

  @Column({ nullable: true })
  batch_id!: number;

  @Column({ nullable: true })
  source_warehouse_id!: number;

  @Column({ nullable: true })
  source_location_id!: number;

  @Column({ nullable: true })
  destination_warehouse_id!: number;

  @Column({ nullable: true })
  destination_location_id!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unit_cost!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  total_cost!: number;

  @Column({ type: 'int', nullable: true })
  balance_before!: number;

  @Column({ type: 'int', nullable: true })
  balance_after!: number;

  @Column({ length: 255, nullable: true })
  reason!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ length: 30, nullable: true })
  related_document_type!: string;

  @Column({ nullable: true })
  related_document_id!: number;

  @Column()
  performed_by!: number;

  @Column({ nullable: true })
  approved_by!: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
