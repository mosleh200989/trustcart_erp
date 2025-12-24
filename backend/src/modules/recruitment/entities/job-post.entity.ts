import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';
import { JobApplication } from './job-application.entity';

export enum JobStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  ARCHIVED = 'archived'
}

export enum JobType {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
  REMOTE = 'remote'
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead'
}

@Entity('job_posts')
export class JobPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ unique: true, length: 250 })
  slug: string;

  @Column('text')
  description: string;

  @Column('text')
  requirements: string;

  @Column('text', { nullable: true })
  responsibilities: string;

  @Column({ length: 100 })
  category: string;

  @Column({ length: 100 })
  department: string;

  @Column({ length: 100 })
  location: string;

  @Column({
    type: 'enum',
    enum: JobType,
    default: JobType.FULL_TIME
  })
  job_type: JobType;

  @Column({
    type: 'enum',
    enum: ExperienceLevel,
    default: ExperienceLevel.MID
  })
  experience_level: ExperienceLevel;

  @Column({ type: 'int', nullable: true })
  min_salary: number;

  @Column({ type: 'int', nullable: true })
  max_salary: number;

  @Column({ length: 20, default: 'BDT' })
  currency: string;

  @Column({ type: 'int', default: 1 })
  vacancies: number;

  @Column({ type: 'date', nullable: true })
  deadline: Date;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.DRAFT
  })
  status: JobStatus;

  @Column('simple-array', { nullable: true })
  required_skills: string[];

  @Column('simple-array', { nullable: true })
  benefits: string[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'posted_by' })
  posted_by_user: User;

  @Column({ nullable: true })
  posted_by: number;

  @OneToMany(() => JobApplication, application => application.job_post)
  applications: JobApplication[];

  @Column({ type: 'int', default: 0 })
  views_count: number;

  @Column({ type: 'int', default: 0 })
  applications_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
