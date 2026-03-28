import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { WarehouseZone } from './warehouse-zone.entity';

@Entity('warehouse_locations')
export class WarehouseLocation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  warehouse_id!: number;

  @Column({ nullable: true })
  zone_id!: number;

  @Column({ length: 30 })
  code!: string;

  @Column({ length: 10, nullable: true })
  aisle!: string;

  @Column({ length: 10, nullable: true })
  rack!: string;

  @Column({ length: 10, nullable: true })
  shelf!: string;

  @Column({ length: 10, nullable: true })
  bin!: string;

  @Column({ length: 30, default: 'storage' })
  location_type!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_weight_kg!: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  max_volume_m3!: number;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ length: 50, nullable: true, unique: true })
  barcode!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @ManyToOne(() => Warehouse, wh => wh.locations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: Warehouse;

  @ManyToOne(() => WarehouseZone, zone => zone.locations, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'zone_id' })
  zone!: WarehouseZone;
}
