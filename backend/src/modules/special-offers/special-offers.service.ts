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
