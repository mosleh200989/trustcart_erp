import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { HrmTrainingTypes } from './hrm-training-types.entity';
import { HrmTrainingSessions } from './hrm-training-sessions.entity';

@Entity('hr_training_programs')
export class HrmTrainingPrograms {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => HrmTrainingTypes, type => type.training_programs, { nullable: true, onDelete: 'SET NULL' })
  training_type: HrmTrainingTypes;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => HrmTrainingSessions, session => session.training_program)
  training_sessions: HrmTrainingSessions[];
}
