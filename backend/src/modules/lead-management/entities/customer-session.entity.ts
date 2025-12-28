import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('customer_sessions')
export class CustomerSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number;

  @Column({ name: 'session_id', unique: true })
  sessionId: string;

  @Column({ name: 'source_details', nullable: true })
  sourceDetails: string;

  @Column({ name: 'campaign_id', nullable: true })
  campaignId: string;

  @Column({ name: 'utm_source', nullable: true })
  utmSource: string;

  @Column({ name: 'utm_medium', nullable: true })
  utmMedium: string;

  @Column({ name: 'utm_campaign', nullable: true })
  utmCampaign: string;

  @Column({ name: 'utm_term', nullable: true })
  utmTerm: string;

  @Column({ name: 'utm_content', nullable: true })
  utmContent: string;

  @Column({ name: 'device_type', nullable: true })
  deviceType: string;

  @Column({ nullable: true })
  browser: string;

  @Column({ nullable: true })
  os: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  country: string;

  @Column({ name: 'session_start', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  sessionStart: Date;

  @Column({ name: 'session_end', type: 'timestamp', nullable: true })
  sessionEnd: Date;

  @Column({ name: 'total_session_time', nullable: true })
  totalSessionTime: number;

  @Column({ name: 'pages_visited', default: 0 })
  pagesVisited: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
