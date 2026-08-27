import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type AutomationOutboxStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

/** Graph API actions the outbox knows how to perform. */
export type AutomationOutboxAction =
  | 'comment_reply'
  | 'private_reply'
  | 'send_message'
  | 'sender_action'
  | 'page_post'
  | 'hide_comment'
  | 'delete_comment';

/**
 * One outgoing Graph API action.
 *
 * Rows are attempted immediately after being written; anything that fails is
 * picked up again by the cron sweep with exponential backoff. This mirrors the
 * send-now / retry-sweep-later shape already used by MetaCapiService rather than
 * introducing a Bull queue, which the codebase does not use anywhere yet.
 */
@Entity('automation_outbox')
export class AutomationOutbox {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  channel_id!: number;

  @Column({ type: 'int', nullable: true })
  conversation_id!: number | null;

  @Column({ type: 'int', nullable: true })
  message_id!: number | null;

  @Column({ length: 30 })
  action!: AutomationOutboxAction;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, any>;

  @Column({ length: 20, default: 'pending' })
  status!: AutomationOutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'int', default: 5 })
  max_attempts!: number;

  @Column({ type: 'timestamp' })
  next_attempt_at!: Date;

  @Column({ type: 'text', nullable: true })
  last_error!: string | null;

  /** The id Meta returned for the created comment/message. */
  @Column({ length: 191, nullable: true })
  external_id!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  sent_at!: Date | null;
}
