import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../../customers/customer.entity';
import { User } from '../../users/user.entity';

@Entity('email_tracking')
export class EmailTracking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'sent_by' })
  sentBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sent_by' })
  sender: User;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'to_address' })
  toAddress: string;

  @Column({ name: 'cc_addresses', type: 'simple-array', nullable: true })
  ccAddresses: string[];

  @Column({ name: 'bcc_addresses', type: 'simple-array', nullable: true })
  bccAddresses: string[];

  @Column({ name: 'sent_at', type: 'timestamp' })
  sentAt: Date;

  @Column({ default: false })
  opened: boolean;

  @Column({ name: 'open_count', default: 0 })
  openCount: number;

  @Column({ name: 'first_opened_at', type: 'timestamp', nullable: true })
  firstOpenedAt: Date;

  @Column({ name: 'last_opened_at', type: 'timestamp', nullable: true })
  lastOpenedAt: Date;

  @Column({ default: false })
  clicked: boolean;

  @Column({ name: 'clicked_links', type: 'jsonb', nullable: true })
  clickedLinks: string[];

  @Column({ default: false })
  replied: boolean;

  @Column({ name: 'replied_at', type: 'timestamp', nullable: true })
  repliedAt: Date;

  @Column({ default: false })
  bounced: boolean;

  @Column({ name: 'template_used', nullable: true })
  templateUsed: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
