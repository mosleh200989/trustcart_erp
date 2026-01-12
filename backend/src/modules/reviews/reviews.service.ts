import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerReview } from './customer-review.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(CustomerReview)
    private reviewsRepository: Repository<CustomerReview>,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  private buildReferralShareUrl(code: string): string {
    const base = String(process.env.APP_PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, '');
    return `${base}/r/${encodeURIComponent(String(code).trim())}`;
  }

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
    const saved = await this.reviewsRepository.save(review);

    const customerIdRaw =
      createReviewDto?.customerId ??
      createReviewDto?.customer_id ??
      (saved as any)?.customerId ??
      (saved as any)?.customer_id ??
      null;
    const customerId = customerIdRaw != null ? Number(customerIdRaw) : null;

    if (!customerId || !Number.isFinite(customerId)) {
      return saved;
    }

    const referralCode = await this.loyaltyService.getShareReferralCode(customerId);
    const referralLink = this.buildReferralShareUrl(referralCode);

    await this.loyaltyService.recordReferralEvent({
      eventType: 'review_created',
      referrerCustomerId: customerId,
      sourceChannel: 'review_share',
      payload: {
        reviewId: (saved as any).id,
        productId: (saved as any).productId ?? (saved as any).product_id ?? null,
        orderId: (saved as any).orderId ?? (saved as any).order_id ?? null,
      },
    });

    return {
      ...(saved as any),
      referral_code: referralCode,
      referral_link: referralLink,
    };
  }
}
