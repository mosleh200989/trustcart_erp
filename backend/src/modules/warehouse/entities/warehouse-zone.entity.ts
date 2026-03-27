import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { WarehouseLocation } from './warehouse-location.entity';

@Entity('warehouse_zones')
export class WarehouseZone {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  warehouse_id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 30, default: 'ambient' })
  type!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperature_min!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperature_max!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  humidity_min!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  humidity_max!: number;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @ManyToOne(() => Warehouse, wh => wh.zones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: Warehouse;

  @OneToMany(() => WarehouseLocation, loc => loc.zone)
  locations!: WarehouseLocation[];
}
