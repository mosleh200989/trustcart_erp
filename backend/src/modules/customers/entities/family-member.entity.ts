import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Customer } from '../customer.entity';

@Entity('customer_family_members')
export class FamilyMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  district: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ 
    length: 20, 
    nullable: true,
    type: 'varchar'
  })
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';

  @Column({ type: 'date', nullable: true, name: 'date_of_birth' })
  dateOfBirth: Date;

  @Column({ 
    length: 20, 
    nullable: true,
    name: 'marital_status',
    type: 'varchar'
  })
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'other';

  @Column({ type: 'date', nullable: true, name: 'anniversary_date' })
  anniversaryDate: Date;

  @Column({ length: 100, nullable: true })
  profession: string;

  @Column({ 
    length: 50,
    type: 'varchar'
  })
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'grandparent' | 'other';

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Customer, customer => customer.familyMembers)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
