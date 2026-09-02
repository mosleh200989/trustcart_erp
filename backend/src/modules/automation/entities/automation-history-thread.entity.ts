import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * One imported Messenger conversation.
 *
 * `participant_ref` is a salted hash of the PSID, never the PSID itself:
 * threads stay distinguishable from one another without holding an identifier
 * that points back at a person.
 */
@Entity('automation_history_threads')
export class AutomationHistoryThread {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  channel_id!: number;

  @Column({ type: 'int', nullable: true })
  run_id!: number | null;

  @Column({ type: 'varchar', length: 191 })
  external_thread_id!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  participant_ref!: string | null;

  @Column({ type: 'int', default: 0 })
  message_count!: number;

  @Column({ type: 'timestamp', nullable: true })
  first_message_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_message_at!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
