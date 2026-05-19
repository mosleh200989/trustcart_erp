import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('presence_calendar_overrides')
@Index('idx_presence_calendar_overrides_user_date', ['userId', 'dateKey'], { unique: true })
export class PresenceCalendarOverride {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'date_key', type: 'varchar', length: 10 })
  dateKey!: string;

  @Column({ name: 'attendance_key', type: 'varchar', length: 10 })
  attendanceKey!: string;

  @Column({ name: 'attendance_label', type: 'varchar', length: 100, nullable: true })
  attendanceLabel!: string | null;

  @Column({ name: 'note', type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
