import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('crm_dashboard_configs')
export class DashboardConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'team_leader_id' })
  teamLeaderId: number;

  @Column({ name: 'config_key', length: 100 })
  configKey: string;

  @Column({ type: 'jsonb', default: {} })
  value: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
