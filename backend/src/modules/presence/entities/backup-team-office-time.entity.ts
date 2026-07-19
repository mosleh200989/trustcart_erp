import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('backup_team_office_times')
@Index('idx_backup_team_office_times_user', ['userId'])
export class BackupTeamOfficeTime {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'weekdays', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  weekdays!: string[];

  @Column({ name: 'office_start_time', type: 'varchar', length: 5 })
  officeStartTime!: string;

  @Column({ name: 'office_end_time', type: 'varchar', length: 5 })
  officeEndTime!: string;

  @Column({ name: 'caution_minutes', type: 'int', default: 0 })
  cautionMinutes!: number;

  @Column({ name: 'lunch_break_start_time', type: 'varchar', length: 5, nullable: true })
  lunchBreakStartTime!: string | null;

  @Column({ name: 'lunch_break_end_time', type: 'varchar', length: 5, nullable: true })
  lunchBreakEndTime!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
