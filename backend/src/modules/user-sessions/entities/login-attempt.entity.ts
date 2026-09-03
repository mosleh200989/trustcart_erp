import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One row per login attempt. `identifier` is what the person typed, lowercased,
 * never a resolved account — the lockout keys on it so that being locked out
 * says nothing about whether the account exists.
 */
@Entity('login_attempts')
export class LoginAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 190 })
  identifier: string;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'subject_type', type: 'varchar', length: 20, nullable: true })
  subjectType: string | null;

  /** success | invalid_password | unknown_account | inactive | locked */
  @Column({ type: 'varchar', length: 30 })
  result: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 100, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'device_type', type: 'varchar', length: 20, nullable: true })
  deviceType: string | null;

  @Column({ name: 'device_label', type: 'varchar', length: 160, nullable: true })
  deviceLabel: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
