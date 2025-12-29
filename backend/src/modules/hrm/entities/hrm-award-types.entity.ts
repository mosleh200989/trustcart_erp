import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { HrmAwards } from './hrm-awards.entity';

@Entity('hr_award_types')
export class HrmAwardTypes {
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

  @OneToMany(() => HrmAwards, award => award.award_type)
  awards: HrmAwards[];
}
