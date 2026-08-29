import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('issues')
export class Issue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 300 })
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ length: 30, default: 'bug' })
  category: string;

  @Column({ length: 20, default: 'normal' })
  priority: string;

  @Column({ length: 20, default: 'open' })
  status: string;

  @Column({ name: 'reporter_id' })
  reporterId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter?: User;

  @Column({ name: 'assignee_id', type: 'int', nullable: true })
  assigneeId?: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
