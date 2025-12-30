import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AutomationWorkflow } from './automation-workflow.entity';

@Entity('workflow_executions')
export class WorkflowExecution {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'workflow_id' })
  workflowId: number;

  @ManyToOne(() => AutomationWorkflow, (workflow) => workflow.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_id' })
  workflow: AutomationWorkflow;

  @Column({ name: 'trigger_data', type: 'jsonb', nullable: true })
  triggerData: any;

  @Column({ name: 'execution_status', length: 50 })
  executionStatus: 'success' | 'failed' | 'partial';

  @Column({ name: 'actions_executed', type: 'jsonb', default: [] })
  actionsExecuted: any[];

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'executed_at' })
  executedAt: Date;
}
