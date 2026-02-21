import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { SalesOrder } from '../sales-order.entity';

@Entity('courier_tracking_history')
export class CourierTrackingHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'courier_company', type: 'varchar', length: 100 })
  courierCompany: string;

  @Column({ name: 'tracking_id', type: 'varchar', length: 100 })
  trackingId: string;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  /** Steadfast notification_type: 'delivery_status' | 'tracking_update' */
  @Column({ name: 'notification_type', type: 'varchar', length: 50, nullable: true })
  notificationType: string | null;

  /** Steadfast tracking_message from webhook */
  @Column({ name: 'tracking_message', type: 'text', nullable: true })
  trackingMessage: string | null;

  /** COD amount reported by Steadfast */
  @Column({ name: 'cod_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  codAmount: number | null;

  /** Delivery charge reported by Steadfast */
  @Column({ name: 'delivery_charge', type: 'decimal', precision: 12, scale: 2, nullable: true })
  deliveryCharge: number | null;

  /** Steadfast consignment_id for cross-referencing */
  @Column({ name: 'consignment_id', type: 'varchar', length: 50, nullable: true })
  consignmentId: string | null;

  /** Raw webhook JSON payload for debugging / audit */
  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload: any;

  @CreateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => SalesOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: SalesOrder;
}
