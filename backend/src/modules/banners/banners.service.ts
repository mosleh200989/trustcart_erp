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
    const banner = this.bannersRepository.create({
      ...bannerData,
      uuid: uuidv4(),
    });
    return this.bannersRepository.save(banner);
  }

  async update(id: number, bannerData: Partial<Banner>): Promise<Banner | null> {
    await this.bannersRepository.update(id, bannerData);
    return this.findOne(id);
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
