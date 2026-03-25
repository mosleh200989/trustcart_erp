import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index(['module'])
@Index(['action'])
@Index(['performed_by'])
@Index(['created_at'])
@Index(['entity_type', 'entity_id'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Which module the action belongs to, e.g. 'products', 'sales', 'customers', 'crm' */
  @Column({ type: 'varchar', length: 100 })
  module!: string;

  /** HTTP method or logical action: 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc. */
  @Column({ type: 'varchar', length: 50 })
  action!: string;

  /** The entity/resource type affected, e.g. 'Product', 'SalesOrder', 'Customer' */
  @Column({ type: 'varchar', length: 100 })
  entity_type!: string;

  /** The primary key / ID of the affected entity */
  @Column({ type: 'varchar', length: 255, nullable: true })
  entity_id!: string;

  /** Human-readable summary of what happened */
  @Column({ type: 'text' })
  description!: string;

  /** List of field names that were changed (for updates) */
  @Column({ type: 'jsonb', nullable: true })
  changed_fields!: string[] | null;

  /** Full snapshot or partial old values before the change */
  @Column({ type: 'jsonb', nullable: true })
  old_values!: Record<string, any> | null;

  /** Full snapshot or partial new values after the change */
  @Column({ type: 'jsonb', nullable: true })
  new_values!: Record<string, any> | null;

  /** User ID who performed the action */
  @Column({ nullable: true })
  performed_by!: number;

  /** User name who performed the action (denormalized for quick display) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  performed_by_name!: string;

  /** The API endpoint path, e.g. '/api/products/123' */
  @Column({ type: 'varchar', length: 500, nullable: true })
  endpoint!: string;

  /** HTTP method: GET, POST, PUT, PATCH, DELETE */
  @Column({ type: 'varchar', length: 10, nullable: true })
  http_method!: string;

  /** IP address of the request */
  @Column({ type: 'varchar', length: 100, nullable: true })
  ip_address!: string;

  /** User agent string */
  @Column({ type: 'text', nullable: true })
  user_agent!: string;

  @CreateDateColumn()
  created_at!: Date;
}
