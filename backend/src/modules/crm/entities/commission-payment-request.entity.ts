import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('commission_payment_requests')
export class CommissionPaymentRequest {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'agent_id', type: 'integer' })
  agentId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'agent_id', referencedColumnName: 'id' })
  agent!: User;

  @Column({ name: 'requested_amount', type: 'decimal', precision: 12, scale: 2 })
  requestedAmount!: number;

  @Column({ name: 'approved_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  approvedAmount!: number | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod!: string | null; // 'bank_transfer' | 'bkash' | 'nagad' | 'cash' | 'other'

  @Column({ name: 'payment_reference', type: 'varchar', length: 255, nullable: true })
  paymentReference!: string | null; // Transaction ID / Reference number

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status!: string; // 'pending' | 'approved' | 'paid' | 'rejected'

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes!: string | null;

  @Column({ name: 'requested_by', type: 'integer', nullable: true })
  requestedBy!: number | null;

  @Column({ name: 'approved_by', type: 'integer', nullable: true })
  approvedBy!: number | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'paid_by', type: 'integer', nullable: true })
  paidBy!: number | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'rejected_by', type: 'integer', nullable: true })
  rejectedBy!: number | null;

  @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
  rejectedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
