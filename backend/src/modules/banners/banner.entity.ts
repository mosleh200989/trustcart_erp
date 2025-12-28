import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid' })
  uuid!: string;

  @Column({ nullable: false })
  title!: string;

  @Column({ nullable: true })
  subtitle!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ nullable: true, length: 100 })
  button_text!: string;

  @Column({ nullable: true, length: 500 })
  button_link!: string;

  @Column({ nullable: false, length: 500 })
  image_url!: string;

  @Column({ nullable: true, length: 50, default: '#FF6B35' })
  background_color!: string;

  @Column({ nullable: true, length: 50, default: '#FFFFFF' })
  text_color!: string;

  @Column({ type: 'int', default: 0 })
  display_order!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ 
    type: 'enum', 
    enum: ['carousel', 'side', 'promotional'], 
    default: 'carousel' 
  })
  banner_type!: string;

  @Column({ type: 'timestamp', nullable: true })
  start_date!: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
