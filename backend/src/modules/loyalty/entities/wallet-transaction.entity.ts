import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

const nonNullDecimalToNumberTransformer = {
  to: (value: number) => value,
  from: (value: string | number | null): number => (value === null ? 0 : Number(value)),
};

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'wallet_id' })
  walletId: number;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
  idempotencyKey?: string;

  @Column({ type: 'varchar', length: 20, default: 'posted' })
  status: 'posted' | 'pending' | 'reversed';

  @Column({ name: 'customer_id', nullable: true })
  customerId?: number;

  @Column({ name: 'customer_uuid', type: 'uuid', nullable: true, select: false })
  customerUuid?: string;

  @Column({ 
    name: 'transaction_type',
    type: 'varchar',
    length: 20
  })
  transactionType: 'credit' | 'debit';

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: nonNullDecimalToNumberTransformer })
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

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'balance_after',
    transformer: nonNullDecimalToNumberTransformer,
  })
  balanceAfter: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
