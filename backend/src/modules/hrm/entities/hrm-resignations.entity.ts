import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { HrmEmployees } from './hrm-employees.entity';

@Entity('hr_resignations')
export class HrmResignations {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmEmployees, employee => employee.resignations, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employee_id' })
  employee: HrmEmployees;

  @Column({ type: 'date' })
  resignation_date: string;

  @Column({ type: 'date', nullable: true })
  notice_date: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ length: 50, default: 'Pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}

