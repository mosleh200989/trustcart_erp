import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deal } from './entities/deal.entity';

@Injectable()
export class DealService {
  constructor(
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
  ) {}

  async create(data: Partial<Deal>): Promise<Deal> {
    const deal = this.dealRepository.create(data);
    return await this.dealRepository.save(deal);
  }

  async findAll(filters?: any): Promise<Deal[]> {
    const query = this.dealRepository.createQueryBuilder('deal')
      .leftJoinAndSelect('deal.customer', 'customer')
      .leftJoinAndSelect('deal.owner', 'owner');

    if (filters?.ownerId) {
      query.andWhere('deal.ownerId = :ownerId', { ownerId: filters.ownerId });
    }

    if (filters?.status) {
      query.andWhere('deal.status = :status', { status: filters.status });
    }

    if (filters?.stage) {
      query.andWhere('deal.stage = :stage', { stage: filters.stage });
    }

    if (filters?.priority) {
      query.andWhere('deal.priority = :priority', { priority: filters.priority });
    }

    query.orderBy('deal.createdAt', 'DESC');

    return await query.getMany();
  }

  async findOne(id: number): Promise<Deal | null> {
    return await this.dealRepository.findOne({
      where: { id },
      relations: ['customer', 'owner'],
    });
  }

  async update(id: number, data: Partial<Deal>): Promise<Deal | null> {
    await this.dealRepository.update(id, data);
    return await this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.dealRepository.delete(id);
  }

  async getPipelineStats(ownerId?: number): Promise<any> {
    let query = this.dealRepository.createQueryBuilder('deal')
      .select('deal.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(deal.value)', 'totalValue')
      .where('deal.status = :status', { status: 'open' });

    if (ownerId) {
      query.andWhere('deal.ownerId = :ownerId', { ownerId });
    }

    query.groupBy('deal.stage');

    return await query.getRawMany();
  }

  async getWinRateStats(ownerId?: number): Promise<any> {
    const baseQuery = this.dealRepository.createQueryBuilder('deal');

    if (ownerId) {
      baseQuery.where('deal.ownerId = :ownerId', { ownerId });
    }

    const [won, lost, total] = await Promise.all([
      baseQuery.clone().where('deal.status = :status', { status: 'won' }).getCount(),
      baseQuery.clone().where('deal.status = :status', { status: 'lost' }).getCount(),
      baseQuery.clone().where('deal.status IN (:...statuses)', { statuses: ['won', 'lost'] }).getCount(),
    ]);

    return {
      won,
      lost,
      total,
      winRate: total > 0 ? (won / total) * 100 : 0,
    };
  }
}
