import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComboDeal } from './combo-deal.entity';

@Injectable()
export class CombosService {
  constructor(
    @InjectRepository(ComboDeal)
    private comboDealsRepository: Repository<ComboDeal>,
  ) {}

  private getComboProductSelect() {
    return `
      ARRAY_AGG(
        DISTINCT jsonb_build_object(
          'id', p.id,
          'name_en', p.name_en,
          'name_bn', p.name_bn,
          'slug', p.slug,
          'image_url', p.image_url,
          'base_price', p.base_price,
          'sale_price', p.sale_price,
          'size_variants', p.size_variants,
          'variant_name', cdp.variant_name,
          'variant_price', cdp.variant_price,
          'quantity', COALESCE(cdp.quantity, 1),
          'display_order', COALESCE(cdp.display_order, 0)
        )
      ) FILTER (WHERE p.id IS NOT NULL) as products,
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', cdi.id,
            'image_url', cdi.image_url,
            'display_order', cdi.display_order,
            'is_primary', cdi.is_primary
          )
          ORDER BY cdi.is_primary DESC, cdi.display_order ASC, cdi.id ASC
        )
        FROM combo_deal_images cdi
        WHERE cdi.combo_deal_id = cd.id
      ), '[]'::jsonb) as images
    `;
  }

  private normalizeComboItems(comboDto: any) {
    if (Array.isArray(comboDto.product_items)) {
      return comboDto.product_items
        .map((item: any, index: number) => ({
          product_id: Number(item.product_id ?? item.productId ?? item.id),
          variant_name: item.variant_name || item.variantName || null,
          variant_price: item.variant_price ?? item.variantPrice ?? null,
          quantity: Number(item.quantity || 1),
          display_order: Number(item.display_order ?? index),
        }))
        .filter((item: any) => Number.isFinite(item.product_id) && item.product_id > 0);
    }

    if (Array.isArray(comboDto.product_ids)) {
      return comboDto.product_ids
        .map((productId: any, index: number) => ({
          product_id: Number(productId),
          variant_name: null,
          variant_price: null,
          quantity: 1,
          display_order: index,
        }))
        .filter((item: any) => Number.isFinite(item.product_id) && item.product_id > 0);
    }

    return [];
  }

  private normalizeComboImages(comboDto: any) {
    const urls = Array.isArray(comboDto.image_urls)
      ? comboDto.image_urls
      : Array.isArray(comboDto.images)
        ? comboDto.images.map((image: any) => typeof image === 'string' ? image : image?.image_url)
        : [];

    const cleaned = urls
      .map((url: any) => typeof url === 'string' ? url.trim() : '')
      .filter(Boolean);

    if (comboDto.image_url && !cleaned.includes(comboDto.image_url)) {
      cleaned.unshift(comboDto.image_url);
    }

    return cleaned;
  }

  private async syncComboProducts(comboId: number, comboDto: any) {
    const items = this.normalizeComboItems(comboDto);
    if (items.length === 0) return;

    for (const item of items) {
      await this.comboDealsRepository.query(`
        INSERT INTO combo_deal_products
          (combo_deal_id, product_id, variant_name, variant_price, quantity, display_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (combo_deal_id, product_id, COALESCE(variant_name, '')) DO UPDATE SET
          variant_price = EXCLUDED.variant_price,
          quantity = EXCLUDED.quantity,
          display_order = EXCLUDED.display_order
      `, [
        comboId,
        item.product_id,
        item.variant_name,
        item.variant_price,
        item.quantity,
        item.display_order,
      ]);
    }
  }

  private async syncComboImages(comboId: number, comboDto: any) {
    const imageUrls = this.normalizeComboImages(comboDto);
    await this.comboDealsRepository.query(
      `DELETE FROM combo_deal_images WHERE combo_deal_id = $1`,
      [comboId],
    );

    for (let index = 0; index < imageUrls.length; index += 1) {
      await this.comboDealsRepository.query(`
        INSERT INTO combo_deal_images (combo_deal_id, image_url, display_order, is_primary)
        VALUES ($1, $2, $3, $4)
      `, [comboId, imageUrls[index], index, index === 0]);
    }
  }

  async findAll(includeInactive: boolean = false) {
    try {
      const whereClause = includeInactive 
        ? '' 
        : 'WHERE cd.is_active = TRUE AND (cd.expires_at IS NULL OR cd.expires_at > NOW())';
      
      const results = await this.comboDealsRepository.query(`
        SELECT cd.*, 
               CASE WHEN cd.is_active THEN 'active' ELSE 'inactive' END as status,
               ${this.getComboProductSelect()}
        FROM combo_deals cd
        LEFT JOIN combo_deal_products cdp ON cd.id = cdp.combo_deal_id
        LEFT JOIN products p ON cdp.product_id = p.id
        ${whereClause}
        GROUP BY cd.id
        ORDER BY cd.created_at DESC
      `);
      return results;
    } catch (error) {
      console.error('Error fetching combo deals:', error);
      return [];
    }
  }

