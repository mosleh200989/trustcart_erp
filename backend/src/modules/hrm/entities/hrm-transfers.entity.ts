import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { HrmEmployees } from './hrm-employees.entity';
import { HrmBranches } from './hrm-branches.entity';

@Entity('hr_transfers')
export class HrmTransfers {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmEmployees, employee => employee.transfers, { nullable: true, onDelete: 'SET NULL' })
  employee: HrmEmployees;

  @ManyToOne(() => HrmBranches, branch => branch.transfers_from, { nullable: true, onDelete: 'SET NULL' })
  from_branch: HrmBranches;

  @ManyToOne(() => HrmBranches, branch => branch.transfers_to, { nullable: true, onDelete: 'SET NULL' })
  to_branch: HrmBranches;

  @Column({ type: 'date', nullable: true })
  transfer_date: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ length: 50, default: 'Pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
