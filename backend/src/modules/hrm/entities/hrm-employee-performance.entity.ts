import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { HrmEmployees } from './hrm-employees.entity';
import { HrmPerformanceIndicators } from './hrm-performance-indicators.entity';

@Entity('hr_employee_performance')
export class HrmEmployeePerformance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmEmployees, employee => employee.employee_performance, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employee_id' })
  employee: HrmEmployees;

  @ManyToOne(() => HrmPerformanceIndicators, indicator => indicator.employee_performance, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'indicator_id' })
  indicator: HrmPerformanceIndicators;

  @Column({ type: 'int', nullable: true })
  score: number;

  @Column({ type: 'date', nullable: true })
  review_date: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}

