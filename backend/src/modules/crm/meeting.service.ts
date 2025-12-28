import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './entities/meeting.entity';

@Injectable()
export class MeetingService {
  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
  ) {}

  async create(data: Partial<Meeting>): Promise<Meeting> {
    const meeting = this.meetingRepository.create(data);
    return await this.meetingRepository.save(meeting);
  }

  async findAll(filters?: any): Promise<Meeting[]> {
    const query = this.meetingRepository.createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.customer', 'customer')
      .leftJoinAndSelect('meeting.deal', 'deal')
      .leftJoinAndSelect('meeting.organizer', 'organizer');

    if (filters?.customerId) {
      query.andWhere('meeting.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.dealId) {
      query.andWhere('meeting.dealId = :dealId', { dealId: filters.dealId });
    }

    if (filters?.organizerId) {
      query.andWhere('meeting.organizerId = :organizerId', { organizerId: filters.organizerId });
    }

    if (filters?.status) {
      query.andWhere('meeting.status = :status', { status: filters.status });
    }

    if (filters?.upcoming) {
      query.andWhere('meeting.startTime > :now', { now: new Date() })
        .andWhere('meeting.status = :status', { status: 'scheduled' });
    }

    query.orderBy('meeting.startTime', 'ASC');

    return await query.getMany();
  }

  async findOne(id: number): Promise<Meeting | null> {
    return await this.meetingRepository.findOne({
      where: { id },
      relations: ['customer', 'deal', 'organizer'],
    });
  }

  async update(id: number, data: Partial<Meeting>): Promise<Meeting | null> {
    await this.meetingRepository.update(id, data);
    return await this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.meetingRepository.delete(id);
  }

  async complete(id: number, data: { meetingNotes?: string; outcomeRating?: number; nextSteps?: string; actionItems?: any[] }): Promise<Meeting | null> {
    return await this.update(id, {
      status: 'completed',
      ...data,
    });
  }

  async cancel(id: number): Promise<Meeting | null> {
    return await this.update(id, {
      status: 'cancelled',
    });
  }
}
