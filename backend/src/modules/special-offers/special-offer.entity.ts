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

  // Used to differentiate placements (e.g., homepage vs thank you page)
  @Column({ default: 'homepage' })
  context: string;

  // Optional upsell configuration for thank you page offer
  @Column({ type: 'int', nullable: true })
  product_id: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  offer_price: number;

  @Column({ default: 0 })
  display_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
