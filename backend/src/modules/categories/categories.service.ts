import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({
      order: {
        display_order: 'ASC',
      },
    });
  }

  async findActive(): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { is_active: true },
      order: {
        display_order: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Category | null> {
    return this.categoriesRepository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoriesRepository.findOne({ where: { slug } });
  }

  async create(categoryData: Partial<Category>): Promise<Category> {
    // Shift existing categories with same or greater display_order
    if (categoryData.display_order !== undefined) {
      await this.shiftDisplayOrders(categoryData.display_order);
    }
    
    const category = this.categoriesRepository.create(categoryData);
    return this.categoriesRepository.save(category);
  }

  async update(id: number, categoryData: Partial<Category>): Promise<Category | null> {
    // If display_order is being changed, shift other categories
    if (categoryData.display_order !== undefined) {
      const existingCategory = await this.findOne(id);
      if (existingCategory && existingCategory.display_order !== categoryData.display_order) {
        await this.shiftDisplayOrders(categoryData.display_order, id);
      }
    }
    
    await this.categoriesRepository.update(id, categoryData);
    return this.findOne(id);
  }

  /**
   * Shift display_order of categories >= the given order by +1
   * Optionally exclude a specific category ID (useful for updates)
   */
  private async shiftDisplayOrders(fromOrder: number, excludeId?: number): Promise<void> {
    let query = this.categoriesRepository
      .createQueryBuilder()
      .update(Category)
      .set({ display_order: () => 'display_order + 1' })
      .where('display_order >= :fromOrder', { fromOrder });
    
    if (excludeId) {
      query = query.andWhere('id != :excludeId', { excludeId });
    }
    
    await query.execute();
  }

  async remove(id: number): Promise<void> {
    await this.categoriesRepository.delete(id);
  }
}
