import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { JournalLine } from './journal-line.entity';

@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  journal_number!: string;

  @Column({ type: 'date' })
  entry_date!: string;

  @Column({ length: 30 })
  entry_type!: string; // stock_receipt, sales_dispatch, stock_adjustment, stock_write_off

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debit_total!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  credit_total!: number;

  @Column({ length: 20, default: 'draft' })
  status!: string; // draft, posted, voided

  @Column({ length: 50, nullable: true })
  reference_type!: string; // grn, sales_order, stock_adjustment, stock_movement

  @Column({ nullable: true })
  reference_id!: number;

  @Column({ nullable: true })
  posted_by!: number;

  @Column({ type: 'timestamp', nullable: true })
  posted_at!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @OneToMany(() => JournalLine, line => line.journal_entry)
  lines!: JournalLine[];
}
