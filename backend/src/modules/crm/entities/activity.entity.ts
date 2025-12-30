import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../../customers/customer.entity';
import { User } from '../../users/user.entity';
import { Deal } from './deal.entity';

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string; // 'call', 'email', 'meeting', 'note', 'sms', 'task', 'quote_sent', etc.

  @Column({ name: 'customer_id', nullable: true })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'deal_id', nullable: true })
  dealId: number;

  @ManyToOne(() => Deal)
  @JoinColumn({ name: 'deal_id' })
  deal: Deal;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'integer', nullable: true })
  duration: number; // in seconds

  @Column({ nullable: true })
  outcome: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // For storing type-specific data

  // Phase 1: Advanced Activity Logging fields
  @Column({ name: 'recording_url', type: 'text', nullable: true })
  recordingUrl: string;

  @Column({ nullable: true })
  sentiment: string; // 'very_positive', 'positive', 'neutral', 'negative', 'very_negative'

  @Column({ name: 'follow_up_required', type: 'boolean', default: false })
  followUpRequired: boolean;

  @Column({ name: 'follow_up_date', type: 'timestamp', nullable: true })
  followUpDate: Date;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'jsonb', default: [] })
  attachments: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
