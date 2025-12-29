import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { HrmAwardTypes } from './hrm-award-types.entity';
import { HrmEmployees } from './hrm-employees.entity';

@Entity('hr_awards')
export class HrmAwards {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmAwardTypes, awardType => awardType.awards, { nullable: true, onDelete: 'SET NULL' })
  award_type: HrmAwardTypes;

  @ManyToOne(() => HrmEmployees, employee => employee.awards, { nullable: true, onDelete: 'SET NULL' })
  employee: HrmEmployees;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  date_awarded: string;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
