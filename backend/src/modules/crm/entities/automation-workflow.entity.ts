import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/user.entity';
import { WorkflowExecution } from './workflow-execution.entity';

@Entity('automation_workflows')
export class AutomationWorkflow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'trigger_type', length: 50 })
  triggerType: 'deal_stage_changed' | 'task_created' | 'task_completed' | 'lead_assigned' | 
               'email_opened' | 'email_clicked' | 'meeting_scheduled' | 'meeting_completed' | 
               'time_based' | 'inactivity' | 'field_changed';

  @Column({ name: 'trigger_config', type: 'jsonb', default: {} })
  triggerConfig: any;

  @Column({ type: 'jsonb', default: [] })
  conditions: any[];

  @Column({ type: 'jsonb', default: [] })
  actions: any[];

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @Column({ name: 'execution_count', type: 'integer', default: 0 })
  executionCount: number;

  @Column({ name: 'success_count', type: 'integer', default: 0 })
  successCount: number;

  @Column({ name: 'failure_count', type: 'integer', default: 0 })
  failureCount: number;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => WorkflowExecution, (execution) => execution.workflow)
  executions: WorkflowExecution[];

  @Column({ name: 'last_executed_at', type: 'timestamp', nullable: true })
  lastExecutedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
