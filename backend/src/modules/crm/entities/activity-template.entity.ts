import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('activity_templates')
export class ActivityTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'activity_type', length: 50 })
  activityType: 'call' | 'email' | 'meeting' | 'note' | 'sms' | 'whatsapp';

  @Column({ name: 'subject_template', type: 'text', nullable: true })
  subjectTemplate: string;

  @Column({ name: 'description_template', type: 'text', nullable: true })
  descriptionTemplate: string;

  @Column({ type: 'integer', nullable: true })
  duration: number;

  @Column({ name: 'is_shared', type: 'boolean', default: false })
  isShared: boolean;

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
