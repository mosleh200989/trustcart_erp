import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TelephonyCallStatus {
  INITIATED = 'initiated',
  RINGING = 'ringing',
  ANSWERED = 'answered',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('telephony_calls')
export class TelephonyCall {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, default: 'bracknet' })
  provider!: string;

  @Column({ name: 'external_call_id', type: 'varchar', length: 255, nullable: true })
  externalCallId!: string | null;

  @Column({ name: 'task_id', type: 'int', nullable: true })
  taskId!: number | null;

  @Column({ name: 'agent_user_id', type: 'int', nullable: true })
  agentUserId!: number | null;

  @Column({ name: 'agent_phone', type: 'varchar', length: 30, nullable: true })
  agentPhone!: string | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 30 })
  customerPhone!: string;

  @Column({ type: 'varchar', length: 20, default: 'outbound' })
  direction!: string;

  @Column({ type: 'varchar', length: 20, default: TelephonyCallStatus.INITIATED })
  status!: TelephonyCallStatus;

  @Column({ name: 'started_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: Date;

  @Column({ name: 'answered_at', type: 'timestamp', nullable: true })
  answeredAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt!: Date | null;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds!: number | null;

  @Column({ name: 'recording_url', type: 'text', nullable: true })
  recordingUrl!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  meta!: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
