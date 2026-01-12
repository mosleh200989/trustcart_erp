import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wallet_withdrawal_requests')
export class WalletWithdrawalRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'customer_id', type: 'int' })
  customerId!: number;

  @Column('decimal', { name: 'amount', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'method', type: 'varchar', length: 30, default: 'bkash' })
  method!: string;

  @Column({ name: 'account', type: 'varchar', length: 80 })
  account!: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
