import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { HrmEmployees } from './hrm-employees.entity';
import { HrmDocumentTypes } from './hrm-document-types.entity';

@Entity('hr_employee_documents')
export class HrmEmployeeDocuments {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmEmployees, employee => employee.employee_documents, { nullable: true, onDelete: 'SET NULL' })
  employee: HrmEmployees;

  @ManyToOne(() => HrmDocumentTypes, type => type.employee_documents, { nullable: true, onDelete: 'SET NULL' })
  document_type: HrmDocumentTypes;

  @Column({ type: 'text', nullable: true })
  document_url: string;

  @Column({ type: 'date', nullable: true })
  issue_date: string;

  @Column({ type: 'date', nullable: true })
  expiry_date: string;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
