import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { UserPresenceState } from './user-presence-status.entity';

@Entity('user_presence_events')
@Index('idx_user_presence_events_user_time', ['userId', 'occurredAt'])
@Index('idx_user_presence_events_state_time', ['state', 'occurredAt'])
export class UserPresenceEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ type: 'varchar', length: 20 })
  state!: UserPresenceState;

  @Column({ type: 'varchar', length: 50, default: 'manual' })
  source!: string;

  @Column({ name: 'occurred_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  occurredAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
