import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { HrmEmployees } from './hrm-employees.entity';

@Entity('hr_warnings')
export class HrmWarnings {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmEmployees, employee => employee.warnings, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employee_id' })
  employee: HrmEmployees;

  @Column({ length: 100, nullable: true })
  warning_type: string;

  @Column({ type: 'date', nullable: true })
  warning_date: string;

  @Column({ length: 255, nullable: true })
  subject: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, default: 'Active' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}

