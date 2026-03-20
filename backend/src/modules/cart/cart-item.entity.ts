import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('cart_items')
@Index('idx_cart_session_id', ['sessionId'])
@Index('idx_cart_customer_id', ['customerId'])
export class CartItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'session_id', type: 'varchar', length: 64 })
  sessionId!: string;

  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId!: number | null;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @Column({ name: 'product_name', type: 'varchar', length: 500, nullable: true })
  productName!: string | null;

  @Column({ name: 'variant', type: 'varchar', length: 255, nullable: true })
  variant!: string | null;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'category', type: 'varchar', length: 255, nullable: true })
  category!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
