import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('special_offers')
export class SpecialOffer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb', { nullable: true })
  features: string[];

  @Column({ nullable: true })
  primary_button_text: string;

  @Column({ nullable: true })
  primary_button_link: string;

  @Column({ nullable: true })
  secondary_button_text: string;

  @Column({ nullable: true })
  secondary_button_link: string;

  @Column({ nullable: true })
  image_url: string;

  @Column({ default: 'from-orange-50 via-white to-orange-50' })
  background_gradient: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  display_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
