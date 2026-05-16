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
