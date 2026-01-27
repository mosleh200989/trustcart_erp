import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../../customers/customer.entity';
import { User } from '../../users/user.entity';
import { Deal } from './deal.entity';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'deal_id', nullable: true })
  dealId: number;

  @ManyToOne(() => Deal)
  @JoinColumn({ name: 'deal_id' })
  deal: Deal;

  @Column({ name: 'organizer_id' })
  organizerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'organizer_id' })
  organizer: User;

  @Column({ type: 'int', array: true, nullable: true })
  attendees: number[];

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column()
  timezone: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'meeting_link', nullable: true })
  meetingLink: string;

  @Column({ type: 'text', nullable: true })
  agenda: string;

  @Column({ name: 'preparation_notes', type: 'text', nullable: true })
  preparationNotes: string;

  @Column({ name: 'meeting_notes', type: 'text', nullable: true })
  meetingNotes: string;

  @Column({ name: 'action_items', type: 'jsonb', nullable: true })
  actionItems: any[];

  @Column({ name: 'next_steps', type: 'text', nullable: true })
  nextSteps: string;

  @Column({ name: 'outcome_rating', type: 'integer', nullable: true })
  outcomeRating: number;

  @Column({ default: 'scheduled' })
  status: string; // 'scheduled', 'completed', 'cancelled', 'no_show'

  @Column({ name: 'recording_url', nullable: true })
  recordingUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
