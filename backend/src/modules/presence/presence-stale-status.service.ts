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
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.presenceService.autoCheckoutAfterOfficeEnd();
      if (result.checkedOut > 0) {
        this.logger.log(`Automatically checked out ${result.checkedOut} employee(s) after office end time`);
      }

      // The old idle timeout remains an explicit emergency-only option.
      if (
        process.env.ENABLE_BACKGROUND_JOBS === 'true' &&
        String(process.env.PRESENCE_AUTO_EXPIRE_ENABLED || '').toLowerCase() === 'true'
      ) {
        await this.presenceService.expireStaleOnlineStatuses();
      }
    } catch (err: any) {
      this.logger.warn(`Presence automation job failed: ${err?.message || err}`);
    } finally {
      this.running = false;
    }
  }
}
