import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('courier_configurations')
export class CourierConfiguration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyname?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'api_key' })
  apiKey?: string | null;

  @Column({ type: 'text', nullable: true })
  token?: string | null;

  @Column({ type: 'text', nullable: true, name: 'refresh_token' })
  refreshToken?: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
