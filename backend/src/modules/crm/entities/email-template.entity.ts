import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 500 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'html_body', type: 'text', nullable: true })
  htmlBody: string;

  @Column({ length: 50, nullable: true })
  category: 'welcome' | 'follow_up' | 'quote' | 'meeting' | 'newsletter' | 'promotional' | 'other';

  @Column({ type: 'jsonb', default: [] })
  variables: string[];

  @Column({ name: 'is_shared', type: 'boolean', default: false })
  isShared: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  usageCount: number;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
