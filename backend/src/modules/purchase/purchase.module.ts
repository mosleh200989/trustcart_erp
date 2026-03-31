import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceivedNote } from './entities/goods-received-note.entity';
import { GrnItem } from './entities/grn-item.entity';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TenantTypeOrmModule.forFeature([PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GrnItem]),
    InventoryModule,
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
