import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

/**
 * Agent Commission Record
 * Tracks individual commission earnings for sales made by agents
 */
@Entity('agent_commissions')
export class AgentCommission {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'agent_id', type: 'integer' })
  agentId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'agent_id', referencedColumnName: 'id' })
  agent!: User;

  @Column({ name: 'customer_id', type: 'integer' })
  customerId!: number;

  @Column({ name: 'sales_order_id', type: 'integer' })
  salesOrderId!: number;

  @Column({ name: 'order_amount', type: 'decimal', precision: 12, scale: 2 })
  orderAmount!: number;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2 })
  commissionRate!: number; // Percentage rate at time of sale

  @Column({ name: 'commission_amount', type: 'decimal', precision: 12, scale: 2 })
  commissionAmount!: number; // Fixed amount or calculated from rate

  @Column({ name: 'commission_type', type: 'varchar', length: 20, default: 'fixed' })
  commissionType!: string; // 'fixed' | 'percentage'

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status!: string; // 'pending' | 'approved' | 'paid' | 'cancelled'

  @Column({ name: 'approved_by', type: 'integer', nullable: true })
  approvedBy!: number | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
