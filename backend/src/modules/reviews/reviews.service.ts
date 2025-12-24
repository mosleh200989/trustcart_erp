import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerReview } from './customer-review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(CustomerReview)
    private reviewsRepository: Repository<CustomerReview>,
  ) {}

  async findAll() {
    try {
      const results = await this.reviewsRepository.query(`
        SELECT cr.*, p.name_en as product_name, p.slug as product_slug
        FROM customer_reviews cr
        LEFT JOIN products p ON cr.product_id = p.id
        WHERE cr.is_approved = TRUE
        ORDER BY cr.created_at DESC
        LIMIT 50
      `);
      return results;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  }

  async findFeatured() {
    try {
      const results = await this.reviewsRepository.query(`
        SELECT cr.*, p.name_en as product_name, p.slug as product_slug
        FROM customer_reviews cr
        LEFT JOIN products p ON cr.product_id = p.id
        WHERE cr.is_featured = TRUE 
          AND cr.is_approved = TRUE
        ORDER BY cr.created_at DESC
        LIMIT 10
      `);
      return results;
    } catch (error) {
      console.error('Error fetching featured reviews:', error);
      return [];
    }
  }

  async findByProduct(productId: number) {
    try {
      const results = await this.reviewsRepository.query(`
        SELECT cr.*
        FROM customer_reviews cr
        WHERE cr.product_id = $1
          AND cr.is_approved = TRUE
        ORDER BY cr.created_at DESC
      `, [productId]);
      return results;
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      return [];
    }
  }

  async create(createReviewDto: any) {
    const review = this.reviewsRepository.create(createReviewDto);
    return this.reviewsRepository.save(review);
  }
}
