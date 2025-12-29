import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';
import { SalesTeam } from './sales-team.entity';

@Entity('sales_quotas')
export class SalesQuota {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'team_id', nullable: true })
  teamId: number;

  @ManyToOne(() => SalesTeam, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team: SalesTeam;

  @Column({ name: 'quota_period', length: 50 })
  quotaPeriod: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'quota_amount', type: 'decimal', precision: 15, scale: 2 })
  quotaAmount: number;

  @Column({ name: 'actual_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  actualAmount: number;

  @Column({ name: 'attainment_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  attainmentPercentage: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
