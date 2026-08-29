import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

/**
 * Comments are never destroyed. An edit inserts a NEW row whose
 * `supersedesId` points at the version it replaces; a delete only stamps
 * `deletedAt`/`deletedBy`. The timeline can always show what was said.
 */
@Entity('issue_comments')
export class IssueComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'issue_id' })
  issueId: number;

  @Column({ name: 'author_id' })
  authorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'supersedes_id', type: 'int', nullable: true })
  supersedesId?: number | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @Column({ name: 'deleted_by', type: 'int', nullable: true })
  deletedBy?: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
