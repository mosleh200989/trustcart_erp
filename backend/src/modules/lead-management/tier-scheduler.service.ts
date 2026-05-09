import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeadManagementService } from './lead-management.service';

/**
 * Nightly scheduled job that auto-assigns / upgrades customer tiers
 * based on the number of delivered orders.
 *
 * Schedule: 03:00 AM Dhaka time (UTC+6) = 21:00 UTC
 *
 * Tier rules:
 *   1 delivered order  → new
 *   2                  → repeat
 *   3                  → silver
 *   4                  → gold
 *   5                  → platinum
 *   6+                 → vip
 *
 * Safety:
 *   - Never downgrades a tier
 *   - Never touches manually-set tiers (auto_assigned = false)
 *   - Never touches blacklist / rejected customers
 */
@Injectable()
export class TierSchedulerService {
  private readonly logger = new Logger(TierSchedulerService.name);

  constructor(private readonly leadManagementService: LeadManagementService) {}

  // 21:00 UTC every day = 03:00 AM Dhaka (UTC+6)
  @Cron('0 21 * * *', { timeZone: 'UTC' })
  async runNightlyTierSync(): Promise<void> {
    this.logger.log('[TierSync] Starting nightly customer tier sync (03:00 AM Dhaka)…');
    const start = Date.now();
    try {
      const result = await this.leadManagementService.bulkAutoAssignTiers();
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      this.logger.log(
        `[TierSync] Completed in ${elapsed}s — ` +
        `inserted: ${result.inserted}, upgraded: ${result.upgraded}`,
      );
    } catch (err) {
      this.logger.error('[TierSync] Nightly tier sync failed', (err as Error)?.stack);
    }
  }
}
