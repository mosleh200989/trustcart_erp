import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_office_times')
@Index('idx_user_office_times_user', ['userId'], { unique: true })
export class UserOfficeTime {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', unique: true })
  userId!: number;

  @Column({ name: 'office_start_time', type: 'varchar', length: 5, nullable: true })
  officeStartTime!: string | null;

  @Column({ name: 'office_end_time', type: 'varchar', length: 5, nullable: true })
  officeEndTime!: string | null;

  @Column({ name: 'telegram_chat_id', type: 'varchar', length: 80, nullable: true })
  telegramChatId!: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
