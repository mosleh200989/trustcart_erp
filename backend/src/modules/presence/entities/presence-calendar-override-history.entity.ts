import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('presence_calendar_override_history')
@Index('idx_presence_calendar_override_history_user_date', ['userId', 'dateKey'])
export class PresenceCalendarOverrideHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'date_key', type: 'varchar', length: 10 })
  dateKey!: string;

  @Column({ name: 'action', type: 'varchar', length: 20 })
  action!: 'created' | 'updated' | 'cleared';

  @Column({ name: 'previous_attendance_key', type: 'varchar', length: 10, nullable: true })
  previousAttendanceKey!: string | null;

  @Column({ name: 'previous_attendance_label', type: 'varchar', length: 100, nullable: true })
  previousAttendanceLabel!: string | null;

  @Column({ name: 'previous_note', type: 'text', nullable: true })
  previousNote!: string | null;

  @Column({ name: 'new_attendance_key', type: 'varchar', length: 10, nullable: true })
  newAttendanceKey!: string | null;

  @Column({ name: 'new_attendance_label', type: 'varchar', length: 100, nullable: true })
  newAttendanceLabel!: string | null;

  @Column({ name: 'new_note', type: 'text', nullable: true })
  newNote!: string | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
