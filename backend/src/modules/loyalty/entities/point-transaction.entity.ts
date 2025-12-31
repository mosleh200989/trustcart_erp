import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('point_transactions')
export class PointTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: number;

  @Column({ name: 'customer_uuid', type: 'uuid', nullable: true, select: false })
  customerUuid?: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
  idempotencyKey?: string;

  @Column({
    name: 'transaction_type',
    type: 'varchar',
    length: 20,
  })
  transactionType: 'earn' | 'redeem' | 'adjust';

  @Column({ type: 'int' })
  points: number;

  @Column({ type: 'varchar', length: 50 })
  source: string;

  @Column({ nullable: true, name: 'reference_id' })
  referenceId?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', nullable: true, name: 'balance_after' })
  balanceAfter?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
