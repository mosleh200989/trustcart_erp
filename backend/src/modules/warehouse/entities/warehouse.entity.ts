import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { WarehouseZone } from './warehouse-zone.entity';
import { WarehouseLocation } from './warehouse-location.entity';

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 20, unique: true })
  code!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ length: 30, default: 'main' })
  type!: string;

  @Column({ type: 'text', nullable: true })
  address!: string;

  @Column({ length: 100, nullable: true })
  city!: string;

  @Column({ length: 100, nullable: true })
  district!: string;

  @Column({ length: 50, default: 'Bangladesh' })
  country!: string;

  @Column({ length: 30, nullable: true })
  phone!: string;

  @Column({ length: 255, nullable: true })
  email!: string;

  @Column({ nullable: true })
  manager_id!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_area_sqft!: number;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ default: false })
  is_default!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  operating_hours!: any;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @OneToMany(() => WarehouseZone, zone => zone.warehouse)
  zones!: WarehouseZone[];

  @OneToMany(() => WarehouseLocation, loc => loc.warehouse)
  locations!: WarehouseLocation[];
}
