import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SalesPipeline } from './sales-pipeline.entity';

@Entity('custom_deal_stages')
export class CustomDealStage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, default: '#3B82F6' })
  color: string;

  @Column({ type: 'integer', default: 0 })
  position: number;

  @Column({ name: 'default_probability', type: 'integer', default: 50 })
  defaultProbability: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'pipeline_id', default: 1 })
  pipelineId: number;

  @ManyToOne(() => SalesPipeline)
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: SalesPipeline;

  @Column({ name: 'required_fields', type: 'jsonb', default: [] })
  requiredFields: string[];

  @Column({ name: 'auto_move_after_days', type: 'integer', nullable: true })
  autoMoveAfterDays: number;

  @Column({ name: 'stage_type', length: 50, default: 'open' })
  stageType: 'open' | 'won' | 'lost';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
