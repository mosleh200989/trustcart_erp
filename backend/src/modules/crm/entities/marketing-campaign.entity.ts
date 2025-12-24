import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CampaignType {
  UPSELL = 'upsell',
  REACTIVATION = 'reactivation',
  RETENTION = 'retention',
  PROMOTION = 'promotion',
  FEEDBACK = 'feedback'
}

export enum CampaignChannel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  ALL = 'all'
}

@Entity('marketing_campaigns')
export class MarketingCampaign {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  campaign_name!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true
  })
  campaign_type!: CampaignType;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true
  })
  channel!: CampaignChannel;

  @Column({ type: 'varchar', length: 100, nullable: true })
  target_segment!: string;

  @Column({ type: 'text', nullable: true })
  message_template!: string;

  @Column({ type: 'jsonb', nullable: true })
  trigger_condition!: any;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: 'time', nullable: true })
  send_time!: string;

  @Column({ default: 0 })
  success_count!: number;

  @Column({ default: 0 })
  failure_count!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversion_rate!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
