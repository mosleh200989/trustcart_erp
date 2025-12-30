import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { HrmTrainingPrograms } from './hrm-training-programs.entity';
import { HrmEmployeeTrainings } from './hrm-employee-trainings.entity';

@Entity('hr_training_sessions')
export class HrmTrainingSessions {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmTrainingPrograms, program => program.training_sessions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'training_program_id' })
  training_program: HrmTrainingPrograms;

  @Column({ length: 255 })
  session_title: string;

  @Column({ type: 'date', nullable: true })
  session_date: string;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @Column({ length: 255, nullable: true })
  trainer: string;

  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => HrmEmployeeTrainings, et => et.training_session)
  employee_trainings: HrmEmployeeTrainings[];
}

