import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AutomationThreadType = 'comment' | 'message';

/**
 * `bot`         — the bot is handling this thread.
 * `needs_human` — the bot stepped back; it appears in the panel inbox for a person.
 * `human`       — a person has taken over; the bot stays silent.
 * `closed`      — done.
 */
export type AutomationConversationStatus = 'bot' | 'needs_human' | 'human' | 'closed';

/**
 * One conversation thread.
 *
 * For Messenger the thread key is the sender's PSID (page-scoped id); for comments
 * it is the post id, so all comments on a post share one thread and one rate limit.
 */
@Entity('automation_conversations')
export class AutomationConversation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  channel_id!: number;

  @Column({ type: 'varchar', length: 20 })
  thread_type!: AutomationThreadType;

  @Column({ type: 'varchar', length: 191 })
  thread_key!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  psid!: string | null;

  @Column({ type: 'varchar', length: 191, nullable: true })
  post_id!: string | null;

  /** Filled in when we can match the person to an existing ERP customer. */
  @Column({ type: 'int', nullable: true })
  customer_id!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  display_name!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'bot' })
  status!: AutomationConversationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  escalation_reason!: string | null;

  @Column({ type: 'int', nullable: true })
  assigned_user_id!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  last_inbound_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_outbound_at!: Date | null;

  @Column({ type: 'int', default: 0 })
  message_count!: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
