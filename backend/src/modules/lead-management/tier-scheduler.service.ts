import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeadManagementService } from './lead-management.service';

/**
 * Kept for scheduler compatibility only. Tier assignment is manual.
 */
@Injectable()
export class TierSchedulerService {
  private readonly logger = new Logger(TierSchedulerService.name);

  constructor(private readonly leadManagementService: LeadManagementService) {}

  // Runs on the old schedule but intentionally skips automatic tier changes.
  @Cron('0 21 * * *', { timeZone: 'UTC' })
  async runNightlyTierSync(): Promise<void> {
    void this.leadManagementService;
    this.logger.log('[TierSync] Skipped. Customer tiers are managed manually.');
  }
}
