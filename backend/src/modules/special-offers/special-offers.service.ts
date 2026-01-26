import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpecialOffer } from './special-offer.entity';

@Injectable()
export class SpecialOffersService {
  private readonly logger = new Logger(SpecialOffersService.name);

  constructor(
    @InjectRepository(SpecialOffer)
    private specialOffersRepository: Repository<SpecialOffer>,
  ) {}

  async findAll(): Promise<SpecialOffer[]> {
    return this.specialOffersRepository.find({
      order: { display_order: 'ASC', created_at: 'DESC' }
    });
  }

  async findActive(): Promise<SpecialOffer[]> {
    return this.specialOffersRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC', created_at: 'DESC' }
    });
  }

  async findThankYouOffer(includeInactive = false): Promise<SpecialOffer | null> {
    try {
      // First, check if the context column exists
      const hasContextColumn = await this.checkContextColumnExists();
      
      if (!hasContextColumn) {
        this.logger.warn('context column does not exist in special_offers table. Run the migration: 2026-01-01_thank_you_offer_upsell.sql');
        return null;
      }

      return this.specialOffersRepository.findOne({
        where: {
          context: 'thank_you',
          ...(includeInactive ? {} : { is_active: true }),
        } as any,
        order: { updated_at: 'DESC', created_at: 'DESC' } as any,
      });
    } catch (error: any) {
      this.logger.error('Error fetching thank you offer:', error?.message || error);
      return null;
    }
  }

  async upsertThankYouOffer(offerData: Partial<SpecialOffer>): Promise<SpecialOffer> {
    // Check if context column exists
    const hasContextColumn = await this.checkContextColumnExists();
    
    if (!hasContextColumn) {
      throw new Error('context column does not exist in special_offers table. Please run the migration: 2026-01-01_thank_you_offer_upsell.sql');
    }

    const existing = await this.specialOffersRepository.findOne({
      where: { context: 'thank_you' } as any,
      order: { updated_at: 'DESC', created_at: 'DESC' } as any,
    });

    if (existing) {
      const merged = this.specialOffersRepository.merge(existing, {
        ...offerData,
        context: 'thank_you',
      });
      return this.specialOffersRepository.save(merged);
    }

    const created = this.specialOffersRepository.create({
      ...offerData,
      context: 'thank_you',
    });
    return this.specialOffersRepository.save(created);
  }

  private async checkContextColumnExists(): Promise<boolean> {
    try {
      const result = await this.specialOffersRepository.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'special_offers' AND column_name = 'context'
        LIMIT 1
      `);
      return result && result.length > 0;
    } catch {
      return false;
    }
  }

  async findOne(id: number): Promise<SpecialOffer | null> {
    return this.specialOffersRepository.findOne({ where: { id } });
  }

  async create(offerData: Partial<SpecialOffer>): Promise<SpecialOffer> {
    // Shift existing offers with same or greater display_order
    if (offerData.display_order !== undefined) {
      await this.shiftDisplayOrders(offerData.display_order);
    }
    
    const offer = this.specialOffersRepository.create(offerData);
    return this.specialOffersRepository.save(offer);
  }

  async update(id: number, offerData: Partial<SpecialOffer>): Promise<SpecialOffer | null> {
    // If display_order is being changed, shift other offers
    if (offerData.display_order !== undefined) {
      const existingOffer = await this.findOne(id);
      if (existingOffer && existingOffer.display_order !== offerData.display_order) {
        await this.shiftDisplayOrders(offerData.display_order, id);
      }
    }
    
    await this.specialOffersRepository.update(id, offerData);
    return this.findOne(id);
  }

  /**
   * Shift display_order of offers >= the given order by +1
   * Optionally exclude a specific offer ID (useful for updates)
   */
  private async shiftDisplayOrders(fromOrder: number, excludeId?: number): Promise<void> {
    let query = this.specialOffersRepository
      .createQueryBuilder()
      .update(SpecialOffer)
      .set({ display_order: () => 'display_order + 1' })
      .where('display_order >= :fromOrder', { fromOrder });
    
    if (excludeId) {
      query = query.andWhere('id != :excludeId', { excludeId });
    }
    
    await query.execute();
  }

  async remove(id: number): Promise<void> {
    await this.specialOffersRepository.delete(id);
  }
}
