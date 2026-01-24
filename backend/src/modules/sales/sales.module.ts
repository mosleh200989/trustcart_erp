import { Module, forwardRef } from '@nestjs/common';
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
import { Product } from '../products/product.entity';
import { CustomersModule } from '../customers/customers.module';
import { SpecialOffersModule } from '../special-offers/special-offers.module';
import { User } from '../users/user.entity';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { OffersModule } from '../offers/offers.module';
import { MessagingModule } from '../messaging/messaging.module';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesOrder,
      SalesOrderItem,
      OrderItem,
      OrderActivityLog,
      CourierTrackingHistory,
      Product,
      User,
    ]),
    CustomersModule,
    SpecialOffersModule,
    LoyaltyModule,
    OffersModule,
    MessagingModule,
    forwardRef(() => CrmModule),
  ],
  controllers: [SalesController, OrderManagementController],
  providers: [SalesService, OrderManagementService],
  exports: [SalesService, OrderManagementService],
})
export class SalesModule {}
