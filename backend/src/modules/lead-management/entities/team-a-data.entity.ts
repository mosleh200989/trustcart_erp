import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('team_a_data')
export class TeamAData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', unique: true })
  customerId: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  profession: string;

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
