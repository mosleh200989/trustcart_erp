import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StockTransfer } from './stock-transfer.entity';

@Entity('stock_transfer_items')
export class StockTransferItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  transfer_id!: number;

  @Column()
  product_id!: number;

  @Column({ length: 100, nullable: true })
  variant_key!: string;

  @Column({ nullable: true })
  batch_id!: number;

  @Column({ type: 'int' })
  quantity_requested!: number;

  @Column({ type: 'int', default: 0 })
  quantity_shipped!: number;

  @Column({ type: 'int', default: 0 })
  quantity_received!: number;

  @Column({ nullable: true })
  source_location_id!: number;

  @Column({ nullable: true })
  destination_location_id!: number;

  @Column({ length: 255, nullable: true })
  notes!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @ManyToOne(() => StockTransfer, t => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transfer_id' })
  transfer!: StockTransfer;
}
