import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'wallet_id' })
  walletId: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ 
    name: 'transaction_type',
    type: 'varchar',
    length: 20
  })
  transactionType: 'credit' | 'debit';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ 
    type: 'varchar',
    length: 50
  })
  source: 'referral' | 'bonus' | 'refund' | 'purchase' | 'withdrawal';

  @Column({ nullable: true, name: 'reference_id' })
  referenceId: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'balance_after' })
  balanceAfter: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
