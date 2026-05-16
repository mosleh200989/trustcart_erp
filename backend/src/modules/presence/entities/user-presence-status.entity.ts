import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type UserPresenceState = 'online' | 'offline';

@Entity('user_presence_statuses')
@Index('idx_user_presence_statuses_user', ['userId'], { unique: true })
@Index('idx_user_presence_statuses_state', ['state'])
export class UserPresenceStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', unique: true })
  userId!: number;

  @Column({ type: 'varchar', length: 20, default: 'offline' })
  state!: UserPresenceState;

  @Column({ name: 'last_changed_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastChangedAt!: Date;

  @Column({ name: 'last_seen_at', type: 'timestamp', nullable: true })
  lastSeenAt!: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'manual' })
  source!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
