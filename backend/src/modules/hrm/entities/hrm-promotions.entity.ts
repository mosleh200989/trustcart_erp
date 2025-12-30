import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { HrmEmployees } from './hrm-employees.entity';
import { HrmDesignations } from './hrm-designations.entity';

@Entity('hr_promotions')
export class HrmPromotions {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmEmployees, employee => employee.promotions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employee_id' })
  employee: HrmEmployees;

  @ManyToOne(() => HrmDesignations, designation => designation.old_promotions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'old_designation_id' })
  old_designation: HrmDesignations;

  @ManyToOne(() => HrmDesignations, designation => designation.new_promotions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'new_designation_id' })
  new_designation: HrmDesignations;

  @Column({ type: 'date', nullable: true })
  promotion_date: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}

