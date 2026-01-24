import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

/**
 * Commission Settings
 * Global and agent-specific commission configuration set by Admin
 */
@Entity('commission_settings')
export class CommissionSettings {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'setting_type', type: 'varchar', length: 20, default: 'global' })
  settingType!: string; // 'global' | 'agent_specific'

  @Column({ name: 'agent_id', type: 'integer', nullable: true })
  agentId!: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'agent_id', referencedColumnName: 'id' })
  agent!: User | null;

  @Column({ name: 'commission_type', type: 'varchar', length: 20, default: 'fixed' })
  commissionType!: string; // 'fixed' | 'percentage'

  @Column({ name: 'fixed_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  fixedAmount!: number; // Fixed amount per sale

  @Column({ name: 'percentage_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentageRate!: number; // Percentage of sale amount

  @Column({ name: 'min_order_value', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minOrderValue!: number; // Minimum order value to qualify for commission

  @Column({ name: 'max_commission', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxCommission!: number | null; // Cap on commission per sale

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'effective_from', type: 'timestamp', nullable: true })
  effectiveFrom!: Date | null;

  @Column({ name: 'effective_until', type: 'timestamp', nullable: true })
  effectiveUntil!: Date | null;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy!: number | null;

  @Column({ name: 'updated_by', type: 'integer', nullable: true })
  updatedBy!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
