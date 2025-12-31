import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

const nonNullDecimalToNumberTransformer = {
  to: (value: number) => value,
  from: (value: string | number | null): number => (value === null ? 0 : Number(value)),
};

@Entity('customer_wallets')
export class CustomerWallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: number;

  @Column({ name: 'customer_uuid', type: 'uuid', nullable: true, select: false })
  customerUuid?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: nonNullDecimalToNumberTransformer })
  balance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_earned', transformer: nonNullDecimalToNumberTransformer })
  totalEarned: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_spent', transformer: nonNullDecimalToNumberTransformer })
  totalSpent: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
