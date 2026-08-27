import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type AutomationEventStatus = 'received' | 'handled' | 'skipped' | 'failed';

/**
 * Raw record of every webhook delivery, written before any decision is made.
 *
 * `meta_event_id` carries a UNIQUE index, so a duplicate delivery from Meta's
 * retry logic fails the insert instead of producing a second reply. De-duplication
 * is therefore enforced by Postgres, not by application code that could race.
 */
@Entity('automation_events')
export class AutomationEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: true })
  channel_id!: number | null;

  @Column({ length: 20, default: 'facebook' })
  platform!: string;

  @Column({ length: 64, nullable: true })
  page_id!: string | null;

  /** comment | comment_edit | message | message_echo | postback | reaction | unknown */
  @Column({ length: 40, default: 'unknown' })
  event_type!: string;

  @Column({ length: 191 })
  meta_event_id!: string;

  /** Whether X-Hub-Signature-256 verified. False means it came in on a permissive mode. */
  @Column({ type: 'boolean', default: false })
  signature_valid!: boolean;

  @Column({ length: 20, default: 'received' })
  status!: AutomationEventStatus;

  /** Why nothing was sent: own_page_echo, channel_off, no_text, rate_limited, ... */
  @Column({ length: 160, nullable: true })
  skip_reason!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ name: 'received_at' })
  received_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  processed_at!: Date | null;
}
