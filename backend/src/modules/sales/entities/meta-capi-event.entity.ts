import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('meta_capi_events')
export class MetaCapiEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'int' })
  orderId!: number;

  @Column({ name: 'event_name', type: 'varchar', length: 80 })
  eventName!: string;

  @Column({ name: 'status_trigger', type: 'varchar', length: 80 })
  statusTrigger!: string;

  @Column({ name: 'event_id', type: 'varchar', length: 120 })
  eventId!: string;

  @Column({ name: 'pixel_id', type: 'varchar', length: 120, nullable: true })
  pixelId!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status!: 'pending' | 'sent' | 'failed' | 'skipped';

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount!: number;

  @Column({ name: 'request_payload', type: 'jsonb', nullable: true })
  requestPayload!: any;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload!: any;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
