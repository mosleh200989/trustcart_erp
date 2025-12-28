import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
  ) {}

  async create(data: Partial<Activity>): Promise<Activity> {
    const activity = this.activityRepository.create(data);
    return await this.activityRepository.save(activity);
  }

  async findAll(filters?: any): Promise<Activity[]> {
    const query = this.activityRepository.createQueryBuilder('activity')
      .leftJoinAndSelect('activity.customer', 'customer')
      .leftJoinAndSelect('activity.user', 'user')
      .leftJoinAndSelect('activity.deal', 'deal');

    if (filters?.customerId) {
      query.andWhere('activity.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.dealId) {
      query.andWhere('activity.dealId = :dealId', { dealId: filters.dealId });
    }

    if (filters?.userId) {
      query.andWhere('activity.userId = :userId', { userId: filters.userId });
    }

    if (filters?.type) {
      query.andWhere('activity.type = :type', { type: filters.type });
    }

    query.orderBy('activity.createdAt', 'DESC');

    return await query.getMany();
  }

  async findOne(id: number): Promise<Activity | null> {
    return await this.activityRepository.findOne({
      where: { id },
      relations: ['customer', 'user', 'deal'],
    });
  }

  async update(id: number, data: Partial<Activity>): Promise<Activity | null> {
    await this.activityRepository.update(id, data);
    return await this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.activityRepository.delete(id);
  }

  async getActivityStats(userId?: number): Promise<any> {
    const query = this.activityRepository.createQueryBuilder('activity')
      .select('activity.type', 'type')
      .addSelect('COUNT(*)', 'count');

    if (userId) {
      query.where('activity.userId = :userId', { userId });
    }

    query.groupBy('activity.type');

    return await query.getRawMany();
  }
}
