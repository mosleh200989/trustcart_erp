import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('stock_reservations')
export class StockReservation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  product_id!: number;

  @Column({ length: 100, nullable: true })
  variant_key!: string;

  @Column()
  warehouse_id!: number;

  @Column({ nullable: true })
  batch_id!: number;

  @Column()
  sales_order_id!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ length: 20, default: 'active' })
  status!: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  reserved_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  fulfilled_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  released_at!: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
