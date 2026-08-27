import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AutomationRuleMatchType = 'contains' | 'equals' | 'starts_with' | 'regex';
export type AutomationRuleAppliesTo = 'comment' | 'message' | 'both';

/**
 * `reply`    — send `reply_text`.
 * `escalate` — hand the thread to a human, send nothing.
 * `ignore`   — deliberately stay silent (spam, emoji-only, tagging friends).
 * `ai`       — skip the remaining rules and let the AI answer this one.
 */
export type AutomationRuleAction = 'reply' | 'escalate' | 'ignore' | 'ai';

/**
 * A keyword rule. Rules run before the AI, cheapest first, so the common
 * questions ("price?", "delivery charge koto?") never cost an API call.
 *
 * `channel_id = null` means the rule applies to every channel.
 */
@Entity('automation_rules')
export class AutomationRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: true })
  channel_id!: number | null;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 20, default: 'contains' })
  match_type!: AutomationRuleMatchType;

  /** Any pattern matching is enough to fire the rule. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  patterns!: string[];

  @Column({ length: 20, default: 'both' })
  applies_to!: AutomationRuleAppliesTo;

  @Column({ length: 20, default: 'reply' })
  action!: AutomationRuleAction;

  @Column({ type: 'text', nullable: true })
  reply_text!: string | null;

  /** Optional private message sent alongside a public comment reply. */
  @Column({ type: 'text', nullable: true })
  private_reply_text!: string | null;

  /** Lower runs first. */
  @Column({ type: 'int', default: 100 })
  priority!: number;

  @Column({ type: 'boolean', default: true })
  stop_on_match!: boolean;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'int', default: 0 })
  hit_count!: number;

  @Column({ type: 'timestamp', nullable: true })
  last_hit_at!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
