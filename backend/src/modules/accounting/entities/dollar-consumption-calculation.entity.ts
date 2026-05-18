import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('dollar_consumption_calculations')
export class DollarConsumptionCalculation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 160 })
  title!: string;

  @Column({ name: 'calculation_date', type: 'date' })
  calculationDate!: string;

  @Column({ name: 'vendor_name', type: 'varchar', length: 160, nullable: true })
  vendorName!: string | null;

  @Column({ name: 'reference_no', type: 'varchar', length: 120, nullable: true })
  referenceNo!: string | null;

  @Column({ name: 'usd_amount', type: 'decimal', precision: 15, scale: 4, default: 0 })
  usdAmount!: number;

  @Column({ name: 'exchange_rate', type: 'decimal', precision: 15, scale: 4, default: 0 })
  exchangeRate!: number;

  @Column({ name: 'bdt_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  bdtAmount!: number;

  @Column({ name: 'bank_charge', type: 'decimal', precision: 15, scale: 2, default: 0 })
  bankCharge!: number;

  @Column({ name: 'vat_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  vatAmount!: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ name: 'other_cost', type: 'decimal', precision: 15, scale: 2, default: 0 })
  otherCost!: number;

  @Column({ name: 'total_bdt', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalBdt!: number;

  @Column({ name: 'effective_rate', type: 'decimal', precision: 15, scale: 4, default: 0 })
  effectiveRate!: number;

  @Column({ name: 'line_items', type: 'jsonb', default: () => "'[]'::jsonb" })
  lineItems!: Array<{
    description?: string;
    usdAmount?: number;
    exchangeRate?: number;
    bdtAmount?: number;
    bankCharge?: number;
    vatAmount?: number;
    taxAmount?: number;
    otherCost?: number;
    totalBdt?: number;
  }>;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
