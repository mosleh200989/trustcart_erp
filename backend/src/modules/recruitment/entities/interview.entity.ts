import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';
import { JobApplication } from './job-application.entity';

export enum InterviewType {
  ONLINE = 'online',
  OFFLINE = 'offline',
  PHONE = 'phone'
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  NO_SHOW = 'no_show'
}

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => JobApplication, application => application.interviews)
  @JoinColumn({ name: 'application_id' })
  application: JobApplication;

  @Column()
  application_id: number;

  @Column({
    type: 'enum',
    enum: InterviewType,
    default: InterviewType.OFFLINE
  })
  interview_type: InterviewType;

  @Column({ type: 'timestamp' })
  scheduled_date: Date;

  @Column({ length: 10, nullable: true })
  scheduled_time: string;

  @Column({ type: 'int', default: 60 })
  duration_minutes: number;

  @Column({ length: 300, nullable: true })
  meeting_link: string;

  @Column({ length: 300, nullable: true })
  meeting_address: string;

  @Column('text', { nullable: true })
  interview_notes: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'interviewer_id' })
  interviewer: User;

  @Column({ nullable: true })
  interviewer_id: number;

  @Column({
    type: 'enum',
    enum: InterviewStatus,
    default: InterviewStatus.SCHEDULED
  })
  status: InterviewStatus;

  @Column('text', { nullable: true })
  feedback: string;

  @Column({ type: 'int', nullable: true })
  technical_rating?: number;

  @Column({ type: 'int', nullable: true })
  communication_rating?: number;

  @Column({ type: 'int', nullable: true })
  cultural_fit_rating?: number;

  @Column({ type: 'int', nullable: true })
  overall_rating?: number;

  @Column({ default: false })
  recommend_for_hiring?: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'scheduled_by' })
  scheduled_by_user?: User;

  @Column({ nullable: true })
  scheduled_by?: number;

  @CreateDateColumn()
  created_at?: Date;

  @UpdateDateColumn()
  updated_at?: Date;
}
