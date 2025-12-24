import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { SalesOrder } from '../sales-order.entity';

@Entity('order_activity_logs')
export class OrderActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'action_type', type: 'varchar', length: 50 })
  actionType: string;

  @Column({ name: 'action_description', type: 'text' })
  actionDescription: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: any;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: any;

  @Column({ name: 'performed_by', nullable: true })
  performedBy: number;

  @Column({ name: 'performed_by_name', type: 'varchar', length: 255, nullable: true })
  performedByName: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => SalesOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: SalesOrder;
}
