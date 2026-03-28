import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { GrnItem } from './grn-item.entity';

@Entity('goods_received_notes')
export class GoodsReceivedNote {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  grn_number!: string;

  @Column({ nullable: true })
  purchase_order_id!: number;

  @Column()
  supplier_id!: number;

  @Column()
  warehouse_id!: number;

  @Column()
  received_by!: number;

  @Column({ type: 'timestamp' })
  received_date!: Date;

  @Column({ length: 20, default: 'draft' })
  status!: string;

  @Column({ length: 50, nullable: true })
  invoice_number!: string;

  @Column({ type: 'date', nullable: true })
  invoice_date!: Date;

  @Column({ length: 50, nullable: true })
  delivery_note_number!: string;

  @Column({ length: 30, nullable: true })
  vehicle_number!: string;

  @Column({ length: 100, nullable: true })
  driver_name!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ default: true })
  quality_check_required!: boolean;

  @Column({ nullable: true })
  quality_checked_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  quality_checked_at!: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @OneToMany(() => GrnItem, item => item.grn)
  items!: GrnItem[];
}
