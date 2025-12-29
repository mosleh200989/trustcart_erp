import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { HrmEmployees } from './hrm-employees.entity';
import { HrmTrainingSessions } from './hrm-training-sessions.entity';

@Entity('hr_employee_trainings')
export class HrmEmployeeTrainings {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmEmployees, employee => employee.employee_trainings, { nullable: true, onDelete: 'SET NULL' })
  employee: HrmEmployees;

  @ManyToOne(() => HrmTrainingSessions, session => session.employee_trainings, { nullable: true, onDelete: 'SET NULL' })
  training_session: HrmTrainingSessions;

  @Column({ length: 50, default: 'Pending' })
  completion_status: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
