import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('issue_attachments')
export class IssueAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'issue_id' })
  issueId: number;

  @Column({ name: 'comment_id', type: 'int', nullable: true })
  commentId?: number | null;

  /** image | voice */
  @Column({ length: 10 })
  kind: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255, nullable: true })
  originalName?: string | null;

  @Column({ length: 100 })
  mime: string;

  @Column({ name: 'size_bytes' })
  sizeBytes: number;

  @Column({ name: 'duration_secs', type: 'int', nullable: true })
  durationSecs?: number | null;

  @Column({ name: 'uploaded_by' })
  uploadedBy: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
