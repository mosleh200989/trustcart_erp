import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { FamilyMember } from './entities/family-member.entity';
import { CustomerInteraction } from './entities/customer-interaction.entity';
import { CustomerBehavior } from './entities/customer-behavior.entity';
import { CustomerDropoff } from './entities/customer-dropoff.entity';

export enum LeadPriority {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold'
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  uuid!: string;

  @Column({ nullable: true })
  title!: string;

  @Column({ name: 'name', nullable: true })
  name!: string;

  @Column({ name: 'last_name', nullable: true })
  lastName!: string;

  @Column({ name: 'company_name', nullable: true })
  companyName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true, select: false })
  password!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  mobile!: string;

  @Column({ nullable: true })
  website!: string;

  @Column({ nullable: true })
  segment_id!: number;

  @Column({ nullable: true })
  assigned_user_id!: number;

  @Column({ nullable: true })
  assigned_supervisor_id!: number;

  @Column({ nullable: true })
  source!: string;

  @Column({ nullable: true })
  rating!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  total_spent!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  customer_lifetime_value!: number;

  @Column({ nullable: true })
  preferred_contact_method!: string;

  @Column({ default: false })
  is_deleted!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'timestamp', nullable: true })
  last_contact_date!: Date;

  @Column({ type: 'timestamp', nullable: true })
  next_follow_up!: Date;

  @Column({ nullable: true })
  address!: string;

  @Column({ nullable: true })
  district!: string;

  @Column({ nullable: true })
  city!: string;

  @Column({ nullable: true })
  gender!: string;

  @Column({ type: 'date', nullable: true, name: 'date_of_birth' })
  dateOfBirth!: Date;

  @Column({ nullable: true, name: 'marital_status' })
  maritalStatus!: string;

  @Column({ type: 'date', nullable: true, name: 'anniversary_date' })
  anniversaryDate!: Date;

  @Column({ nullable: true })
  profession!: string;

  @Column({ nullable: true, name: 'available_time' })
  availableTime!: string;

  @Column({ nullable: true, name: 'customer_type', default: 'new' })
  customerType!: string;

  @Column({ nullable: true, name: 'lifecycle_stage', default: 'lead' })
  lifecycleStage!: string;

  @Column({ nullable: true })
  status!: string;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ nullable: true })
  assigned_to!: number;

  @Column({
    type: 'enum',
    enum: LeadPriority,
    nullable: true
  })
  priority!: LeadPriority;

  @Column({ default: false })
  is_escalated!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  escalated_at!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @OneToMany(() => FamilyMember, member => member.customer)
  familyMembers!: FamilyMember[];

  @OneToMany(() => CustomerInteraction, interaction => interaction.customer)
  interactions!: CustomerInteraction[];

  @OneToMany(() => CustomerBehavior, behavior => behavior.customer)
  behaviors!: CustomerBehavior[];

  @OneToMany(() => CustomerDropoff, dropoff => dropoff.customer)
  dropoffs!: CustomerDropoff[];
}
