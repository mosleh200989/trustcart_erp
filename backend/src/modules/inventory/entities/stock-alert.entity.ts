import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('stock_alerts')
export class StockAlert {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 30 })
  alert_type!: string;

  @Column({ nullable: true })
  product_id!: number;

  @Column({ length: 100, nullable: true })
  variant_key!: string;

  @Column({ nullable: true })
  warehouse_id!: number;

  @Column({ nullable: true })
  batch_id!: number;

  @Column({ type: 'text' })
  message!: string;

  @Column({ length: 10 })
  severity!: string;

  @Column({ default: false })
  is_read!: boolean;

  @Column({ default: false })
  is_resolved!: boolean;

  @Column({ nullable: true })
  resolved_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at!: Date;

  @Column({ length: 255, nullable: true })
  resolution_notes!: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: any;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
