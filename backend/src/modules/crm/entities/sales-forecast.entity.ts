import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('sales_forecasts')
export class SalesForecast {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'forecast_period', length: 50 })
  forecastPeriod: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'forecast_type', length: 50 })
  forecastType: 'weighted_pipeline' | 'historical_trend' | 'quota_based' | 'best_case' | 'most_likely' | 'worst_case';

  @Column({ name: 'forecast_amount', type: 'decimal', precision: 15, scale: 2 })
  forecastAmount: number;

  @Column({ name: 'actual_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  actualAmount: number;

  @Column({ name: 'accuracy_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  accuracyPercentage: number;

  @Column({ name: 'deal_count', type: 'integer', nullable: true })
  dealCount: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: any;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
