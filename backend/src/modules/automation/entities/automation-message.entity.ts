import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type AutomationMessageDirection = 'inbound' | 'outbound';
export type AutomationMessageKind = 'message' | 'comment' | 'private_reply' | 'post';

/** Which layer of the reply brain produced this text. */
export type AutomationReplySource = 'rule' | 'erp' | 'ai' | 'human' | 'greeting';

export type AutomationMessageStatus = 'pending' | 'sent' | 'failed' | 'held';

/**
 * Every inbound and outbound message or comment.
 *
 * Outbound rows written while the channel is in `shadow` mode carry
 * `shadow = true` and `status = 'held'` — the reply the bot *would* have sent.
 * That is the whole point of the watch week: read these before going live.
 */
@Entity('automation_messages')
export class AutomationMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  conversation_id!: number;

  @Column({ type: 'int' })
  channel_id!: number;

  @Column({ type: 'varchar', length: 10 })
  direction!: AutomationMessageDirection;

  @Column({ type: 'varchar', length: 20, default: 'message' })
  kind!: AutomationMessageKind;

  /** Meta's id for the comment/message, used for replies and de-duplication. */
  @Column({ type: 'varchar', length: 191, nullable: true })
  external_id!: string | null;

  @Column({ type: 'text', nullable: true })
  text!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  source!: AutomationReplySource | null;

  @Column({ type: 'int', nullable: true })
  rule_id!: number | null;

  @Column({ type: 'numeric', precision: 4, scale: 3, nullable: true })
  confidence!: number | null;

  @Column({ type: 'boolean', default: false })
  shadow!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'sent' })
  status!: AutomationMessageStatus;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  ai_model!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  ai_usage!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  meta!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
