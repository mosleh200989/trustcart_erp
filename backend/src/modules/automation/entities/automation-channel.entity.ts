import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AutomationPlatform = 'facebook' | 'instagram';

/**
 * `off`    — events are stored but nothing is decided or sent.
 * `shadow` — the reply is decided and saved, but never sent to Meta. This is the
 *            safe way to watch what the bot *would* have said for a week.
 * `live`   — replies are actually posted.
 */
export type AutomationChannelMode = 'off' | 'shadow' | 'live';

/**
 * One connected Facebook Page or Instagram account.
 *
 * The page access token lives on the row rather than in .env so a new brand can
 * be connected from the panel without a deploy — the same reasoning behind
 * `storefronts.meta_capi_access_token` for the Conversions API.
 */
@Entity('automation_channels')
export class AutomationChannel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 20, default: 'facebook' })
  platform!: AutomationPlatform;

  /** The Page ID Meta sends as `entry[].id`. Also the bot's own author id. */
  @Column({ type: 'varchar', length: 64 })
  page_id!: string;

  @Column({ type: 'text', nullable: true })
  page_access_token!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ig_account_id!: string | null;

  /** Links this page to a brand so replies can use that brand's catalogue. */
  @Column({ type: 'int', nullable: true })
  storefront_id!: number | null;

  @Column({ type: 'varchar', length: 20, default: 'off' })
  mode!: AutomationChannelMode;

  @Column({ type: 'boolean', default: true })
  reply_to_comments!: boolean;

  @Column({ type: 'boolean', default: true })
  reply_to_messages!: boolean;

  /** Also send the commenter a private message (Meta allows one per comment). */
  @Column({ type: 'boolean', default: false })
  private_reply_to_comments!: boolean;

  /** Extra system-prompt text describing this brand's tone. */
  @Column({ type: 'text', nullable: true })
  persona!: string | null;

  @Column({ type: 'text', nullable: true })
  greeting!: string | null;

  /** Appended to every outgoing reply, e.g. "— TrustCart". */
  @Column({ type: 'varchar', length: 255, nullable: true })
  signature!: string | null;

  /** Loop brake: hard cap on auto-replies per thread per hour. */
  @Column({ type: 'int', default: 3 })
  max_replies_per_thread_hour!: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  business_hours!: Record<string, any>;

  /**
   * The products this page is mainly about.
   *
   * Consulted only when the customer's words match no product — "dam koto?"
   * names nothing, and without this the engine has no price it is allowed to
   * state and hands the shop's most common question to a person.
   */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  featured_product_ids!: number[];

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_event_at!: Date | null;

  /** Result of the last connection check: ok | warning | error | unknown. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  health_status!: string | null;

  /** Why, in words someone can act on. Never contains the access token. */
  @Column({ type: 'text', nullable: true })
  health_detail!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  health_checked_at!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