  async findBySlug(slug: string) {
    try {
      const results = await this.comboDealsRepository.query(`
        SELECT cd.*, 
               CASE WHEN cd.is_active THEN 'active' ELSE 'inactive' END as status,
               ${this.getComboProductSelect()}
        FROM combo_deals cd
        LEFT JOIN combo_deal_products cdp ON cd.id = cdp.combo_deal_id
        LEFT JOIN products p ON cdp.product_id = p.id
        WHERE cd.slug = $1
          AND cd.is_active = TRUE
          AND (cd.expires_at IS NULL OR cd.expires_at > NOW())
        GROUP BY cd.id
      `, [slug]);
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error fetching combo deal by slug:', error);
      throw error;
    }
  }

  async create(createComboDto: any) {
    try {
      console.log('Creating combo with data:', createComboDto);
      
      // Generate slug from name - handle Bengali names by adding timestamp
      let slug = createComboDto.name
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')  // Keep Bengali characters (Unicode range)
        .replace(/^-+|-+$/g, '');
      
      // If slug is empty or only Bengali chars (which may not work well in URLs), use timestamp
      if (!slug || !/[a-z0-9]/.test(slug)) {
        slug = `combo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      }

      const comboImages = this.normalizeComboImages(createComboDto);
      
      const combo = this.comboDealsRepository.create({
        name: createComboDto.name,
        slug,
        description: createComboDto.description || null,
        discount_percentage: createComboDto.discount_percentage || 0,
        combo_price: createComboDto.combo_price || null,
        image_url: createComboDto.image_url || comboImages[0] || null,
        display_position: createComboDto.display_position || null,
        expires_at: createComboDto.expires_at || null,
        is_active: createComboDto.status === 'active'
      });
      
      const savedCombo = await this.comboDealsRepository.save(combo);
      console.log('Combo saved:', savedCombo.id);
      
      // Add products to combo
      await this.syncComboProducts(savedCombo.id, createComboDto);
      await this.syncComboImages(savedCombo.id, createComboDto);
      console.log('Products and images added to combo');
      
      return savedCombo;
    } catch (error) {
      console.error('Error creating combo:', error);
      throw error;
    }
  }

  async update(id: string, updateComboDto: any) {
    try {
      console.log('Updating combo:', id, 'with data:', updateComboDto);
      
      // Update slug if name changed
      const updateData: any = {
        name: updateComboDto.name,
        description: updateComboDto.description || null,
        discount_percentage: updateComboDto.discount_percentage || 0,
        combo_price: updateComboDto.combo_price || null,
        image_url: updateComboDto.image_url || this.normalizeComboImages(updateComboDto)[0] || null,
        display_position: updateComboDto.display_position || null,
        expires_at: updateComboDto.expires_at || null,
        is_active: updateComboDto.status === 'active'
      };
      
      if (updateComboDto.name) {
        let slug = updateComboDto.name
          .toLowerCase()
          .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')  // Keep Bengali characters
          .replace(/^-+|-+$/g, '');
        
        // If slug is empty or only Bengali chars, use timestamp
        if (!slug || !/[a-z0-9]/.test(slug)) {
          slug = `combo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        }
        updateData.slug = slug;
      }

      console.log('Update data prepared:', updateData);
      
      // First update the combo details
      const result = await this.comboDealsRepository.update(parseInt(id), updateData);
      console.log('Update result:', result);
      
      // Update combo products if provided
      if (updateComboDto.product_ids !== undefined || updateComboDto.product_items !== undefined) {
        console.log('Updating combo products:', updateComboDto.product_items || updateComboDto.product_ids);
        
        // Delete existing products
        await this.comboDealsRepository.query(`
          DELETE FROM combo_deal_products WHERE combo_deal_id = $1
        `, [parseInt(id)]);
        console.log('Deleted existing products');
        
        // Add new products
        await this.syncComboProducts(parseInt(id), updateComboDto);
        console.log('Added new products');
      }

      if (updateComboDto.image_urls !== undefined || updateComboDto.images !== undefined || updateComboDto.image_url !== undefined) {
        await this.syncComboImages(parseInt(id), updateComboDto);
      }
      
      // Fetch and return updated combo with products
      const updatedResults = await this.comboDealsRepository.query(`
        SELECT cd.*, 
               CASE WHEN cd.is_active THEN 'active' ELSE 'inactive' END as status,
               ${this.getComboProductSelect()}
        FROM combo_deals cd
        LEFT JOIN combo_deal_products cdp ON cd.id = cdp.combo_deal_id
        LEFT JOIN products p ON cdp.product_id = p.id
        WHERE cd.id = $1
        GROUP BY cd.id
      `, [parseInt(id)]);
      
      console.log('Updated combo with products:', updatedResults[0]);
      return updatedResults[0];
    } catch (error: any) {
      console.error('Error updating combo deal:', error);
      console.error('Error message:', error?.message);
      console.error('Error detail:', error?.detail);
      console.error('Error code:', error?.code);
      console.error('Error stack:', error?.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      // First delete associated products from combo_deal_products
      await this.comboDealsRepository.query(`
        DELETE FROM combo_deal_products WHERE combo_deal_id = $1
      `, [parseInt(id)]);
      
      // Then hard delete the combo deal
      await this.comboDealsRepository.query(`
        DELETE FROM combo_deals WHERE id = $1
      `, [parseInt(id)]);
      
      return { message: 'Combo deal deleted successfully' };
    } catch (error) {
      console.error('Error deleting combo deal:', error);
      throw error;
    }
  }
}
