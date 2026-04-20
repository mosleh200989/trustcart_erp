import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('crm_notifications')
@Index(['user_id', 'is_read'])
export class CrmNotification {
  @PrimaryGeneratedColumn()
  id!: number;

  /** The agent / team-leader who should receive this notification */
  @Column()
  user_id!: number;

  /** 'task_assigned' | 'followup_assigned' | 'followup_due' */
  @Column({ length: 60 })
  type!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  /** Arbitrary extra data (taskId, customerId, …) */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ default: false })
  is_read!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
