import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * One imported message, stored MASKED. The original body is never written.
 *
 * `direction` is what makes the data useful: outbound messages are what the
 * team actually said, and those are the ones worth learning tone from.
 */
@Entity('automation_history_messages')
export class AutomationHistoryMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  thread_id!: number;

  @Column({ type: 'int' })
  channel_id!: number;

  @Column({ type: 'varchar', length: 191 })
  external_id!: string;

  @Column({ type: 'varchar', length: 10 })
  direction!: 'inbound' | 'outbound';

  /** Masked text only — figures and identifiers are replaced at import. */
  @Column({ type: 'text', nullable: true })
  text!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  masked_counts!: Record<string, number>;

  /** Set by a person while picking examples for the AI system prompt. */
  @Column({ type: 'boolean', default: false })
  is_example!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sent_at!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
