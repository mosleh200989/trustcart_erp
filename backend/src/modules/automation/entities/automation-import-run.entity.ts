import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AutomationImportStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * One run of the Messenger history import.
 *
 * The Graph cursor is persisted so a long run survives a restart or a rate
 * limit and resumes where it stopped, rather than starting over and re-fetching
 * thousands of conversations.
 */
@Entity('automation_import_runs')
export class AutomationImportRun {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  channel_id!: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: AutomationImportStatus;

  @Column({ type: 'timestamp', nullable: true })
  since!: Date | null;

  @Column({ type: 'text', nullable: true })
  cursor!: string | null;

  @Column({ type: 'int', default: 0 })
  threads_imported!: number;

  @Column({ type: 'int', default: 0 })
  messages_imported!: number;

  @Column({ type: 'int', default: 0 })
  pages_fetched!: number;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'int', nullable: true })
  requested_by!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  started_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  finished_at!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
