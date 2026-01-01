import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BeforeInsert } from 'typeorm';

@Entity('sales_orders')
export class SalesOrder {
  // Matches existing sales_orders table (id serial/int primary key)
  @PrimaryGeneratedColumn()
  id!: number;

  // sales_order_number in DB
  @Column({ name: 'sales_order_number', type: 'varchar', length: 100 })
  salesOrderNumber!: string;

  // customer_id in DB
  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId!: number | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 150, nullable: true })
  customerName!: string | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 255, nullable: true })
  customerEmail!: string | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 30, nullable: true })
  customerPhone!: string | null;

  // order_date in DB (defaults to NOW() in schema)
  @Column({ name: 'order_date', type: 'timestamp', nullable: true })
  orderDate!: Date;

  @Column({ type: 'varchar' })
  status!: string;

  // total_amount in DB
  @Column('decimal', { name: 'total_amount', precision: 12, scale: 2 })
  totalAmount!: number;

  // created_by in DB
  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null;

  // notes in DB (used for shipping address and other info)
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // New fields for enhanced order management
  @Column({ name: 'shipping_address', type: 'text', nullable: true })
  shippingAddress: string;

  @Column({ name: 'courier_notes', type: 'text', nullable: true })
  courierNotes: string;

  @Column({ name: 'rider_instructions', type: 'text', nullable: true })
  riderInstructions: string;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes: string;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason: string;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: number;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ name: 'cancelled_by', nullable: true })
  cancelledBy: number;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date;

  // Order Source Tracking
  @Column({ name: 'user_ip', type: 'varchar', length: 50, nullable: true })
  userIp: string;

  @Column({ name: 'geo_location', type: 'jsonb', nullable: true })
  geoLocation: any;

  @Column({ name: 'browser_info', type: 'varchar', length: 255, nullable: true })
  browserInfo: string;

  @Column({ name: 'device_type', type: 'varchar', length: 50, nullable: true })
  deviceType: string;

  @Column({ name: 'operating_system', type: 'varchar', length: 100, nullable: true })
  operatingSystem: string;

  @Column({ name: 'traffic_source', type: 'varchar', length: 100, nullable: true })
  trafficSource: string;

  @Column({ name: 'referrer_url', type: 'text', nullable: true })
  referrerUrl: string;

  @Column({ name: 'utm_source', type: 'varchar', length: 100, nullable: true })
  utmSource: string;

  @Column({ name: 'utm_medium', type: 'varchar', length: 100, nullable: true })
  utmMedium: string;

  @Column({ name: 'utm_campaign', type: 'varchar', length: 100, nullable: true })
  utmCampaign: string;

  // Courier Integration
  @Column({ name: 'courier_company', type: 'varchar', length: 100, nullable: true })
  courierCompany: string;

  @Column({ name: 'courier_order_id', type: 'varchar', length: 100, nullable: true })
  courierOrderId: string;

  @Column({ name: 'tracking_id', type: 'varchar', length: 100, nullable: true })
  trackingId: string;

  @Column({ name: 'courier_status', type: 'varchar', length: 50, nullable: true })
  courierStatus: string;

  @Column({ name: 'thank_you_offer_accepted', type: 'boolean', default: false })
  thankYouOfferAccepted: boolean;

  @Column({ name: 'shipped_at', type: 'timestamp', nullable: true })
  shippedAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date;

  // created_at in DB
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @BeforeInsert()
  generateOrderNumber() {
    if (!this.salesOrderNumber) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.salesOrderNumber = `SO-${timestamp}-${random}`;
    }
    if (!this.orderDate) {
      this.orderDate = new Date();
    }
  }
}
