import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { HrmEmployeeDocuments } from './hrm-employee-documents.entity';

@Entity('hr_document_types')
export class HrmDocumentTypes {
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

  @OneToMany(() => HrmEmployeeDocuments, doc => doc.document_type)
  employee_documents: HrmEmployeeDocuments[];
}
