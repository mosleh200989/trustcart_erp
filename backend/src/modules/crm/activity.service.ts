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

  async createCustomerNote(data: { customerId: number; userId: number; note: string; subject?: string }): Promise<Activity> {
    return this.create({
      type: 'note',
      customerId: data.customerId,
      userId: data.userId,
      subject: data.subject || 'Customer Note',
      description: data.note,
      notes: data.note,
      completedAt: new Date(),
    });
  }

  async findCustomerNotes(customerId: number): Promise<Activity[]> {
    return await this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.customerId = :customerId', { customerId })
      .andWhere('activity.type = :type', { type: 'note' })
      .orderBy('activity.createdAt', 'DESC')
      .getMany();
  }

  async updateCustomerNote(id: number, data: { note?: string; subject?: string }): Promise<Activity | null> {
    const update: Partial<Activity> = {};
    if (data.note !== undefined) {
      update.description = data.note;
      update.notes = data.note;
    }
    if (data.subject !== undefined) {
      update.subject = data.subject;
    }
    await this.activityRepository.update({ id, type: 'note' }, update);
    return this.findOne(id);
  }

  async deleteCustomerNote(id: number): Promise<void> {
    await this.activityRepository.delete({ id, type: 'note' });
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

  async getRecentActivities(params?: { userId?: number; rangeDays?: number; limit?: number }) {
    const safeLimit = Number.isFinite(params?.limit) ? Math.max(1, Math.min(2000, Number(params?.limit))) : 10;
    const safeRangeDays = Number.isFinite(params?.rangeDays)
      ? Math.max(1, Math.min(3650, Number(params?.rangeDays)))
      : undefined;

    const query = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.customer', 'customer')
      .leftJoinAndSelect('activity.user', 'user')
      .leftJoinAndSelect('activity.deal', 'deal')
      .orderBy('activity.createdAt', 'DESC')
      .take(safeLimit);

    if (params?.userId != null) {
      query.andWhere('activity.userId = :userId', { userId: Number(params.userId) });
    }

    if (safeRangeDays != null) {
      const since = new Date();
      since.setDate(since.getDate() - safeRangeDays);
      query.andWhere('activity.createdAt >= :since', { since });
    }

    return query.getMany();
  }
}
