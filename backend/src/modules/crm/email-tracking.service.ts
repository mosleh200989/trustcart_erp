import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTracking } from './entities/email-tracking.entity';

@Injectable()
export class EmailTrackingService {
  constructor(
    @InjectRepository(EmailTracking)
    private emailTrackingRepository: Repository<EmailTracking>,
  ) {}

  async create(data: Partial<EmailTracking>): Promise<EmailTracking> {
    const email = this.emailTrackingRepository.create(data);
    return await this.emailTrackingRepository.save(email);
  }

  async findAll(filters?: any): Promise<EmailTracking[]> {
    const query = this.emailTrackingRepository.createQueryBuilder('email')
      .leftJoinAndSelect('email.customer', 'customer')
      .leftJoinAndSelect('email.sender', 'sender');

    if (filters?.customerId) {
      query.andWhere('email.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.sentBy) {
      query.andWhere('email.sentBy = :sentBy', { sentBy: filters.sentBy });
    }

    query.orderBy('email.sentAt', 'DESC');

    return await query.getMany();
  }

  async findOne(id: number): Promise<EmailTracking | null> {
    return await this.emailTrackingRepository.findOne({
      where: { id },
      relations: ['customer', 'sender'],
    });
  }

  async markAsOpened(id: number): Promise<EmailTracking | null> {
    const email = await this.findOne(id);
    if (!email) return null;
    
    const now = new Date();

    const updates: any = {
      opened: true,
      openCount: (email.openCount || 0) + 1,
      lastOpenedAt: now,
    };

    if (!email.firstOpenedAt) {
      updates.firstOpenedAt = now;
    }

    await this.emailTrackingRepository.update(id, updates);
    return await this.findOne(id);
  }

  async markAsClicked(id: number, link: string): Promise<EmailTracking | null> {
    const email = await this.findOne(id);
    if (!email) return null;
    
    const clickedLinks = email.clickedLinks || [];
    
    if (!clickedLinks.includes(link)) {
      clickedLinks.push(link);
    }

    await this.emailTrackingRepository.update(id, {
      clicked: true,
      clickedLinks,
    });

    return await this.findOne(id);
  }

  async markAsReplied(id: number): Promise<EmailTracking | null> {
    await this.emailTrackingRepository.update(id, {
      replied: true,
      repliedAt: new Date(),
    });

    return await this.findOne(id);
  }

  async markAsBounced(id: number): Promise<EmailTracking | null> {
    await this.emailTrackingRepository.update(id, {
      bounced: true,
    });

    return await this.findOne(id);
  }

  async getEmailStats(userId?: number): Promise<any> {
    const baseQuery = this.emailTrackingRepository.createQueryBuilder('email');

    if (userId) {
      baseQuery.where('email.sentBy = :userId', { userId });
    }

    const [total, opened, clicked, replied, bounced] = await Promise.all([
      baseQuery.clone().getCount(),
      baseQuery.clone().where('email.opened = true').getCount(),
      baseQuery.clone().where('email.clicked = true').getCount(),
      baseQuery.clone().where('email.replied = true').getCount(),
      baseQuery.clone().where('email.bounced = true').getCount(),
    ]);

    return {
      total,
      opened,
      clicked,
      replied,
      bounced,
      openRate: total > 0 ? (opened / total) * 100 : 0,
      clickRate: total > 0 ? (clicked / total) * 100 : 0,
      replyRate: total > 0 ? (replied / total) * 100 : 0,
      bounceRate: total > 0 ? (bounced / total) * 100 : 0,
    };
  }
}
