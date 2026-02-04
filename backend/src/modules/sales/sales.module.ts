import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesOrder } from './sales-order.entity';
import { SalesOrderItem } from './sales-order-item.entity';
import { OrderManagementService } from './order-management.service';
import { OrderManagementController } from './order-management.controller';
import { OrderItem } from './entities/order-item.entity';
import { OrderActivityLog } from './entities/order-activity-log.entity';
import { CourierTrackingHistory } from './entities/courier-tracking-history.entity';
import { FraudCheck } from './entities/fraud-check.entity';
import { FraudCheckService } from './fraud-check.service';
import { FraudCheckController } from './fraud-check.controller';
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
    ConfigModule,
    TypeOrmModule.forFeature([
      SalesOrder,
      SalesOrderItem,
      OrderItem,
      OrderActivityLog,
      CourierTrackingHistory,
      FraudCheck,
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
  controllers: [SalesController, OrderManagementController, FraudCheckController],
  providers: [SalesService, OrderManagementService, FraudCheckService],
  exports: [SalesService, OrderManagementService, FraudCheckService],
})
export class SalesModule {}
