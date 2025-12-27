import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from './entities/quote.entity';

@Injectable()
export class QuoteService {
  constructor(
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
  ) {}

  async create(data: Partial<Quote>): Promise<Quote> {
    // Generate quote number
    const count = await this.quoteRepository.count();
    data.quoteNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const quote = this.quoteRepository.create(data);
    return await this.quoteRepository.save(quote);
  }

  async findAll(filters?: any): Promise<Quote[]> {
    const query = this.quoteRepository.createQueryBuilder('quote')
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.deal', 'deal')
      .leftJoinAndSelect('quote.creator', 'creator');

    if (filters?.customerId) {
      query.andWhere('quote.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.dealId) {
      query.andWhere('quote.dealId = :dealId', { dealId: filters.dealId });
    }

    if (filters?.status) {
      query.andWhere('quote.status = :status', { status: filters.status });
    }

    query.orderBy('quote.createdAt', 'DESC');

    return await query.getMany();
  }

  async findOne(id: number): Promise<Quote | null> {
    return await this.quoteRepository.findOne({
      where: { id },
      relations: ['customer', 'deal', 'creator'],
    });
  }

  async findByNumber(quoteNumber: string): Promise<Quote | null> {
    return await this.quoteRepository.findOne({
      where: { quoteNumber },
      relations: ['customer', 'deal', 'creator'],
    });
  }

  async update(id: number, data: Partial<Quote>): Promise<Quote | null> {
    await this.quoteRepository.update(id, data);
    return await this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.quoteRepository.delete(id);
  }

  async markAsSent(id: number): Promise<Quote | null> {
    return await this.update(id, {
      status: 'sent',
      sentAt: new Date(),
    });
  }

  async markAsViewed(id: number): Promise<Quote | null> {
    const quote = await this.findOne(id);
    if (quote && !quote.viewedAt) {
      return await this.update(id, {
        viewedAt: new Date(),
      });
    }
    return quote;
  }

  async markAsAccepted(id: number): Promise<Quote | null> {
    return await this.update(id, {
      status: 'accepted',
      acceptedAt: new Date(),
    });
  }

  async markAsRejected(id: number): Promise<Quote | null> {
    return await this.update(id, {
      status: 'rejected',
    });
  }
}
