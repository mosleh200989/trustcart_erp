import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId: string;

  @Column({ name: 'customer_email', nullable: true })
  customerEmail: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ 
    length: 20, 
    default: 'open' 
  })
  status: string; // open, in_progress, resolved, closed

  @Column({ 
    length: 20, 
    default: 'low',
    nullable: true 
  })
  priority: string; // low, medium, high, urgent

  @Column({
    name: 'severity',
    length: 20,
    default: 'medium',
    nullable: true,
  })
  severity: string; // low, medium, high, critical

  @Column({
    name: 'support_group',
    length: 50,
    default: 'general',
    nullable: true,
  })
  supportGroup: string; // general, billing, delivery, account, technical, etc.

  @Column({ type: 'timestamp', nullable: true, name: 'first_response_due_at' })
  firstResponseDueAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'resolution_due_at' })
  resolutionDueAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'resolved_at' })
  resolvedAt: Date | null;

  @Column({ type: 'boolean', default: false, name: 'sla_breached' })
  slaBreached: boolean;

  @Column({ type: 'int', name: 'assigned_to', nullable: true })
  assignedTo: number | null;

  @Column({ type: 'text', nullable: true })
  response: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'responded_at' })
  respondedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
