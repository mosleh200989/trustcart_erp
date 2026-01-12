import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { CustomerTag } from './customer-tag.entity';

@Entity('customer_tag_assignments')
export class CustomerTagAssignment {
  @PrimaryColumn({ type: 'uuid', name: 'tag_id' })
  tagId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'customer_id' })
  customerId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => CustomerTag, (t) => t.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag!: CustomerTag;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;
}
