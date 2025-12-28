import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('team_b_data')
export class TeamBData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', unique: true })
  customerId: number;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ name: 'marriage_day', type: 'date', nullable: true })
  marriageDay: Date;

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
