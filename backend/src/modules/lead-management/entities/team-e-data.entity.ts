import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('team_e_data')
export class TeamEData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', unique: true })
  customerId: number;

  @Column({ name: 'permanent_membership_number', unique: true, nullable: true })
  permanentMembershipNumber: string;

  @Column({ name: 'membership_tier', nullable: true })
  membershipTier: string; // silver, gold, platinum, vip

  @Column({ name: 'membership_start_date', type: 'date', nullable: true })
  membershipStartDate: Date;

  @Column({ name: 'membership_benefits', type: 'jsonb', nullable: true })
  membershipBenefits: any;

  @Column({ name: 'lifetime_value', type: 'decimal', precision: 12, scale: 2, default: 0 })
  lifetimeValue: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'collected_by_id', nullable: true })
  collectedById: number;

  @Column({ name: 'collected_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  collectedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
