import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { GoodsReceivedNote } from './goods-received-note.entity';

@Entity('grn_items')
export class GrnItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  grn_id!: number;

  @Column({ nullable: true })
  po_item_id!: number;

  @Column()
  product_id!: number;

  @Column({ length: 100, nullable: true })
  variant_key!: string;

  @Column({ type: 'int', nullable: true })
  quantity_expected!: number;

  @Column({ type: 'int' })
  quantity_received!: number;

  @Column({ type: 'int', default: 0 })
  quantity_accepted!: number;

  @Column({ type: 'int', default: 0 })
  quantity_rejected!: number;

  @Column({ length: 255, nullable: true })
  rejection_reason!: string;

  @Column({ length: 50, nullable: true })
  batch_number!: string;

  @Column({ length: 50, nullable: true })
  lot_number!: string;

  @Column({ type: 'date', nullable: true })
  manufacturing_date!: Date;

  @Column({ type: 'date', nullable: true })
  expiry_date!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_cost!: number;

  @Column({ nullable: true })
  location_id!: number;

  @Column({ length: 20, default: 'pending' })
  quality_status!: string;

  @Column({ type: 'text', nullable: true })
  quality_notes!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperature_on_arrival!: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @ManyToOne(() => GoodsReceivedNote, grn => grn.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grn_id' })
  grn!: GoodsReceivedNote;
}
