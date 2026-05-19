import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('presence_telegram_notifications')
@Index('idx_presence_telegram_notifications_unique', ['userId', 'dateKey', 'kind'], { unique: true })
export class PresenceTelegramNotification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'date_key', type: 'varchar', length: 10 })
  dateKey!: string;

  @Column({ name: 'kind', type: 'varchar', length: 30 })
  kind!: 'offline_reminder' | 'online_thank_you';

  @Column({ name: 'telegram_chat_id', type: 'varchar', length: 80 })
  telegramChatId!: string;

  @Column({ name: 'message', type: 'text' })
  message!: string;

  @Column({ name: 'status', type: 'varchar', length: 30, default: 'pending' })
  status!: 'sent' | 'failed' | 'pending';

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
