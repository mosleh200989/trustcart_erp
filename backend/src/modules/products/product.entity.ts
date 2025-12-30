import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid', nullable: true })
  uuid!: string;

  @Column({ nullable: false })
  sku!: string;

  @Column({ nullable: true })
  product_code!: string;

  @Column({ nullable: false, unique: true, length: 255 })
  slug!: string;

  @Column({ nullable: false })
  name_en!: string;

  @Column({ nullable: true })
  name_bn!: string;

  @Column({ nullable: true })
  description_en!: string;

  @Column({ nullable: true })
  description_bn!: string;

  @Column({ nullable: false })
  category_id!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: false })
  base_price!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  wholesale_price!: number;

  @Column({ nullable: true })
  brand!: string;

  @Column({ nullable: true })
  unit_of_measure!: string;

  @Column({ nullable: true })
  image_url!: string;

  @Column({ type: 'int', nullable: true })
  stock_quantity!: number;

  @Column({ type: 'int', nullable: true })
  display_position!: number;

  @Column({ type: 'jsonb', nullable: true, name: 'additional_info', default: () => "'{}'::jsonb" })
  additional_info!: Record<string, any>;

  @Column({ nullable: true, default: 'active' })
  status!: string;

  @Column({ nullable: true, length: 20, name: 'discount_type' })
  discountType!: string; // 'percentage' or 'flat'

  @Column('decimal', { precision: 10, scale: 2, nullable: true, name: 'discount_value' })
  discountValue!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true, name: 'sale_price' })
  salePrice!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'discount_start_date' })
  discountStartDate!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'discount_end_date' })
  discountEndDate!: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
