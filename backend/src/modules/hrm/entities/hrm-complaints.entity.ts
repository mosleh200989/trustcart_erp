import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { HrmEmployees } from './hrm-employees.entity';

@Entity('hr_complaints')
export class HrmComplaints {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmEmployees, employee => employee.complaints, { nullable: true, onDelete: 'SET NULL' })
  employee: HrmEmployees;

  @Column({ length: 100, nullable: true })
  complaint_type: string;

  @Column({ type: 'date', nullable: true })
  complaint_date: string;

  @Column({ length: 255, nullable: true })
  subject: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, default: 'Open' })
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
