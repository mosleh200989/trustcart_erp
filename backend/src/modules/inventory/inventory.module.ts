import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, StockMovementService],
  exports: [InventoryService, StockMovementService],
})
export class InventoryModule {}
