import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('monthly_grocery_lists')
export class MonthlyGroceryList {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ length: 255, default: 'Monthly Grocery', name: 'list_name' })
  listName: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_subscription' })
  isSubscription: boolean;

  @Column({ nullable: true, name: 'subscription_day' })
  subscriptionDay: number;

  @Column({ type: 'date', nullable: true, name: 'next_order_date' })
  nextOrderDate: Date;

  @Column({ default: false, name: 'auto_reorder' })
  autoReorder: boolean;

  @Column({ default: 0, name: 'total_orders_placed' })
  totalOrdersPlaced: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_ordered_at' })
  lastOrderedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
