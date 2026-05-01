import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('packaging_configs')
export class PackagingConfig {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  source_product_id!: number;

  @Column({ nullable: true })
  source_variant_key!: string;

  @Column({ type: 'numeric', precision: 10, scale: 3, default: 1 })
  source_qty!: number;

  @Column()
  output_product_id!: number;

  @Column({ nullable: true })
  output_variant_key!: string;

  @Column({ type: 'int' })
  output_qty!: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  waste_percentage!: number;

  @Column({ nullable: true })
  description!: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ nullable: true })
  created_by!: number;

  @CreateDateColumn()
  created_at!: Date;
}
