import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('blog_tags')
export class BlogTag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, nullable: false })
  name!: string;

  @Column({ unique: true, nullable: false })
  slug!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
