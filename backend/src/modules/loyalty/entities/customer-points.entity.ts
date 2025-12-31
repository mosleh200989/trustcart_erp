import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('customer_points')
export class CustomerPoints {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: number;

  @Column({ name: 'customer_uuid', type: 'uuid', nullable: true, select: false })
  customerUuid?: string;

  @Column({ name: 'active_points', type: 'int', default: 0 })
  activePoints: number;

  @Column({ name: 'lifetime_earned', type: 'int', default: 0 })
  lifetimeEarned: number;

  @Column({ name: 'lifetime_redeemed', type: 'int', default: 0 })
  lifetimeRedeemed: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
