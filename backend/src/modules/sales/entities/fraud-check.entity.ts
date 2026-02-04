import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalesOrder } from '../sales-order.entity';
import { User } from '../../users/user.entity';

export interface CourierSummary {
  'Total Parcels'?: number;
  'Delivered Parcels'?: number;
  'Canceled Parcels'?: number;
  'Total Delivery'?: number;
  'Successful Delivery'?: number;
  'Canceled Delivery'?: number;
}

export interface HoorinSummaries {
  Steadfast?: CourierSummary;
  RedX?: CourierSummary;
  Pathao?: CourierSummary;
  Paperfly?: CourierSummary;
  [key: string]: CourierSummary | undefined;
}

export interface HoorinApiResponse {
  Summaries: HoorinSummaries;
  Details?: any[];
}

export interface HoorinSheetResponse {
  TotalParcels?: number;
  TotalDelivered?: number;
  TotalCanceled?: number;
  CancellationRate?: number;
  [key: string]: any;
}

@Entity('fraud_checks')
export class FraudCheck {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id', nullable: true })
  orderId: number;

  @ManyToOne(() => SalesOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: SalesOrder;

  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column({ name: 'provider', type: 'varchar', length: 50 })
  provider: string; // 'hoorin'

  @Column({ name: 'check_type', type: 'varchar', length: 50 })
  checkType: string; // 'courier_summary' or 'total_summary'

  @Column({ name: 'response', type: 'jsonb', nullable: true })
  response: HoorinApiResponse | HoorinSheetResponse | null;

  @Column({ name: 'status', type: 'varchar', length: 50 })
  status: string; // 'success', 'error', 'pending'

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  // Calculated fraud risk based on response
  @Column({ name: 'risk_level', type: 'varchar', length: 20, nullable: true })
  riskLevel: string | null; // 'low', 'medium', 'high'

  @Column({ name: 'cancellation_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  cancellationRate: number | null;

  @Column({ name: 'total_parcels', type: 'int', nullable: true })
  totalParcels: number | null;

  @Column({ name: 'total_delivered', type: 'int', nullable: true })
  totalDelivered: number | null;

  @Column({ name: 'total_canceled', type: 'int', nullable: true })
  totalCanceled: number | null;

  @Column({ name: 'checked_by', nullable: true })
  checkedBy: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'checked_by' })
  checkedByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
