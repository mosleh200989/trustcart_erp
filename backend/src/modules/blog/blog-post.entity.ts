import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { BlogCategory } from './blog-category.entity';
import { BlogTag } from './blog-tag.entity';

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  title!: string;

  @Column({ unique: true, nullable: false })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  excerpt!: string;

  @Column({ type: 'text', nullable: false })
  content!: string;

  @Column({ nullable: true })
  featured_image!: string;

  @Column({ nullable: true })
  category_id!: number;

  @Column({ nullable: true })
  author!: string;

  @Column({ default: 'published' })
  status!: string;

  @Column({ default: 0 })
  views!: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @ManyToOne(() => BlogCategory)
  @JoinColumn({ name: 'category_id' })
  category?: BlogCategory;

  @ManyToMany(() => BlogTag)
  @JoinTable({
    name: 'blog_post_tags',
    joinColumn: { name: 'blog_post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'blog_tag_id', referencedColumnName: 'id' }
  })
  tags?: BlogTag[];
}
