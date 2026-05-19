import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PresenceService } from './presence.service';

@Injectable()
export class PresenceStaleStatusService {
  private readonly logger = new Logger(PresenceStaleStatusService.name);
  private running = false;

  constructor(private readonly presenceService: PresenceService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async markIdleUsersOffline() {
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
