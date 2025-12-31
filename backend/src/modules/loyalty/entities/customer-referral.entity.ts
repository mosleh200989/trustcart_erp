import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

const nonNullDecimalToNumberTransformer = {
  to: (value: number) => value,
  from: (value: string | number | null): number => (value === null ? 0 : Number(value)),
};

@Entity('customer_referrals')
export class CustomerReferral {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'referrer_customer_id' })
  referrerCustomerId: number;

  @Column({ nullable: true, name: 'referred_customer_id' })
  referredCustomerId: number;

  @Column({ nullable: true, length: 100, name: 'referred_email' })
  referredEmail: string;

  @Column({ nullable: true, length: 20, name: 'referred_phone' })
  referredPhone: string;

  @Column({ unique: true, length: 50, name: 'referral_code' })
  referralCode: string;

  @Column({ 
    type: 'varchar',
    length: 20,
    default: 'pending'
  })
  status: 'pending' | 'registered' | 'completed' | 'expired';

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 100,
    name: 'reward_amount',
    transformer: nonNullDecimalToNumberTransformer,
  })
  rewardAmount: number;

  @Column({ default: false, name: 'reward_credited' })
  rewardCredited: boolean;

  @Column({ default: false, name: 'first_order_placed' })
  firstOrderPlaced: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'first_order_date' })
  firstOrderDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;
}
