import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('customer_addresses')
export class CustomerAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ length: 50, name: 'address_type' })
  addressType: string; // home, office, others

  @Column({ length: 255, name: 'street_address' })
  streetAddress: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  district: string;

  @Column({ length: 100, nullable: true, name: 'state_province' })
  stateProvince: string;

  @Column({ length: 100, nullable: true, name: 'postal_code' })
  postalCode: string;

  @Column({ length: 100, nullable: true })
  country: string;

  @Column({ length: 20, nullable: true, name: 'contact_phone' })
  phone: string;

  @Column({ default: false, name: 'is_primary' })
  isPrimary: boolean;

  @Column({ length: 100, nullable: true })
  latitude: string;

  @Column({ length: 100, nullable: true })
  longitude: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
