import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('presence_settings')
export class PresenceSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'office_start_time', type: 'varchar', length: 5, default: '09:00' })
  officeStartTime!: string;

  @Column({ name: 'office_end_time', type: 'varchar', length: 5, default: '18:00' })
  officeEndTime!: string;

  @Column({ name: 'timezone', type: 'varchar', length: 80, default: 'Asia/Dhaka' })
  timezone!: string;

  @Column({ name: 'attendance_key', type: 'varchar', length: 255, nullable: true })
  attendanceKey!: string | null;

  @Column({ name: 'attendance_present_key', type: 'varchar', length: 10, default: 'P' })
  attendancePresentKey!: string;

  @Column({ name: 'attendance_present_label', type: 'varchar', length: 100, default: 'Present' })
  attendancePresentLabel!: string;

  @Column({ name: 'attendance_late_key', type: 'varchar', length: 10, default: 'L' })
  attendanceLateKey!: string;

  @Column({ name: 'attendance_late_label', type: 'varchar', length: 100, default: 'Late' })
  attendanceLateLabel!: string;

  @Column({ name: 'attendance_weekly_off_key', type: 'varchar', length: 10, default: 'W' })
  attendanceWeeklyOffKey!: string;

  @Column({ name: 'attendance_weekly_off_label', type: 'varchar', length: 100, default: 'Weekly off day' })
  attendanceWeeklyOffLabel!: string;

  @Column({ name: 'attendance_excused_absence_key', type: 'varchar', length: 10, default: 'U' })
  attendanceExcusedAbsenceKey!: string;

  @Column({ name: 'attendance_excused_absence_label', type: 'varchar', length: 100, default: 'Excused absence' })
  attendanceExcusedAbsenceLabel!: string;

  @Column({ name: 'attendance_unexcused_absence_key', type: 'varchar', length: 10, default: 'A' })
  attendanceUnexcusedAbsenceKey!: string;

  @Column({ name: 'attendance_unexcused_absence_label', type: 'varchar', length: 100, default: 'Unexcused absence' })
  attendanceUnexcusedAbsenceLabel!: string;

  @Column({ name: 'google_spreadsheet_id', type: 'varchar', length: 255, nullable: true })
  googleSpreadsheetId!: string | null;

  @Column({ name: 'summary_sheet_name', type: 'varchar', length: 100, default: 'May-26' })
  summarySheetName!: string;

  @Column({ name: 'events_sheet_name', type: 'varchar', length: 100, default: '' })
  eventsSheetName!: string;

  @Column({ name: 'settings_sheet_name', type: 'varchar', length: 100, default: 'Attendance key' })
  settingsSheetName!: string;

  @Column({ name: 'last_synced_at', type: 'timestamp', nullable: true })
  lastSyncedAt!: Date | null;

  @Column({ name: 'last_sync_status', type: 'varchar', length: 30, nullable: true })
  lastSyncStatus!: string | null;

  @Column({ name: 'last_sync_message', type: 'text', nullable: true })
  lastSyncMessage!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
