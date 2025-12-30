import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../../customers/customer.entity';
import { User } from '../../users/user.entity';
import { Deal } from './deal.entity';
import { QuoteTemplate } from './quote-template.entity';

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'quote_number', unique: true })
  quoteNumber: string;

  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'deal_id', nullable: true })
  dealId: number;

  @ManyToOne(() => Deal)
  @JoinColumn({ name: 'deal_id' })
  deal: Deal;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  // Phase 1: Quote Template
  @Column({ name: 'template_id', nullable: true })
  templateId: number;

  @ManyToOne(() => QuoteTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: QuoteTemplate;

  // Phase 1: Quote Versioning
  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ name: 'parent_quote_id', nullable: true })
  parentQuoteId: number;

  @ManyToOne(() => Quote, { nullable: true })
  @JoinColumn({ name: 'parent_quote_id' })
  parentQuote: Quote;

  @Column({ name: 'valid_until', type: 'date' })
  validUntil: Date;

  @Column({ type: 'jsonb' })
  lineItems: any[];

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ name: 'payment_terms', nullable: true })
  paymentTerms: string;

  @Column({ name: 'delivery_terms', nullable: true })
  deliveryTerms: string;

  @Column({ default: 'draft' })
  status: string; // 'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ name: 'viewed_at', type: 'timestamp', nullable: true })
  viewedAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'pdf_url', nullable: true })
  pdfUrl: string;

  // Phase 1: Approval Workflow
  @Column({ name: 'approval_status', default: 'pending' })
  approvalStatus: string; // 'pending', 'approved', 'rejected'

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
