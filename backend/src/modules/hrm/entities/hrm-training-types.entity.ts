import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { HrmTrainingPrograms } from './hrm-training-programs.entity';

@Entity('hr_training_types')
export class HrmTrainingTypes {
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

  @OneToMany(() => HrmTrainingPrograms, program => program.training_type)
  training_programs: HrmTrainingPrograms[];
}
