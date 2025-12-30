import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { HrmDepartments } from './hrm-departments.entity';
import { HrmEmployees } from './hrm-employees.entity';
import { HrmPromotions } from './hrm-promotions.entity';

@Entity('hr_designations')
export class HrmDesignations {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @ManyToOne(() => HrmDepartments, department => department.designations, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: HrmDepartments | null;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => HrmEmployees, employee => employee.designation)
  employees: HrmEmployees[];

  @OneToMany(() => HrmPromotions, promotion => promotion.old_designation)
  old_promotions: HrmPromotions[];

  @OneToMany(() => HrmPromotions, promotion => promotion.new_designation)
  new_promotions: HrmPromotions[];
}

