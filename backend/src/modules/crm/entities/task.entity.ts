import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../../customers/customer.entity';
import { User } from '../../users/user.entity';
import { Deal } from './deal.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

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

  @Column({ name: 'assigned_to' })
  assignedTo: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @Column({ name: 'assigned_by' })
  assignedBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_by' })
  assigner: User;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date;

  @Column({ name: 'due_time', nullable: true })
  dueTime: string;

  @Column({ default: 'medium' })
  priority: string; // 'low', 'medium', 'high', 'urgent'

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: 'pending' })
  status: string; // 'pending', 'in_progress', 'completed', 'cancelled'

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ default: false })
  recurring: boolean;

  @Column({ name: 'recurrence_rule', nullable: true })
  recurrenceRule: string;

  @Column({ type: 'jsonb', nullable: true })
  reminders: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
