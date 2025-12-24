import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum EngagementType {
  CALL = 'call',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  WEBSITE_VISIT = 'website_visit',
  ORDER = 'order'
}

export enum EngagementStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  RESPONDED = 'responded',
  IGNORED = 'ignored',
  FAILED = 'failed',
  COMPLETED = 'completed'
}

@Entity('customer_engagement_history')
export class EngagementHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  customer_id!: string;

  @Column({
    type: 'varchar',
    length: 50
  })
  engagement_type!: EngagementType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  channel!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true
  })
  status!: EngagementStatus;

  @Column({ type: 'text', nullable: true })
  message_content!: string;

  @Column({ nullable: true })
  agent_id!: number;

  @Column({ nullable: true })
  campaign_id!: number;

  @Column({ default: false })
  response_received!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @CreateDateColumn()
  created_at!: Date;
}
