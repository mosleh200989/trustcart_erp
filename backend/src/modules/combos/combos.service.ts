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

  async findAll() {
    try {
      const results = await this.comboDealsRepository.query(`
        SELECT cd.*, 
               ARRAY_AGG(
                 DISTINCT jsonb_build_object(
                   'id', p.id,
                   'name_en', p.name_en,
                   'name_bn', p.name_bn,
                   'slug', p.slug,
                   'image_url', p.image_url,
                   'base_price', p.base_price
                 )
               ) FILTER (WHERE p.id IS NOT NULL) as products
        FROM combo_deals cd
        LEFT JOIN combo_deal_products cdp ON cd.id = cdp.combo_deal_id
        LEFT JOIN products p ON cdp.product_id = p.id
        WHERE cd.is_active = TRUE
          AND (cd.expires_at IS NULL OR cd.expires_at > NOW())
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
               ARRAY_AGG(
                 DISTINCT jsonb_build_object(
                   'id', p.id,
                   'name_en', p.name_en,
                   'name_bn', p.name_bn,
                   'slug', p.slug,
                   'image_url', p.image_url,
                   'base_price', p.base_price
                 )
               ) FILTER (WHERE p.id IS NOT NULL) as products
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
      
      // Generate slug from name
      const slug = createComboDto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      const combo = this.comboDealsRepository.create({
        name: createComboDto.name,
        slug,
        description: createComboDto.description || null,
        discount_percentage: createComboDto.discount_percentage || 0,
        image_url: createComboDto.image_url || null,
        display_position: createComboDto.display_position || null,
        is_active: createComboDto.status === 'active'
      });
      
      const savedCombo = await this.comboDealsRepository.save(combo);
      console.log('Combo saved:', savedCombo.id);
      
      // Add products to combo
      if (createComboDto.product_ids && Array.isArray(createComboDto.product_ids) && createComboDto.product_ids.length > 0) {
        console.log('Adding products to combo:', createComboDto.product_ids);
        for (const productId of createComboDto.product_ids) {
          await this.comboDealsRepository.query(`
            INSERT INTO combo_deal_products (combo_deal_id, product_id)
            VALUES ($1, $2)
            ON CONFLICT (combo_deal_id, product_id) DO NOTHING
          `, [savedCombo.id, productId]);
        }
        console.log('Products added to combo');
      }
      
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
        image_url: updateComboDto.image_url || null,
        display_position: updateComboDto.display_position || null,
        is_active: updateComboDto.status === 'active'
      };
      
      if (updateComboDto.name) {
        updateData.slug = updateComboDto.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      console.log('Update data prepared:', updateData);
      
      // First update the combo details
      const result = await this.comboDealsRepository.update(parseInt(id), updateData);
      console.log('Update result:', result);
      
      // Update combo products if provided
      if (updateComboDto.product_ids !== undefined) {
        console.log('Updating combo products:', updateComboDto.product_ids);
        
        // Delete existing products
        await this.comboDealsRepository.query(`
          DELETE FROM combo_deal_products WHERE combo_deal_id = $1
        `, [parseInt(id)]);
        console.log('Deleted existing products');
        
        // Add new products
        if (Array.isArray(updateComboDto.product_ids) && updateComboDto.product_ids.length > 0) {
          for (const productId of updateComboDto.product_ids) {
            await this.comboDealsRepository.query(`
              INSERT INTO combo_deal_products (combo_deal_id, product_id)
              VALUES ($1, $2)
              ON CONFLICT (combo_deal_id, product_id) DO NOTHING
            `, [parseInt(id), productId]);
          }
          console.log('Added new products');
        }
      }
      
      // Fetch and return updated combo with products
      const updatedResults = await this.comboDealsRepository.query(`
        SELECT cd.*, 
               ARRAY_AGG(
                 DISTINCT jsonb_build_object(
                   'id', p.id,
                   'name_en', p.name_en,
                   'name_bn', p.name_bn,
                   'slug', p.slug,
                   'image_url', p.image_url,
                   'base_price', p.base_price
                 )
               ) FILTER (WHERE p.id IS NOT NULL) as products
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
      // Soft delete by setting is_active to false
      await this.comboDealsRepository.update(parseInt(id), { is_active: false });
      return { message: 'Combo deal deleted successfully' };
    } catch (error) {
      console.error('Error deleting combo deal:', error);
      throw error;
    }
  }
}
