import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CustomerSegment } from './customer-segment.entity';
import { Customer } from '../../customers/customer.entity';

@Entity('segment_members')
export class SegmentMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'segment_id' })
  segmentId: number;

  @ManyToOne(() => CustomerSegment, segment => segment.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'segment_id' })
  segment: CustomerSegment;

  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
