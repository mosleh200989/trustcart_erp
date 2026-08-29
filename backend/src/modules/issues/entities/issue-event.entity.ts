import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

/**
 * Append-only accountability record. A database trigger
 * (trg_issue_events_append_only) rejects UPDATE and DELETE on this table, so
 * the service must only ever insert.
 */
@Entity('issue_events')
export class IssueEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'issue_id' })
  issueId: number;

  @Column({ name: 'actor_id' })
  actorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_id' })
  actor?: User;

  @Column({ length: 40 })
  action: string;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus?: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20, nullable: true })
  toStatus?: string | null;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  payload: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
