import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Self-contained history of every change made inside the Automation panel:
 * who unlocked it, who changed a rule, who flipped a channel to live.
 *
 * Kept separate from the global `audit_log` table on purpose — the panel is
 * meant to be auditable from inside itself, without cross-module joins.
 */
@Entity('automation_audit')
export class AutomationAudit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: true })
  user_id!: number | null;

  @Column({ length: 255, nullable: true })
  user_email!: string | null;

  /** e.g. gate.unlock, channel.update, rule.create, settings.update, mode.change */
  @Column({ length: 80 })
  action!: string;

  @Column({ length: 60, nullable: true })
  entity!: string | null;

  @Column({ length: 60, nullable: true })
  entity_id!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  before!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  after!: Record<string, any> | null;

  @Column({ length: 64, nullable: true })
  ip!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
