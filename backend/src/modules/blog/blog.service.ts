import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { BlogCategory } from './blog-category.entity';
import { BlogTag } from './blog-tag.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
    @InjectRepository(BlogCategory)
    private blogCategoryRepository: Repository<BlogCategory>,
    @InjectRepository(BlogTag)
    private blogTagRepository: Repository<BlogTag>,
  ) {}

  async findAllPosts() {
    try {
      const posts = await this.blogPostRepository.query(`
        SELECT 
          bp.id, bp.title, bp.slug, bp.excerpt, bp.content, 
          bp.featured_image, bp.category_id, bp.author, bp.status, 
          bp.views, bp.created_at, bp.updated_at,
          bc.name as category_name, bc.slug as category_slug,
          ARRAY_AGG(DISTINCT jsonb_build_object('id', bt.id, 'name', bt.name, 'slug', bt.slug)) 
            FILTER (WHERE bt.id IS NOT NULL) as tags
        FROM blog_posts bp
        LEFT JOIN blog_categories bc ON bp.category_id = bc.id
        LEFT JOIN blog_post_tags bpt ON bp.id = bpt.blog_post_id
        LEFT JOIN blog_tags bt ON bpt.blog_tag_id = bt.id
        WHERE bp.status = 'published'
        GROUP BY bp.id, bc.name, bc.slug
        ORDER BY bp.created_at DESC
      `);
      return posts;
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      return [];
    }
  }

  async findPostBySlug(slug: string) {
    try {
      const posts = await this.blogPostRepository.query(`
        SELECT 
          bp.id, bp.title, bp.slug, bp.excerpt, bp.content, 
          bp.featured_image, bp.category_id, bp.author, bp.status, 
          bp.views, bp.created_at, bp.updated_at,
          bc.name as category_name, bc.slug as category_slug,
          ARRAY_AGG(DISTINCT jsonb_build_object('id', bt.id, 'name', bt.name, 'slug', bt.slug)) 
            FILTER (WHERE bt.id IS NOT NULL) as tags
        FROM blog_posts bp
        LEFT JOIN blog_categories bc ON bp.category_id = bc.id
        LEFT JOIN blog_post_tags bpt ON bp.id = bpt.blog_post_id
        LEFT JOIN blog_tags bt ON bpt.blog_tag_id = bt.id
        WHERE bp.slug = $1 AND bp.status = 'published'
        GROUP BY bp.id, bc.name, bc.slug
      `, [slug]);

      if (posts && posts.length > 0) {
        // Increment view count
        await this.blogPostRepository.query(
          'UPDATE blog_posts SET views = views + 1 WHERE slug = $1',
          [slug]
        );
        return posts[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching blog post by slug:', error);
      throw error;
    }
  }

  async findPostsByCategory(categorySlug: string) {
    try {
      const posts = await this.blogPostRepository.query(`
        SELECT 
          bp.id, bp.title, bp.slug, bp.excerpt, bp.featured_image, 
          bp.author, bp.views, bp.created_at,
          bc.name as category_name, bc.slug as category_slug
        FROM blog_posts bp
        INNER JOIN blog_categories bc ON bp.category_id = bc.id
        WHERE bc.slug = $1 AND bp.status = 'published'
        ORDER BY bp.created_at DESC
      `, [categorySlug]);
      return posts;
    } catch (error) {
      console.error('Error fetching posts by category:', error);
      return [];
    }
  }

  async findPostsByTag(tagSlug: string) {
    try {
      const posts = await this.blogPostRepository.query(`
        SELECT 
          bp.id, bp.title, bp.slug, bp.excerpt, bp.featured_image, 
          bp.author, bp.views, bp.created_at,
          bt.name as tag_name, bt.slug as tag_slug
        FROM blog_posts bp
        INNER JOIN blog_post_tags bpt ON bp.id = bpt.blog_post_id
        INNER JOIN blog_tags bt ON bpt.blog_tag_id = bt.id
        WHERE bt.slug = $1 AND bp.status = 'published'
        ORDER BY bp.created_at DESC
      `, [tagSlug]);
      return posts;
    } catch (error) {
      console.error('Error fetching posts by tag:', error);
      return [];
    }
  }

  async findAllCategories() {
    return this.blogCategoryRepository.find({ order: { name: 'ASC' } });
  }

  async findAllTags() {
    return this.blogTagRepository.find({ order: { name: 'ASC' } });
  }

  async findRelatedPosts(postId: number, limit: number = 3) {
    try {
      const posts = await this.blogPostRepository.query(`
        SELECT DISTINCT
          bp.id, bp.title, bp.slug, bp.excerpt, bp.featured_image, bp.created_at
        FROM blog_posts bp
        WHERE bp.id != $1 AND bp.status = 'published'
        ORDER BY bp.created_at DESC
        LIMIT $2
      `, [postId, limit]);
      return posts;
    } catch (error) {
      console.error('Error fetching related posts:', error);
      return [];
    }
  }
}
