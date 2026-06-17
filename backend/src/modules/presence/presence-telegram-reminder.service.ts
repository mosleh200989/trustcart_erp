import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { In, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { PresenceSettings } from './entities/presence-settings.entity';
import { PresenceTelegramNotification } from './entities/presence-telegram-notification.entity';
import { UserOfficeTime } from './entities/user-office-time.entity';
import { UserPresenceStatus } from './entities/user-presence-status.entity';

type ReminderKind = 'offline_reminder' | 'online_thank_you';

@Injectable()
export class PresenceTelegramReminderService implements OnModuleInit {
  private readonly logger = new Logger(PresenceTelegramReminderService.name);
  private running = false;

  constructor(
    @InjectRepository(PresenceSettings)
    private readonly settingsRepo: Repository<PresenceSettings>,
    @InjectRepository(UserOfficeTime)
    private readonly officeTimeRepo: Repository<UserOfficeTime>,
    @InjectRepository(UserPresenceStatus)
    private readonly statusRepo: Repository<UserPresenceStatus>,
    @InjectRepository(PresenceTelegramNotification)
    private readonly notificationRepo: Repository<PresenceTelegramNotification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  onModuleInit() {
    this.logger.log(`PresenceTelegramReminderService initialized. ENABLE_BACKGROUND_JOBS=${process.env.ENABLE_BACKGROUND_JOBS}`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processOfficeStartReminders() {
    if (process.env.ENABLE_BACKGROUND_JOBS !== 'true') {
      return;
    }
    if (this.running) return;
    this.running = true;
    try {
      await this.processDueReminders();
    } catch (err: any) {
      this.logger.warn(`Presence Telegram reminder job failed: ${err?.message || err}`);
    } finally {
      this.running = false;
    }
  }

  private async processDueReminders() {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings?.telegramRemindersEnabled) return;

    const botToken = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (!botToken) {
      this.logger.warn('Presence Telegram reminders are enabled but TELEGRAM_BOT_TOKEN is missing.');
      return;
    }

    const timezone = settings.timezone || 'Asia/Dhaka';
    const now = new Date();
    const dateKey = this.dateKey(now, timezone);
    const currentMinutes = this.timeToMinutes(
      now.toLocaleTimeString('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }),
    );
    const leadMinutes = Math.max(1, Math.min(120, Number(settings.telegramReminderLeadMinutes || 5)));

    const users = await this.userRepo.find({
      where: { isDeleted: false, status: 'active' } as any,
      order: { name: 'ASC', lastName: 'ASC' } as any,
    });
    const userIds = users.map((user) => Number(user.id));
    if (userIds.length === 0) return;

    const officeRows = await this.officeTimeRepo.find({ where: { userId: In(userIds) } as any });
    const officeByUser = new Map(officeRows.map((row) => [Number(row.userId), row]));
    const statuses = await this.statusRepo.find({ where: { userId: In(userIds) } as any });
    const statusByUser = new Map(statuses.map((row) => [Number(row.userId), row]));

    const due: Array<{
      user: User;
      officeTime: UserOfficeTime;
      kind: ReminderKind;
      message: string;
    }> = [];

    for (const user of users) {
      const userId = Number(user.id);
      const officeTime = officeByUser.get(userId);
      const telegramChatId = String(officeTime?.telegramChatId || '').trim();
      if (!officeTime || !telegramChatId) continue;

      const startTime = officeTime.officeStartTime || settings.officeStartTime || '09:00';
      const startMinutes = this.timeToMinutes(startTime);
      const status = statusByUser.get(userId);
      const isOnline = status?.state === 'online';
      const name = [user.name, user.lastName].filter(Boolean).join(' ').trim() || user.email || `User #${userId}`;

      const reminderMinutes = (startMinutes - leadMinutes + 24 * 60) % (24 * 60);

      if (currentMinutes === reminderMinutes && !isOnline) {
        due.push({
          user,
          officeTime,
          kind: 'offline_reminder',
          message: this.renderMessage(settings.telegramOfflineReminderMessage, { name, startTime, dateKey }),
        });
      }

      if (currentMinutes === startMinutes && isOnline) {
        due.push({
          user,
          officeTime,
          kind: 'online_thank_you',
          message: this.renderMessage(settings.telegramOnlineThankYouMessage, { name, startTime, dateKey }),
        });
      }
    }

    for (const item of due) {
      await this.sendOnce(botToken, dateKey, item);
      await this.delay(250);
    }
  }

  private async sendOnce(
    botToken: string,
    dateKey: string,
    item: { user: User; officeTime: UserOfficeTime; kind: ReminderKind; message: string },
  ) {
    const userId = Number(item.user.id);
    const telegramChatId = String(item.officeTime.telegramChatId || '').trim();
    const existing = await this.notificationRepo.findOne({ where: { userId, dateKey, kind: item.kind } });
    if (existing) return;

    const row = await this.notificationRepo.save(
      this.notificationRepo.create({
        userId,
        dateKey,
        kind: item.kind,
        telegramChatId,
        message: item.message,
        status: 'pending',
      }),
    );

    try {
      await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: telegramChatId,
          text: item.message,
          disable_web_page_preview: true,
        },
        { timeout: 15000 },
      );
      row.status = 'sent';
      row.sentAt = new Date();
      row.errorMessage = null;
      await this.notificationRepo.save(row);
    } catch (err: any) {
      row.status = 'failed';
      row.errorMessage = err?.response?.data?.description || err?.message || 'Telegram send failed';
      await this.notificationRepo.save(row);
      this.logger.warn(`Telegram ${item.kind} failed for user ${userId}: ${row.errorMessage}`);
    }
  }

  private renderMessage(template: string, values: { name: string; startTime: string; dateKey: string }) {
    return String(template || '')
      .replace(/\{name\}/g, values.name)
      .replace(/\{startTime\}/g, values.startTime)
      .replace(/\{date\}/g, values.dateKey);
  }

  private dateKey(date: Date, timezone: string) {
    return date.toLocaleDateString('en-CA', { timeZone: timezone });
  }

  private timeToMinutes(value: string) {
    const [h, m] = String(value || '00:00').split(':').map((part) => Number(part));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
