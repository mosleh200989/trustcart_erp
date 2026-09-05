import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AutomationOrderDraftStatus = 'collecting' | 'confirming' | 'placed' | 'cancelled';

/**
 * An order being taken in a Messenger thread.
 *
 * This is the bot's memory of what it has already been told. Re-deriving that
 * from the conversation on every message is the kind of thing a model gets
 * right nine times out of ten, and the tenth is a stranger's address on
 * someone else's order.
 *
 * Nothing here is a real order. `sales_order_id` is written exactly once, under
 * a conditional update, and is what makes a double "confirm" or a webhook retry
 * harmless.
 *
 * Every column declares its `type` explicitly — `string | null` reflects as
 * `Object`, which TypeORM cannot map, and that took production down once.
 */
@Entity('automation_order_drafts')
export class AutomationOrderDraft {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  conversation_id!: number;

  @Column({ type: 'int' })
  channel_id!: number;

  @Column({ type: 'varchar', length: 20, default: 'collecting' })
  status!: AutomationOrderDraftStatus;

  @Column({ type: 'int', nullable: true })
  product_id!: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  product_name!: string | null;

  /**
   * Snapshotted when the customer picked the product, so a price change
   * mid-conversation cannot quietly alter what they agreed to. Both the
   * read-back and the order are built from this number.
   */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  unit_price!: string | number | null;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  customer_name!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  delivery_charge!: string | number;

  @Column({ type: 'int', nullable: true })
  sales_order_id!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sales_order_number!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  placed_at!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
