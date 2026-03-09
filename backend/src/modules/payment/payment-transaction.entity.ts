import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'int' })
  orderId!: number;

  @Column({ name: 'transaction_id', type: 'varchar', length: 255 })
  transactionId!: string;

  @Column({ type: 'varchar', length: 50, default: 'sslcommerz' })
  gateway!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'BDT' })
  currency!: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: string;

  // SSLCommerz specific fields
  @Column({ name: 'bank_tran_id', type: 'varchar', length: 255, nullable: true })
  bankTranId!: string | null;

  @Column({ name: 'card_type', type: 'varchar', length: 100, nullable: true })
  cardType!: string | null;

  @Column({ name: 'card_no', type: 'varchar', length: 100, nullable: true })
  cardNo!: string | null;

  @Column({ name: 'card_issuer', type: 'varchar', length: 255, nullable: true })
  cardIssuer!: string | null;

  @Column({ name: 'card_brand', type: 'varchar', length: 50, nullable: true })
  cardBrand!: string | null;

  @Column({ name: 'card_issuer_country', type: 'varchar', length: 100, nullable: true })
  cardIssuerCountry!: string | null;

  @Column({ name: 'store_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  storeAmount!: number | null;

  @Column({ name: 'val_id', type: 'varchar', length: 255, nullable: true })
  valId!: string | null;

  @Column({ name: 'validated_at', type: 'timestamp', nullable: true })
  validatedAt!: Date | null;

  @Column({ name: 'validation_status', type: 'varchar', length: 50, nullable: true })
  validationStatus!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse!: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
