import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
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
          p.status, 
          p.image_url,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.brand,
          p.unit_of_measure,
          p.created_at
        FROM products p
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
    return this.productsRepository.findOne({ where: { id: parseInt(id) } });
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
          p.image_url, 
          p.status,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.brand
        FROM products p
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
          p.image_url, p.status,
          p.discount_type,
          p.discount_value,
          p.sale_price,
          p.created_at
        FROM products p
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
        SELECT id, slug, sku, name_en, name_bn, description_en, base_price, selling_price, 
               deal_price, deal_expires_at, image_url, status
        FROM products 
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
        SELECT id, slug, sku, name_en, name_bn, description_en, base_price, selling_price, image_url, status
        FROM products 
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
        SELECT id, slug, sku, name_en, name_bn, description_en, base_price, selling_price, image_url, status
        FROM products 
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
        SELECT id, slug, sku, name_en, name_bn, description_en, base_price, selling_price, image_url, status
        FROM products 
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
               p.base_price, p.sale_price, p.discount_type, p.discount_value, p.image_url, p.status, p.stock_quantity, c.name_en as category_name
        FROM products p
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
        SELECT p.id, p.slug, p.sku, p.name_en, p.name_bn, p.description_en, p.base_price, p.sale_price, p.discount_type, p.discount_value, p.image_url, p.status, p.stock_quantity, c.name_en as category_name
        FROM products p
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
               p.base_price, p.selling_price, p.image_url, p.status, upv.viewed_at
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
      
      query += ` ORDER BY upv.viewed_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const results = await this.productsRepository.query(query, params);
      return results;
    } catch (error) {
      console.error('Error fetching recently viewed products:', error);
      return [];
    }
  }
}
