import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { HrmDepartments } from './hrm-departments.entity';
import { HrmEmployees } from './hrm-employees.entity';
import { HrmTransfers } from './hrm-transfers.entity';

@Entity('hr_branches')
export class HrmBranches {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  state: string;

  @Column({ length: 100, nullable: true })
  country: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => HrmDepartments, department => department.branch)
  departments: HrmDepartments[];

  @OneToMany(() => HrmEmployees, employee => employee.branch)
  employees: HrmEmployees[];

  @OneToMany(() => HrmTransfers, transfer => transfer.from_branch)
  transfers_from: HrmTransfers[];

  @OneToMany(() => HrmTransfers, transfer => transfer.to_branch)
  transfers_to: HrmTransfers[];
}
