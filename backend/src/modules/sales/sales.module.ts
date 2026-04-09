import { Module, forwardRef } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
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
import { InventoryModule } from '../inventory/inventory.module';
import { LeadManagementModule } from '../lead-management/lead-management.module';
import { SteadfastWebhookGuard } from '../../common/guards/steadfast-webhook.guard';
import { PathaoWebhookGuard } from '../../common/guards/pathao-webhook.guard';
import { CouponCampaign } from './entities/coupon-campaign.entity';
import { CampaignCustomer } from './entities/campaign-customer.entity';
import { CouponService } from './coupon.service';
import { CouponController } from './coupon.controller';

@Module({
  imports: [
    ConfigModule,
    TenantTypeOrmModule.forFeature([
      SalesOrder,
      SalesOrderItem,
      OrderItem,
      OrderActivityLog,
      CourierTrackingHistory,
      FraudCheck,
      Product,
      User,
      CouponCampaign,
      CampaignCustomer,
    ]),
    CustomersModule,
    SpecialOffersModule,
    LoyaltyModule,
    OffersModule,
    MessagingModule,
    forwardRef(() => CrmModule),
    InventoryModule,
    forwardRef(() => LeadManagementModule),
  ],
  controllers: [SalesController, OrderManagementController, FraudCheckController, CouponController],
  providers: [SalesService, OrderManagementService, FraudCheckService, CouponService, SteadfastWebhookGuard, PathaoWebhookGuard],
  exports: [SalesService, OrderManagementService, FraudCheckService, CouponService],
})
export class SalesModule {}
