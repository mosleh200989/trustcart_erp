import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './banner.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private bannersRepository: Repository<Banner>,
  ) {}

  async findAll(): Promise<Banner[]> {
    return this.bannersRepository.find({
      order: {
        banner_type: 'ASC',
        display_order: 'ASC',
      },
    });
  }

  async findActive(): Promise<Banner[]> {
    const now = new Date();
    
    return this.bannersRepository
      .createQueryBuilder('banner')
      .where('banner.is_active = :isActive', { isActive: true })
      .andWhere(
        '(banner.start_date IS NULL OR banner.start_date <= :now)',
        { now }
      )
      .andWhere(
        '(banner.end_date IS NULL OR banner.end_date >= :now)',
        { now }
      )
      .orderBy('banner.banner_type', 'ASC')
      .addOrderBy('banner.display_order', 'ASC')
      .getMany();
  }

  async findByType(type: string): Promise<Banner[]> {
    const now = new Date();
    
    return this.bannersRepository
      .createQueryBuilder('banner')
      .where('banner.is_active = :isActive', { isActive: true })
      .andWhere('banner.banner_type = :type', { type })
      .andWhere(
        '(banner.start_date IS NULL OR banner.start_date <= :now)',
        { now }
      )
      .andWhere(
        '(banner.end_date IS NULL OR banner.end_date >= :now)',
        { now }
      )
      .orderBy('banner.display_order', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<Banner | null> {
    return this.bannersRepository.findOne({ where: { id } });
  }

  async create(bannerData: Partial<Banner>): Promise<Banner> {
    // Shift existing banners with same or greater display_order
    if (bannerData.display_order !== undefined) {
      await this.shiftDisplayOrders(bannerData.display_order, bannerData.banner_type);
    }
    
    const banner = this.bannersRepository.create({
      ...bannerData,
      uuid: uuidv4(),
    });
    return this.bannersRepository.save(banner);
  }

  async update(id: number, bannerData: Partial<Banner>): Promise<Banner | null> {
    // If display_order is being changed, shift other banners
    if (bannerData.display_order !== undefined) {
      const existingBanner = await this.findOne(id);
      if (existingBanner && existingBanner.display_order !== bannerData.display_order) {
        await this.shiftDisplayOrders(bannerData.display_order, bannerData.banner_type || existingBanner.banner_type, id);
      }
    }
    
    await this.bannersRepository.update(id, bannerData);
    return this.findOne(id);
  }

  /**
   * Shift display_order of banners >= the given order by +1
   * Optionally exclude a specific banner ID (useful for updates)
   */
  private async shiftDisplayOrders(fromOrder: number, bannerType?: string, excludeId?: number): Promise<void> {
    let query = this.bannersRepository
      .createQueryBuilder()
      .update(Banner)
      .set({ display_order: () => 'display_order + 1' })
      .where('display_order >= :fromOrder', { fromOrder });
    
    if (bannerType) {
      query = query.andWhere('banner_type = :bannerType', { bannerType });
    }
    
    if (excludeId) {
      query = query.andWhere('id != :excludeId', { excludeId });
    }
    
    await query.execute();
  }

  async remove(id: number): Promise<void> {
    await this.bannersRepository.delete(id);
  }

  async toggleActive(id: number): Promise<Banner | null> {
    const banner = await this.findOne(id);
    if (banner) {
      banner.is_active = !banner.is_active;
      return this.bannersRepository.save(banner);
    }
    return null;
  }

  async updateDisplayOrder(updates: Array<{ id: number; display_order: number }>): Promise<void> {
    for (const update of updates) {
      await this.bannersRepository.update(update.id, { display_order: update.display_order });
    }
  }
}
