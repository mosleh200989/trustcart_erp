import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PresenceService } from './presence.service';

@Injectable()
export class PresenceStaleStatusService implements OnModuleInit {
  private readonly logger = new Logger(PresenceStaleStatusService.name);
  private running = false;

  constructor(private readonly presenceService: PresenceService) {}

  onModuleInit() {
    this.logger.log('Starting onModuleInit for PresenceStaleStatusService');
    this.logger.log(`PresenceStaleStatusService initialized. ENABLE_BACKGROUND_JOBS=${process.env.ENABLE_BACKGROUND_JOBS}`);
    this.logger.log('Finished onModuleInit for PresenceStaleStatusService');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async markIdleUsersOffline() {
    // Check-in/out is intentionally manual now. Keep the old expiry path
    // available only for an explicit emergency opt-in.
    if (process.env.ENABLE_BACKGROUND_JOBS !== 'true') {
      return;
    }
    if (String(process.env.PRESENCE_AUTO_EXPIRE_ENABLED || '').toLowerCase() !== 'true') {
      return;
    }
    if (this.running) return;
    this.running = true;
    try {
      await this.presenceService.expireStaleOnlineStatuses();
    } catch (err: any) {
      this.logger.warn(`Presence idle timeout job failed: ${err?.message || err}`);
    } finally {
      this.running = false;
    }
  }
}
