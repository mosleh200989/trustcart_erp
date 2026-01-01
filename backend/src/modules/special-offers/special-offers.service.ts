import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpecialOffer } from './special-offer.entity';

@Injectable()
export class SpecialOffersService {
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
    return this.specialOffersRepository.findOne({
      where: {
        context: 'thank_you',
        ...(includeInactive ? {} : { is_active: true }),
      } as any,
      order: { updated_at: 'DESC', created_at: 'DESC' } as any,
    });
  }

  async upsertThankYouOffer(offerData: Partial<SpecialOffer>): Promise<SpecialOffer> {
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

  async findOne(id: number): Promise<SpecialOffer | null> {
    return this.specialOffersRepository.findOne({ where: { id } });
  }

  async create(offerData: Partial<SpecialOffer>): Promise<SpecialOffer> {
    const offer = this.specialOffersRepository.create(offerData);
    return this.specialOffersRepository.save(offer);
  }

  async update(id: number, offerData: Partial<SpecialOffer>): Promise<SpecialOffer | null> {
    await this.specialOffersRepository.update(id, offerData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.specialOffersRepository.delete(id);
  }
}
