import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { DealOfTheDay } from './deal-of-the-day.entity';
import { HotDeal } from './hot-deal.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(DealOfTheDay)
    private dealOfTheDayRepository: Repository<DealOfTheDay>,
    @InjectRepository(HotDeal)
    private hotDealRepository: Repository<HotDeal>,
  ) {}

  async findAll() {
    try {
      console.log('Starting findAll query...');
      
      // Use raw query with slug column included and JOIN with categories
      const rawResults = await this.productsRepository.query(`
        SELECT 
          p.id, p.slug, p.sku, p.product_code, 
          p.name_en, p.name_bn, p.description_en, 
          p.category_id, 
          c.name_en as category_name,
          p.base_price, 
          p.base_price as price,
          p.base_price as selling_price,
          p.wholesale_price, 
          p.stock_quantity,
          p.display_position,
          p.additional_info,
          p.status, 
          COALESCE(p.image_url, pi.image_url) as image_url,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.brand,
          p.unit_of_measure,
          p.size_variants,
          p.created_at
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active'
        ORDER BY p.created_at DESC
        LIMIT 100
      `);
      console.log(`Raw query found ${rawResults.length} products`);
      
      if (rawResults.length > 0) {
        console.log('First product:', JSON.stringify(rawResults[0], null, 2));
        return rawResults;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      return [];
    }
  }

  async findAllAdmin() {
    try {
      console.log('Starting findAllAdmin query (includes inactive products)...');
      
      // Return ALL products including inactive ones for admin
      const rawResults = await this.productsRepository.query(`
        SELECT 
          p.id, p.slug, p.sku, p.product_code, 
          p.name_en, p.name_bn, p.description_en, 
          p.category_id, 
          c.name_en as category_name,
          p.base_price, 
          p.base_price as price,
          p.base_price as selling_price,
          p.wholesale_price, 
          p.stock_quantity,
          p.display_position,
          p.additional_info,
          p.status, 
          COALESCE(p.image_url, pi.image_url) as image_url,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.brand,
          p.unit_of_measure,
          p.size_variants,
          p.created_at
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.created_at DESC
      `);
      console.log(`findAllAdmin found ${rawResults.length} products`);
      
      return rawResults;
    } catch (error) {
      console.error('Error fetching all products for admin:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      return [];
    }
  }

  async findAllCategories() {
    try {
      const categories = await this.productsRepository.query(`
        SELECT id, name_en, name_bn, slug, description, image_url, is_active, display_order
        FROM categories
        WHERE is_active = true
        ORDER BY display_order ASC, name_en ASC
      `);
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async findOne(id: string) {
    const numericId = parseInt(id, 10);
    if (!Number.isFinite(numericId)) {
      throw new BadRequestException('Invalid product id');
    }
    return this.productsRepository.findOne({ where: { id: numericId } });
  }

  async searchProducts(query: string) {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      const results = await this.productsRepository.query(`
        SELECT 
          p.id, p.slug, p.sku, p.product_code, 
          p.name_en, p.name_bn, p.description_en, 
          p.category_id, 
          c.name_en as category_name,
          p.base_price, 
          p.base_price as price,
          p.wholesale_price, 
          p.stock_quantity,
          COALESCE(p.image_url, pi.image_url) as image_url, 
          p.additional_info,
          p.status,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.brand
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active'
          AND (
            LOWER(p.name_en) LIKE $1 
            OR LOWER(p.name_bn) LIKE $1 
            OR LOWER(p.description_en) LIKE $1
            OR LOWER(p.sku) LIKE $1
            OR LOWER(c.name_en) LIKE $1
          )
        ORDER BY p.created_at DESC
        LIMIT 20
      `, [searchTerm]);
      
      return results || [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async findBySlug(slug: string) {
    try {
      const result = await this.productsRepository.query(`
        SELECT 
          p.id, p.slug, p.sku, p.product_code, 
          p.name_en, p.name_bn, 
          p.description_en, p.description_bn, 
          p.category_id,
          c.name_en as category_name,
          p.base_price, 
          p.base_price as price,
          p.base_price as selling_price,
          p.wholesale_price, 
          p.stock_quantity,
          p.display_position,
          p.brand, p.unit_of_measure, 
          COALESCE(p.image_url, pi.image_url) as image_url,
          p.status,
          p.additional_info,
          p.size_variants,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.created_at
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.slug = $1 
        LIMIT 1
      `, [slug]);
      
      if (result && result.length > 0) {
        return result[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching product by slug:', error);
      throw error;
    }
  }

  async create(createProductDto: any) {
    try {
      console.log('Creating product with data:', createProductDto);
      
      // Generate UUID if not provided
      const productData = {
        ...createProductDto,
        uuid: createProductDto.uuid || null,
        name_bn: createProductDto.name_bn || null,
        description_en: createProductDto.description_en || null,
        description_bn: createProductDto.description_bn || null,
        product_code: createProductDto.product_code || null,
        brand: createProductDto.brand || null,
        unit_of_measure: createProductDto.unit_of_measure || null,
        wholesale_price: createProductDto.wholesale_price || null,
        image_url: createProductDto.image_url || null,
        stock_quantity: createProductDto.stock_quantity || null,
        display_position: createProductDto.display_position || null,
        status: createProductDto.status || 'active'
      };
      
      console.log('Processed product data:', productData);
      const product = this.productsRepository.create(productData);
      const saved = await this.productsRepository.save(product);
      const savedProduct = Array.isArray(saved) ? saved[0] : saved;
      console.log('Product created successfully:', savedProduct?.id);
      return saved;
    } catch (error: any) {
      console.error('Error creating product:', error);
      if (error?.code) {
        console.error('Database error code:', error.code);
      }
      if (error?.detail) {
        console.error('Error detail:', error.detail);
      }
      throw error;
    }
  }

  async update(id: string, updateProductDto: any) {
    try {
      console.log('Updating product:', id, updateProductDto);
      const result = await this.productsRepository.update(parseInt(id), updateProductDto);
      console.log('Update result:', result);
      return this.findOne(id);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async remove(id: string) {
    return this.productsRepository.delete(parseInt(id));
  }

  // Homepage Features
  async findDealOfDay() {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, p.base_price, p.selling_price, 
               p.deal_price, p.deal_expires_at,
               COALESCE(p.image_url, pi.image_url) as image_url,
               p.status
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        WHERE is_deal_of_day = TRUE 
          AND status = 'active'
          AND (deal_expires_at IS NULL OR deal_expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 10
      `);
      return results;
    } catch (error) {
      console.error('Error fetching deal of day products:', error);
      return [];
    }
  }

  async findPopular() {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, p.base_price, p.selling_price,
               COALESCE(p.image_url, pi.image_url) as image_url,
               p.status
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        WHERE is_popular = TRUE AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 8
      `);
      return results;
    } catch (error) {
      console.error('Error fetching popular products:', error);
      return [];
    }
  }

  async findNewArrivals() {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, p.base_price, p.selling_price,
               COALESCE(p.image_url, pi.image_url) as image_url,
               p.status
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        WHERE is_new_arrival = TRUE AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 8
      `);
      return results;
    } catch (error) {
      console.error('Error fetching new arrival products:', error);
      return [];
    }
  }

  async findFeatured() {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, p.base_price, p.selling_price,
               COALESCE(p.image_url, pi.image_url) as image_url,
               p.status
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        WHERE is_featured = TRUE AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 8
      `);
      return results;
    } catch (error) {
      console.error('Error fetching featured products:', error);
      return [];
    }
  }

  async findRelated(productId: number, limit: number = 4) {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, 
               p.base_price, p.sale_price, p.discount_type, p.discount_value,
               COALESCE(p.image_url, pi.image_url) as image_url,
               p.status, p.stock_quantity, c.name_en as category_name
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active' 
          AND p.id != $1
          AND p.category_id = (SELECT category_id FROM products WHERE id = $1)
        ORDER BY RANDOM()
        LIMIT $2
      `, [productId, limit]);
      return results;
    } catch (error) {
      console.error('Error fetching related products:', error);
      return [];
    }
  }

  async findSuggested(limit: number = 4) {
    try {
      const results = await this.productsRepository.query(`
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, p.base_price, p.sale_price, p.discount_type, p.discount_value,
               COALESCE(p.image_url, pi.image_url) as image_url,
               p.status, p.stock_quantity, c.name_en as category_name
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active'
        ORDER BY RANDOM()
        LIMIT $1
      `, [limit]);
      return results;
    } catch (error) {
      console.error('Error fetching suggested products:', error);
      return [];
    }
  }

  async findRecentlyViewed(userId?: number, sessionId?: string, limit: number = 8) {
    try {
      let query = `
        SELECT DISTINCT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, 
               p.base_price, p.selling_price,
               COALESCE(p.image_url, pi.image_url) as image_url,
               p.status, upv.viewed_at
        FROM products p
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) pi ON TRUE
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
      
      query += ` ORDER BY upv.viewed_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const results = await this.productsRepository.query(query, params);
      return results;
    } catch (error) {
      console.error('Error fetching recently viewed products:', error);
      return [];
    }
  }

  // Product Images Methods
  async getProductImages(productId: number) {
    try {
      console.log('Fetching images for product ID:', productId);
      const images = await this.productsRepository.query(`
        SELECT id, product_id, image_url, display_order, is_primary, created_at
        FROM product_images
        WHERE product_id = $1
        ORDER BY is_primary DESC, display_order ASC
      `, [productId]);
      console.log('Found images:', images.length, images);
      return images;
    } catch (error) {
      console.error('Error fetching product images:', error);
      return [];
    }
  }

  async addProductImage(productId: number, imageData: { image_url: string; display_order?: number; is_primary?: boolean }) {
    try {
      // If this is to be set as primary, unset any existing primary image
      if (imageData.is_primary) {
        await this.productsRepository.query(`
          UPDATE product_images SET is_primary = FALSE WHERE product_id = $1
        `, [productId]);
      }

      const result = await this.productsRepository.query(`
        INSERT INTO product_images (product_id, image_url, display_order, is_primary)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        productId,
        imageData.image_url,
        imageData.display_order || 0,
        imageData.is_primary || false
      ]);
      return result[0];
    } catch (error) {
      console.error('Error adding product image:', error);
      throw error;
    }
  }

  async deleteProductImage(imageId: number) {
    try {
      await this.productsRepository.query(`
        DELETE FROM product_images WHERE id = $1
      `, [imageId]);
      return { success: true, message: 'Image deleted successfully' };
    } catch (error) {
      console.error('Error deleting product image:', error);
      throw error;
    }
  }

  async updateProductImage(imageId: number, imageData: { display_order?: number; is_primary?: boolean }) {
    try {
      // If setting as primary, get the product_id first and unset others
      if (imageData.is_primary) {
        const currentImage = await this.productsRepository.query(`
          SELECT product_id FROM product_images WHERE id = $1
        `, [imageId]);
        
        if (currentImage.length > 0) {
          await this.productsRepository.query(`
            UPDATE product_images SET is_primary = FALSE WHERE product_id = $1
          `, [currentImage[0].product_id]);
        }
      }

      const updateFields: string[] = [];
      const params: any[] = [];
      let paramCounter = 1;

      if (imageData.display_order !== undefined) {
        updateFields.push(`display_order = $${paramCounter}`);
        params.push(imageData.display_order);
        paramCounter++;
      }

      if (imageData.is_primary !== undefined) {
        updateFields.push(`is_primary = $${paramCounter}`);
        params.push(imageData.is_primary);
        paramCounter++;
      }

      if (updateFields.length === 0) {
        return { success: false, message: 'No fields to update' };
      }

      params.push(imageId);
      const result = await this.productsRepository.query(`
        UPDATE product_images 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `, params);

      return result[0];
    } catch (error) {
      console.error('Error updating product image:', error);
      throw error;
    }
  }

  // Deal of the Day methods
  async getDealOfTheDay() {
    try {
      console.log('🔍 Fetching active deal from database...');
      const deal = await this.dealOfTheDayRepository.findOne({
        where: { is_active: true },
      });

      console.log('📦 Deal found:', deal);

      if (!deal) {
        console.log('⚠️ No active deal found in database');
        return null;
      }

      if (!deal.product_id || deal.product_id === null || isNaN(Number(deal.product_id))) {
        console.log('⚠️ Deal exists but product_id is invalid:', deal.product_id);
        return null;
      }

      // Check if deal has expired
      if (deal.end_date && new Date(deal.end_date) < new Date()) {
        console.log('⏰ Deal has expired, deactivating...');
        await this.dealOfTheDayRepository.update(deal.id, { is_active: false });
        return null;
      }

      // Get full product details with category
      console.log('🔍 Fetching product with ID:', deal.product_id);
      
      const productDetails = await this.productsRepository.query(`
        SELECT 
          p.id, p.slug, p.sku, p.name_en, p.name_bn, 
          p.base_price, p.sale_price, p.discount_type, p.discount_value,
          p.brand, p.image_url, p.stock_quantity, p.status,
          c.name_en as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1 AND p.status = 'active'
      `, [Number(deal.product_id)]);

      console.log('✅ Product details fetched:', productDetails[0] ? 'Found' : 'Not found');
      return productDetails[0] || null;
    } catch (error) {
      console.error('❌ Error fetching deal of the day:', error);
      return null;
    }
  }

  async setDealOfTheDay(productId: number, endDate?: Date) {
    try {
      // Deactivate all existing deals
      await this.dealOfTheDayRepository.update(
        { is_active: true },
        { is_active: false }
      );

      // Create new deal
      const deal = this.dealOfTheDayRepository.create({
        product_id: productId,
        start_date: new Date(),
        end_date: endDate,
        is_active: true,
      });

      return await this.dealOfTheDayRepository.save(deal);
    } catch (error) {
      console.error('Error setting deal of the day:', error);
      throw error;
    }
  }

  async removeDealOfTheDay() {
    try {
      await this.dealOfTheDayRepository.update(
        { is_active: true },
        { is_active: false }
      );
      return { success: true, message: 'Deal of the day removed' };
    } catch (error) {
      console.error('Error removing deal of the day:', error);
      throw error;
    }
  }

  // ==================== HOT DEALS ====================

  async getHotDeals() {
    try {
      const deals = await this.hotDealRepository.query(`
        SELECT 
          hd.id, hd.product_id, hd.special_price, hd.discount_percent,
          hd.display_order, hd.start_date, hd.end_date, hd.is_active,
          hd.created_at, hd.updated_at,
          p.name_en, p.name_bn, p.slug, p.sku, p.base_price, p.sale_price,
          p.image_url, p.stock_quantity, p.status as product_status,
          c.name_en as category_name
        FROM hot_deals hd
        JOIN products p ON hd.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY hd.display_order ASC, hd.created_at DESC
      `);
      return deals;
    } catch (error) {
      console.error('Error fetching hot deals:', error);
      return [];
    }
  }

  async getActiveHotDeals() {
    try {
      const now = new Date();
      const deals = await this.hotDealRepository.query(`
        SELECT 
          hd.id, hd.product_id, hd.special_price, hd.discount_percent,
          hd.display_order, hd.start_date, hd.end_date, hd.is_active,
          p.name_en, p.name_bn, p.slug, p.sku, p.base_price, p.sale_price,
          p.image_url, p.stock_quantity,
          c.name_en as category_name
        FROM hot_deals hd
        JOIN products p ON hd.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE hd.is_active = true
          AND p.status = 'active'
          AND (hd.start_date IS NULL OR hd.start_date <= $1)
          AND (hd.end_date IS NULL OR hd.end_date >= $1)
        ORDER BY hd.display_order ASC, hd.created_at DESC
      `, [now]);
      return deals;
    } catch (error) {
      console.error('Error fetching active hot deals:', error);
      return [];
    }
  }

  async addHotDeal(data: {
    productId: number;
    specialPrice?: number;
    discountPercent?: number;
    displayOrder?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      // Check if product already exists in hot deals
      const existing = await this.hotDealRepository.findOne({
        where: { product_id: data.productId }
      });
      if (existing) {
        throw new BadRequestException('Product is already in hot deals');
      }

      const hotDeal = this.hotDealRepository.create({
        product_id: data.productId,
        special_price: data.specialPrice,
        discount_percent: data.discountPercent,
        display_order: data.displayOrder || 0,
        start_date: data.startDate,
        end_date: data.endDate,
        is_active: true,
      });

      return await this.hotDealRepository.save(hotDeal);
    } catch (error) {
      console.error('Error adding hot deal:', error);
      throw error;
    }
  }

  async updateHotDeal(id: number, data: {
    specialPrice?: number;
    discountPercent?: number;
    displayOrder?: number;
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
  }) {
    try {
      const hotDeal = await this.hotDealRepository.findOne({ where: { id } });
      if (!hotDeal) {
        throw new BadRequestException('Hot deal not found');
      }

      if (data.specialPrice !== undefined) hotDeal.special_price = data.specialPrice;
      if (data.discountPercent !== undefined) hotDeal.discount_percent = data.discountPercent;
      if (data.displayOrder !== undefined) hotDeal.display_order = data.displayOrder;
      if (data.startDate !== undefined) hotDeal.start_date = data.startDate;
      if (data.endDate !== undefined) hotDeal.end_date = data.endDate;
      if (data.isActive !== undefined) hotDeal.is_active = data.isActive;

      return await this.hotDealRepository.save(hotDeal);
    } catch (error) {
      console.error('Error updating hot deal:', error);
      throw error;
    }
  }

  async removeHotDeal(id: number) {
    try {
      const result = await this.hotDealRepository.delete(id);
      return { success: true, message: 'Hot deal removed', affected: result.affected };
    } catch (error) {
      console.error('Error removing hot deal:', error);
      throw error;
    }
  }

  async toggleHotDealStatus(id: number) {
    try {
      const hotDeal = await this.hotDealRepository.findOne({ where: { id } });
      if (!hotDeal) {
        throw new BadRequestException('Hot deal not found');
      }

      hotDeal.is_active = !hotDeal.is_active;
      return await this.hotDealRepository.save(hotDeal);
    } catch (error) {
      console.error('Error toggling hot deal status:', error);
      throw error;
    }
  }
}