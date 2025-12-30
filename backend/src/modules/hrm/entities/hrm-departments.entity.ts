import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { HrmBranches } from './hrm-branches.entity';
import { HrmDesignations } from './hrm-designations.entity';
import { HrmEmployees } from './hrm-employees.entity';

@Entity('hr_departments')
export class HrmDepartments {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @ManyToOne(() => HrmBranches, branch => branch.departments, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch: HrmBranches | null;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => HrmDesignations, designation => designation.department)
  designations: HrmDesignations[];

  @OneToMany(() => HrmEmployees, employee => employee.department)
  employees: HrmEmployees[];
}
