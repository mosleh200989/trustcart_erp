import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * One question the shop answers the same way every time.
 *
 * This is the policy half of the grounding split. Prices and order status come
 * from the ERP because they change; delivery time, coverage and how to order
 * live nowhere in the database, so before this table the bot had no grounded
 * answer for them and correctly escalated every single one.
 *
 * The answer is written by a person and sent verbatim. It carries no
 * placeholders on purpose — a figure typed here would go stale exactly the way
 * a figure in an imported chat does.
 *
 * `channel_id = null` means the answer applies to every channel.
 *
 * Every column declares its `type` explicitly. `string | null` reflects as
 * `Object`, which TypeORM cannot map, and that took production down once.
 */
@Entity('automation_faqs')
export class AutomationFaq {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: true })
  channel_id!: number | null;

  /** Grouping for the panel only. Never shown to a customer. */
  @Column({ type: 'varchar', length: 60, default: 'general' })
  category!: string;

  @Column({ type: 'varchar', length: 300 })
  question!: string;

  @Column({ type: 'text' })
  answer!: string;

  /** Extra words a customer might use, beyond those already in `question`. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  keywords!: string[];

  /** Lower sorts first, and wins a scoring tie. */
  @Column({ type: 'int', default: 100 })
  priority!: number;

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
