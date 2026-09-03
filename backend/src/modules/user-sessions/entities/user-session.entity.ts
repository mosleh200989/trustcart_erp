import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One row per successful login. The `sessionKey` is the `sid` claim carried in
 * the JWT, so a token can be traced back to the device it was issued to and
 * refused once the session is revoked.
 *
 * Every column is declared with an explicit `type` — a nullable column whose
 * TypeScript type is a union infers as `Object` and kills the app at boot.
 */
@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_key', type: 'uuid' })
  sessionKey: string;

  /** 'user' for staff accounts, 'customer' for the customer portal. */
  @Column({ name: 'subject_type', type: 'varchar', length: 20, default: 'user' })
  subjectType: string;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId: number | null;

  /** Role at the moment of login — roles get reassigned, this does not. */
  @Column({ name: 'role_id', type: 'int', nullable: true })
  roleId: number | null;

  @Column({ name: 'device_type', type: 'varchar', length: 20, default: 'unknown' })
  deviceType: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  browser: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  os: string | null;

  @Column({ name: 'device_label', type: 'varchar', length: 160, nullable: true })
  deviceLabel: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 100, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'revoked_by', type: 'int', nullable: true })
  revokedBy: number | null;

  @Column({ name: 'revoke_reason', type: 'varchar', length: 40, nullable: true })
  revokeReason: string | null;
}
