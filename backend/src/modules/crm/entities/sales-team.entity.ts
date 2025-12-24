import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('sales_teams')
export class SalesTeam {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code!: string | null;

  @Column({ name: 'team_leader_id', type: 'integer', nullable: true })
  teamLeaderId!: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'team_leader_id', referencedColumnName: 'id' })
  teamLeader!: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
