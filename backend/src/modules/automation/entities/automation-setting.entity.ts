import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Flat key -> jsonb settings store for the Automation panel.
 *
 * Deliberately schemaless on the value side: the panel can grow new knobs
 * without a migration, which is what "everything configurable from here" needs.
 * Known keys are `global`, `ai`, `escalation`, `gate` — see AutomationSettingsService
 * for their shapes and defaults.
 */
@Entity('automation_settings')
export class AutomationSetting {
  @PrimaryColumn({ length: 100 })
  key!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  value!: Record<string, any>;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @Column({ type: 'int', nullable: true })
  updated_by!: number | null;
}
