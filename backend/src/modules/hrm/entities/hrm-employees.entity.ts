import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { HrmBranches } from './hrm-branches.entity';
import { HrmDepartments } from './hrm-departments.entity';
import { HrmDesignations } from './hrm-designations.entity';
import { HrmAwards } from './hrm-awards.entity';
import { HrmPromotions } from './hrm-promotions.entity';
import { HrmResignations } from './hrm-resignations.entity';
import { HrmTerminations } from './hrm-terminations.entity';
import { HrmWarnings } from './hrm-warnings.entity';
import { HrmTrips } from './hrm-trips.entity';
import { HrmComplaints } from './hrm-complaints.entity';
import { HrmTransfers } from './hrm-transfers.entity';
import { HrmEmployeeTrainings } from './hrm-employee-trainings.entity';
import { HrmEmployeePerformance } from './hrm-employee-performance.entity';
import { HrmEmployeeDocuments } from './hrm-employee-documents.entity';

@Entity('hr_employees')
export class HrmEmployees {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  employee_code: string;

  @Column({ length: 100 })
  first_name: string;

  @Column({ length: 100, nullable: true })
  last_name: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @ManyToOne(() => HrmBranches, branch => branch.employees, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch: HrmBranches;

  @ManyToOne(() => HrmDepartments, department => department.employees, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: HrmDepartments;

  @ManyToOne(() => HrmDesignations, designation => designation.employees, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'designation_id' })
  designation: HrmDesignations;

  @Column({ type: 'date', nullable: true })
  date_of_joining: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: string;

  @Column({ length: 20, nullable: true })
  gender: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  state: string;

  @Column({ length: 100, nullable: true })
  country: string;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => HrmAwards, award => award.employee)
  awards: HrmAwards[];

  @OneToMany(() => HrmPromotions, promotion => promotion.employee)
  promotions: HrmPromotions[];

  @OneToMany(() => HrmResignations, resignation => resignation.employee)
  resignations: HrmResignations[];

  @OneToMany(() => HrmTerminations, termination => termination.employee)
  terminations: HrmTerminations[];

  @OneToMany(() => HrmWarnings, warning => warning.employee)
  warnings: HrmWarnings[];

  @OneToMany(() => HrmTrips, trip => trip.employee)
  trips: HrmTrips[];

  @OneToMany(() => HrmComplaints, complaint => complaint.employee)
  complaints: HrmComplaints[];

  @OneToMany(() => HrmTransfers, transfer => transfer.employee)
  transfers: HrmTransfers[];

  @OneToMany(() => HrmEmployeeTrainings, et => et.employee)
  employee_trainings: HrmEmployeeTrainings[];

  @OneToMany(() => HrmEmployeePerformance, ep => ep.employee)
  employee_performance: HrmEmployeePerformance[];

  @OneToMany(() => HrmEmployeeDocuments, ed => ed.employee)
  employee_documents: HrmEmployeeDocuments[];
}

