import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', unique: true })
  userId: number;

  @Column({ name: 'team_leader_id' })
  teamLeaderId: number;

  @Column({ name: 'team_type' })
  teamType: string; // A, B, C, D, E

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'assigned_leads_count', default: 0 })
  assignedLeadsCount: number;

  @Column({ name: 'completed_leads_count', default: 0 })
  completedLeadsCount: number;

  @Column({ name: 'joined_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
