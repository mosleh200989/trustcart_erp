import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmNotification } from './entities/crm-notification.entity';

@Injectable()
export class CrmNotificationsService {
  constructor(
    @InjectRepository(CrmNotification)
    private readonly repo: Repository<CrmNotification>,
  ) {}

  /** Insert a new notification for a specific user. */
  async create(
    userId: number,
    type: string,
    title: string,
    body?: string,
    metadata?: Record<string, any>,
  ): Promise<CrmNotification> {
    const notif = this.repo.create({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      metadata: metadata ?? {},
      is_read: false,
    });
    return this.repo.save(notif);
  }

  /**
   * Return all unread notifications for a user, plus up to 20 recent read ones,
   * sorted newest-first. Total capped at 50.
   */
  async getForUser(userId: number): Promise<CrmNotification[]> {
    return this.repo
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC')
      .take(50)
      .getMany();
  }

  async markRead(notificationId: number, userId: number): Promise<void> {
    await this.repo.update({ id: notificationId, user_id: userId }, { is_read: true });
  }

  async markAllRead(userId: number): Promise<void> {
    await this.repo.update({ user_id: userId, is_read: false }, { is_read: true });
  }

  /** Count unread notifications for a user */
  async unreadCount(userId: number): Promise<number> {
    return this.repo.count({ where: { user_id: userId, is_read: false } });
  }

  /** Prune notifications older than 60 days for a given user. */
  async pruneOld(userId: number): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    await this.repo
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId AND created_at < :cutoff', { userId, cutoff })
      .execute();
  }
}
