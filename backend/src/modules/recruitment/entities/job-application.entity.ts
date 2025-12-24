import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';
import { JobPost } from './job-post.entity';
import { Interview } from './interview.entity';

export enum ApplicationStatus {
  APPLIED = 'applied',
  REVIEWING = 'reviewing',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  SELECTED = 'selected',
  REJECTED = 'rejected',
  HOLD = 'hold',
  WITHDRAWN = 'withdrawn'
}

export enum CandidateTag {
  HOT = 'hot',
  AVERAGE = 'average',
  FUTURE = 'future'
}

@Entity('job_applications')
export class JobApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => JobPost, jobPost => jobPost.applications)
  @JoinColumn({ name: 'job_post_id' })
  job_post: JobPost;

  @Column()
  job_post_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'applicant_id' })
  applicant: User;

  @Column()
  applicant_id: number;

  @Column({ length: 100 })
  full_name: string;

  @Column({ length: 100 })
  email: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 200, nullable: true })
  current_company: string;

  @Column({ length: 100, nullable: true })
  current_position: string;

  @Column({ type: 'int', default: 0 })
  years_of_experience: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  expected_salary: number;

  @Column({ length: 300, nullable: true })
  resume_url: string;

  @Column({ length: 300, nullable: true })
  cover_letter_url: string;

  @Column('text', { nullable: true })
  cover_letter_text: string;

  @Column({ length: 300, nullable: true })
  linkedin_url: string;

  @Column({ length: 300, nullable: true })
  portfolio_url: string;

  @Column('simple-array', { nullable: true })
  skills: string[];

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.APPLIED
  })
  status: ApplicationStatus;

  @Column({
    type: 'enum',
    enum: CandidateTag,
    nullable: true
  })
  tag: CandidateTag;

  @Column('text', { nullable: true })
  recruiter_notes: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewed_by_user: User;

  @Column({ nullable: true })
  reviewed_by: number;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date;

  @OneToMany(() => Interview, interview => interview.application)
  interviews: Interview[];

  @CreateDateColumn()
  applied_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
