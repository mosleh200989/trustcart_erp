import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import type { AgentPresenceStatus } from '../telephony-presence.service';

@Entity('telephony_agent_presence_events')
@Index('idx_telephony_presence_events_user_time', ['userId', 'occurredAt'])
export class TelephonyAgentPresenceEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ type: 'varchar', length: 20 })
  status!: AgentPresenceStatus;

  @Column({ type: 'varchar', length: 50, default: 'api' })
  source!: string;

  @Column({ name: 'occurred_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  occurredAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
