import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TaskPriority {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  FAILED = 'failed'
}

@Entity('crm_call_tasks')
export class CallTask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  customer_id!: string;

  @Column({ nullable: true })
  assigned_agent_id!: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  task_date!: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: TaskPriority.WARM
  })
  priority!: TaskPriority;

  @Column({ type: 'varchar', length: 255, nullable: true })
  call_reason!: string;

  @Column({ nullable: true })
  recommended_product_id!: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: TaskStatus.PENDING
  })
  status!: TaskStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  call_outcome!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'time', nullable: true })
  scheduled_time!: string;

  @Column({ type: 'timestamp', nullable: true })
  completed_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
