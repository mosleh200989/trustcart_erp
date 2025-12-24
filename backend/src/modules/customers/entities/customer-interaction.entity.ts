import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Customer } from '../customer.entity';

@Entity('customer_interactions')
export class CustomerInteraction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ 
    length: 50,
    name: 'interaction_type',
    type: 'varchar'
  })
  interactionType: 'call' | 'whatsapp' | 'sms' | 'email' | 'facebook' | 'instagram' | 'website_visit' | 'support_ticket' | 'meeting' | 'other';

  @Column({ 
    length: 20,
    name: 'interaction_direction',
    type: 'varchar',
    nullable: true
  })
  interactionDirection: 'inbound' | 'outbound';

  @Column({ length: 255, nullable: true })
  subject: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'agent_id', nullable: true })
  agentId: number;

  @Column({ name: 'duration_seconds', nullable: true })
  durationSeconds: number;

  @Column({ length: 100, nullable: true })
  outcome: string;

  @Column({ name: 'follow_up_required', default: false })
  followUpRequired: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'follow_up_date' })
  followUpDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Customer, customer => customer.interactions)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
