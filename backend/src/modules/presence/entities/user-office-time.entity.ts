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

  @Column({ name: 'weekly_day_off', type: 'varchar', length: 20, nullable: true })
  weeklyDayOff!: string | null;

  @Column({ name: 'caution_minutes', type: 'int', default: 0 })
  cautionMinutes!: number;

  @Column({ name: 'lunch_break_start_time', type: 'varchar', length: 5, nullable: true })
  lunchBreakStartTime!: string | null;

  @Column({ name: 'lunch_break_end_time', type: 'varchar', length: 5, nullable: true })
  lunchBreakEndTime!: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
