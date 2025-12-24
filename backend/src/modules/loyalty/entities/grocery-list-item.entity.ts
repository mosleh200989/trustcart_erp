import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('grocery_list_items')
export class GroceryListItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'list_id' })
  listId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'last_purchase_price' })
  lastPurchasePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'locked_price' })
  lockedPrice: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
