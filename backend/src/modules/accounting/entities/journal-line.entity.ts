import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { JournalEntry } from './journal-entry.entity';

@Entity('journal_lines')
export class JournalLine {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  journal_entry_id!: number;

  @Column({ length: 100 })
  account_code!: string; // e.g. INVENTORY_ASSET, COGS, ACCOUNTS_PAYABLE

  @Column({ length: 200 })
  account_name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debit_amount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  credit_amount!: number;

  @Column({ nullable: true })
  product_id!: number;

  @Column({ nullable: true })
  warehouse_id!: number;

  @ManyToOne(() => JournalEntry, je => je.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journal_entry_id' })
  journal_entry!: JournalEntry;
}
