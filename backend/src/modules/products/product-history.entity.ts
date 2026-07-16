import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('product_history')
@Index(['productId'])
@Index(['action'])
@Index(['entityType'])
@Index(['performedBy'])
@Index(['createdAt'])
export class ProductHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_id', type: 'int', nullable: true })
  productId!: number | null;

  @Column({ name: 'product_name', type: 'varchar', length: 255, nullable: true })
  productName!: string | null;

  @Column({ name: 'product_sku', type: 'varchar', length: 255, nullable: true })
  productSku!: string | null;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true })
  entityId!: string | null;

  @Column({ type: 'varchar', length: 80 })
  action!: string;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ name: 'changed_fields', type: 'jsonb', nullable: true })
  changedFields!: string[] | null;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues!: Record<string, any> | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ name: 'performed_by', type: 'int', nullable: true })
  performedBy!: number | null;

  @Column({ name: 'performed_by_name', type: 'varchar', length: 255, nullable: true })
  performedByName!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 100, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
