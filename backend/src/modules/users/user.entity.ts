import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column('uuid', { default: () => 'uuid_generate_v4()' })
  uuid!: string;

  @Column({ name: 'name', type: 'varchar', length: 50 })
  name!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 50 })
  lastName!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  password!: string;

  @Column({ name: 'role_id', type: 'integer' })
  roleId!: number;

  @Column({ name: 'department_id', type: 'integer', nullable: true })
  departmentId!: number | null;

  @Column({ name: 'team_leader_id', type: 'integer', nullable: true })
  teamLeaderId!: number | null;

  @Column({ name: 'team_id', type: 'integer', nullable: true })
  teamId!: number | null;

  @Column({ name: 'agent_tier', type: 'varchar', length: 20, default: 'silver' })
  agentTier!: string;

  @Column('enum', { enum: ['active', 'inactive', 'suspended'], default: 'active', name: 'status' })
  status!: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod!: string | null;

  @Column({ name: 'bkash_number', type: 'varchar', length: 20, nullable: true })
  bkashNumber!: string | null;

  @Column({ name: 'nagad_number', type: 'varchar', length: 20, nullable: true })
  nagadNumber!: string | null;

  @Column({ name: 'rocket_number', type: 'varchar', length: 20, nullable: true })
  rocketNumber!: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName!: string | null;

  @Column({ name: 'bank_account_holder', type: 'varchar', length: 100, nullable: true })
  bankAccountHolder!: string | null;

  @Column({ name: 'bank_account_number', type: 'varchar', length: 50, nullable: true })
  bankAccountNumber!: string | null;

  @Column({ name: 'bank_branch_name', type: 'varchar', length: 100, nullable: true })
  bankBranchName!: string | null;

  @Column({ name: 'two_factor_enabled', type: 'boolean', default: false })
  twoFactorEnabled!: boolean;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin!: Date | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
