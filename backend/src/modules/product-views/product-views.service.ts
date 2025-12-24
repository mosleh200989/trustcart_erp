import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProductView } from './user-product-view.entity';

@Injectable()
export class ProductViewsService {
  constructor(
    @InjectRepository(UserProductView)
    private viewsRepository: Repository<UserProductView>,
  ) {}

  async trackView(productId: number, userId?: number, sessionId?: string) {
    try {
      const view = this.viewsRepository.create({
        product_id: productId,
        user_id: userId,
        session_id: sessionId
      });
      await this.viewsRepository.save(view);
      return { success: true };
    } catch (error) {
      console.error('Error tracking product view:', error);
      return { success: false };
    }
  }

  async getRecentlyViewed(userId?: number, sessionId?: string, limit: number = 8) {
    try {
      let query = `
        SELECT DISTINCT ON (p.id) p.id, p.slug, p.sku, p.name_en, p.name_bn, 
               p.description_en, p.base_price, p.selling_price, p.image_url, 
               p.status, upv.viewed_at
        FROM products p
        INNER JOIN user_product_views upv ON p.id = upv.product_id
        WHERE p.status = 'active'
      `;
      
      const params: any[] = [];
      if (userId) {
        query += ` AND upv.user_id = $1`;
        params.push(userId);
      } else if (sessionId) {
        query += ` AND upv.session_id = $1`;
        params.push(sessionId);
      }
      
      query += ` ORDER BY p.id, upv.viewed_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const results = await this.viewsRepository.query(query, params);
      return results;
    } catch (error) {
      console.error('Error fetching recently viewed:', error);
      return [];
    }
  }
}
