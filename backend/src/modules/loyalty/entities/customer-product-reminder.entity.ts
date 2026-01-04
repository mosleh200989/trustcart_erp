import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ReminderChannel = 'whatsapp' | 'sms' | 'call' | 'email';

@Entity('customer_product_reminders')
@Index(['customerId', 'productId'], { unique: true })
export class CustomerProductReminder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'customer_id', type: 'int' })
  customerId!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @Column({ name: 'last_order_id', type: 'int', nullable: true })
  lastOrderId!: number | null;

  @Column({ name: 'last_order_date', type: 'date' })
  lastOrderDate!: string;

  @Column({ name: 'reminder_due_date', type: 'date' })
  reminderDueDate!: string;

  @Column({ name: 'reminder_sent', type: 'boolean', default: false })
  reminderSent!: boolean;

  @Column({ name: 'reminder_sent_at', type: 'timestamp', nullable: true })
  reminderSentAt!: Date | null;

  @Column({ name: 'reminder_channel', type: 'varchar', length: 20, nullable: true })
  reminderChannel!: ReminderChannel | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
