import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('team_assignments')
export class TeamAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'team_type' })
  teamType: string; // A, B, C, D, E

  @Column({ name: 'assigned_by_id' })
  assignedById: number; // Team leader ID

  @Column({ name: 'assigned_to_id' })
  assignedToId: number; // Team member ID

  @Column({ name: 'assigned_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @Column({ default: 'pending' })
  status: string; // pending, in_progress, completed

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
