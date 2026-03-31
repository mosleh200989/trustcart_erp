import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { InventoryService } from './inventory.service';
import { StockMovementService } from './stock-movement.service';
import { InventoryController } from './inventory.controller';
import { StockLevel } from './entities/stock-level.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockBatch } from './entities/stock-batch.entity';
import { StockReservation } from './entities/stock-reservation.entity';
import { StockAlert } from './entities/stock-alert.entity';
import { StockTransfer } from './entities/stock-transfer.entity';
import { StockTransferItem } from './entities/stock-transfer-item.entity';
import { StockAdjustment } from './entities/stock-adjustment.entity';
import { StockAdjustmentItem } from './entities/stock-adjustment-item.entity';
import { InventoryCount } from './entities/inventory-count.entity';
import { InventoryCountItem } from './entities/inventory-count-item.entity';
import { ReorderRule } from './entities/reorder-rule.entity';
import { DemandForecast } from './entities/demand-forecast.entity';

@Module({
  imports: [
    TenantTypeOrmModule.forFeature([
      StockLevel,
      StockMovement,
      StockBatch,
      StockReservation,
      StockAlert,
      StockTransfer,
      StockTransferItem,
      StockAdjustment,
      StockAdjustmentItem,
      InventoryCount,
      InventoryCountItem,
      ReorderRule,
      DemandForecast,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, StockMovementService],
  exports: [InventoryService, StockMovementService],
})
export class InventoryModule implements OnModuleInit {
  private readonly logger = new Logger('InventoryModule');
  private cleanupInterval: ReturnType<typeof setInterval>;
  private reorderInterval: ReturnType<typeof setInterval>;
  private expiryInterval: ReturnType<typeof setInterval>;

  constructor(private readonly inventoryService: InventoryService) {}

  onModuleInit() {
    // Run expired reservation cleanup every 5 minutes
    this.cleanupInterval = setInterval(async () => {
      try {
        const released = await this.inventoryService.releaseExpiredReservations();
        if (released > 0) {
          this.logger.log(`Released ${released} expired stock reservation(s)`);
        }
      } catch (err: any) {
        this.logger.warn(`Reservation cleanup failed: ${err?.message}`);
      }
    }, 5 * 60 * 1000);

    // Run reorder point evaluation every 4 hours
    this.reorderInterval = setInterval(async () => {
      try {
        const result = await this.inventoryService.evaluateReorderPoints();
        if (result.alertsCreated > 0 || result.posCreated > 0) {
          this.logger.log(`Reorder eval: ${result.alertsCreated} alert(s), ${result.posCreated} PO(s) created`);
        }
      } catch (err: any) {
        this.logger.warn(`Reorder evaluation failed: ${err?.message}`);
      }
    }, 4 * 60 * 60 * 1000);

    // Run batch expiry check every 24 hours
    this.expiryInterval = setInterval(async () => {
      try {
        const alertsCreated = await this.inventoryService.checkExpiryAlerts();
        if (alertsCreated > 0) {
          this.logger.log(`Expiry check: ${alertsCreated} alert(s) created`);
        }
      } catch (err: any) {
        this.logger.warn(`Expiry check failed: ${err?.message}`);
      }
    }, 24 * 60 * 60 * 1000);

    // Also run both checks once at startup (after 30s delay to let DB warm up)
    setTimeout(async () => {
      try {
        await this.inventoryService.evaluateReorderPoints();
        await this.inventoryService.checkExpiryAlerts();
      } catch (err: any) {
        this.logger.warn(`Startup inventory checks failed: ${err?.message}`);
      }
    }, 30 * 1000);
  }
}
