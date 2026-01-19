import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('admin_menu_items')
export class AdminMenuItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  // String key mapped to an icon on the frontend (e.g. FaCog)
  @Column({ type: 'varchar', length: 80, nullable: true })
  icon?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  path?: string | null;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  // Permissions required to see this item (any-of)
  @Column({ type: 'text', array: true, name: 'required_permissions', default: () => `'{}'` })
  requiredPermissions: string[];

  @ManyToOne(() => AdminMenuItem, (x) => x.children, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent?: AdminMenuItem | null;

  @Column({ type: 'int', name: 'parent_id', nullable: true })
  parentId?: number | null;

  @OneToMany(() => AdminMenuItem, (x) => x.parent)
  children?: AdminMenuItem[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
