import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeadManagementService } from './lead-management.service';

/**
 * Kept for scheduler compatibility only. Tier assignment is manual.
 */
@Injectable()
export class TierSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(TierSchedulerService.name);

  constructor(private readonly leadManagementService: LeadManagementService) {}

  onModuleInit() {
    this.logger.log(`TierSchedulerService initialized. ENABLE_BACKGROUND_JOBS=${process.env.ENABLE_BACKGROUND_JOBS}`);
  }

  // Runs on the old schedule but intentionally skips automatic tier changes.
  @Cron('0 21 * * *', { timeZone: 'UTC' })
  async runNightlyTierSync(): Promise<void> {
    if (process.env.ENABLE_BACKGROUND_JOBS !== 'true') {
      return;
    }
    void this.leadManagementService;
    this.logger.log('[TierSync] Skipped. Customer tiers are managed manually.');
  }
}
