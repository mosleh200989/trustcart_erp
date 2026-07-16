import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type PresenceUserStatus = 'active' | 'inactive' | 'backup';

@Entity('presence_user_profiles')
@Index('idx_presence_user_profiles_user', ['userId'], { unique: true })
@Index('idx_presence_user_profiles_status', ['status'])
export class PresenceUserProfile {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', unique: true })
  userId!: number;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status!: PresenceUserStatus;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
