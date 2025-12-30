import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/user.entity';
import { SegmentMember } from './segment-member.entity';

@Entity('customer_segments')
export class CustomerSegment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'segment_type', length: 50, default: 'manual' })
  segmentType: 'manual' | 'dynamic';

  @Column({ type: 'jsonb', default: {} })
  criteria: any;

  @Column({ length: 50, default: '#3B82F6' })
  color: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'customer_count', type: 'integer', default: 0 })
  customerCount: number;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => SegmentMember, member => member.segment)
  members: SegmentMember[];

  @Column({ name: 'last_calculated_at', type: 'timestamp', nullable: true })
  lastCalculatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
