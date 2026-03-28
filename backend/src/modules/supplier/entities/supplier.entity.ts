import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { SupplierProduct } from './supplier-product.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 20, unique: true })
  code!: string;

  @Column({ length: 200 })
  company_name!: string;

  @Column({ length: 200, nullable: true })
  company_name_bn!: string;

  @Column({ length: 150, nullable: true })
  contact_person!: string;

  @Column({ length: 255, nullable: true })
  email!: string;

  @Column({ length: 30, nullable: true })
  phone!: string;

  @Column({ length: 30, nullable: true })
  alt_phone!: string;

  @Column({ type: 'text', nullable: true })
  address!: string;

  @Column({ length: 100, nullable: true })
  city!: string;

  @Column({ length: 100, nullable: true })
  district!: string;

  @Column({ length: 50, default: 'Bangladesh' })
  country!: string;

  @Column({ length: 50, nullable: true })
  tax_id!: string;

  @Column({ length: 50, nullable: true })
  trade_license!: string;

  @Column({ length: 100, nullable: true })
  bank_name!: string;

  @Column({ length: 50, nullable: true })
  bank_account_number!: string;

  @Column({ length: 100, nullable: true })
  bank_branch!: string;

  @Column({ length: 50, default: 'net_30' })
  payment_terms!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  credit_limit!: number;

  @Column({ type: 'int', default: 3 })
  lead_time_days!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating!: number;

  @Column({ type: 'int', default: 0 })
  total_orders!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_amount!: number;

  @Column({ length: 50, nullable: true })
  category!: string;

  @Column({ type: 'jsonb', default: '[]' })
  certifications!: string[];

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ length: 20, default: 'active' })
  status!: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ nullable: true })
  user_id!: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @OneToMany(() => SupplierProduct, sp => sp.supplier)
  products!: SupplierProduct[];
}
