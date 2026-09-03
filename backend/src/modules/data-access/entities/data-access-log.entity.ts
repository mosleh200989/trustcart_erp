import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** One read of sensitive data: who saw how many records, filtered how, from where. */
@Entity('data_access_log')
export class DataAccessLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  /** Denormalised so the log still names the reader after the account is deleted. */
  @Column({ name: 'user_name', type: 'varchar', length: 190, nullable: true })
  userName: string | null;

  @Column({ type: 'varchar', length: 60 })
  resource: string;

  @Column({ type: 'varchar', length: 20 })
  action: string;

  @Column({ name: 'record_count', type: 'int', default: 0 })
  recordCount: number;

  @Column({ name: 'record_id', type: 'varchar', length: 100, nullable: true })
  recordId: string | null;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  filters: Record<string, any>;

  @Column({ type: 'varchar', length: 300, nullable: true })
  endpoint: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 100, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
