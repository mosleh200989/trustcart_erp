import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { HrmPerformanceIndicatorCategories } from './hrm-performance-indicator-categories.entity';
import { HrmEmployeePerformance } from './hrm-employee-performance.entity';

@Entity('hr_performance_indicators')
export class HrmPerformanceIndicators {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmPerformanceIndicatorCategories, category => category.indicators, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: HrmPerformanceIndicatorCategories;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 10 })
  max_score: number;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => HrmEmployeePerformance, ep => ep.indicator)
  employee_performance: HrmEmployeePerformance[];
}

