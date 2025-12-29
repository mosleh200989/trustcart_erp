import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  name_en!: string;

  @Column({ nullable: true })
  name_bn!: string;

  @Column({ unique: true, nullable: false })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ nullable: true, length: 500 })
  image_url!: string;

  @Column({ type: 'int', nullable: true })
  parent_id!: number;

  @Column({ type: 'int', default: 0 })
  display_order!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
