import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('team_c_data')
export class TeamCData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', unique: true })
  customerId: number;

  @Column({ name: 'product_interest', type: 'text', array: true, nullable: true })
  productInterest: string[];

  @Column({ name: 'order_product_details', type: 'jsonb', nullable: true })
  orderProductDetails: any;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'collected_by_id', nullable: true })
  collectedById: number;

  @Column({ name: 'collected_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  collectedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
