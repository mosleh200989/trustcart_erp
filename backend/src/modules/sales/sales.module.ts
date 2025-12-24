import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesOrder } from './sales-order.entity';
import { SalesOrderItem } from './sales-order-item.entity';
import { OrderManagementService } from './order-management.service';
import { OrderManagementController } from './order-management.controller';
import { OrderItem } from './entities/order-item.entity';
import { OrderActivityLog } from './entities/order-activity-log.entity';
import { CourierTrackingHistory } from './entities/courier-tracking-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesOrder,
      SalesOrderItem,
      OrderItem,
      OrderActivityLog,
      CourierTrackingHistory,
    ])
  ],
  controllers: [SalesController, OrderManagementController],
  providers: [SalesService, OrderManagementService],
  exports: [SalesService, OrderManagementService],
})
export class SalesModule {}
