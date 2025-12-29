import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { HrmEmployees } from './hrm-employees.entity';

@Entity('hr_terminations')
export class HrmTerminations {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmEmployees, employee => employee.terminations, { nullable: true, onDelete: 'SET NULL' })
  employee: HrmEmployees;

  @Column({ type: 'date' })
  termination_date: string;

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
