import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('demand_forecasts')
export class DemandForecast {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  product_id!: number;

  @Column({ nullable: true })
  warehouse_id!: number;

  @Column({ type: 'int', default: 3 })
  forecast_period!: number; // 3, 6, or 12 months

  @Column({ type: 'int', default: 0 })
  moving_average_qty!: number;

  @Column({ type: 'int', default: 0 })
  historical_std_dev!: number;

  @Column({ type: 'int', default: 0 })
  suggested_reorder_qty!: number;

  @Column({ length: 20, default: 'normal' })
  velocity!: string; // fast, normal, slow, dead

  @Column({ type: 'date' })
  forecasted_date!: string;

  @Column({ type: 'date' })
  effective_from!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
