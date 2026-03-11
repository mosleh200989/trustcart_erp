import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('commission_slabs')
export class CommissionSlab {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'role_type', type: 'varchar', length: 20, default: 'agent' })
  roleType!: string; // 'agent' | 'team_leader'

  @Column({ name: 'agent_tier', type: 'varchar', length: 20, default: 'silver' })
  agentTier!: string; // 'silver' | 'gold' | 'platinum'

  @Column({ name: 'min_order_count', type: 'integer', default: 0 })
  minOrderCount!: number;

  @Column({ name: 'max_order_count', type: 'integer', nullable: true })
  maxOrderCount!: number | null;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  commissionAmount!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy!: number | null;

  @Column({ name: 'updated_by', type: 'integer', nullable: true })
  updatedBy!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
