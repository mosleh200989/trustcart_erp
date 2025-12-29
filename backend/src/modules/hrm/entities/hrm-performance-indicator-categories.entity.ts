import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { HrmPerformanceIndicators } from './hrm-performance-indicators.entity';

@Entity('hr_performance_indicator_categories')
export class HrmPerformanceIndicatorCategories {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => HrmPerformanceIndicators, indicator => indicator.category)
  indicators: HrmPerformanceIndicators[];
}
