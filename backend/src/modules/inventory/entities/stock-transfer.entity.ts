import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { StockTransferItem } from './stock-transfer-item.entity';

@Entity('stock_transfers')
export class StockTransfer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  transfer_number!: string;

  @Column()
  source_warehouse_id!: number;

  @Column()
  destination_warehouse_id!: number;

  @Column({ length: 20, default: 'draft' })
  status!: string;

  @Column({ length: 10, default: 'normal' })
  priority!: string;

  @Column()
  requested_by!: number;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  requested_at!: Date;

  @Column({ nullable: true })
  approved_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  approved_at!: Date;

  @Column({ nullable: true })
  shipped_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  shipped_at!: Date;

  @Column({ nullable: true })
  received_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  received_at!: Date;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @OneToMany(() => StockTransferItem, item => item.transfer)
  items!: StockTransferItem[];
}
