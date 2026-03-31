import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentTransaction } from './payment-transaction.entity';
import { SalesOrder } from '../sales/sales-order.entity';

@Module({
  imports: [
    ConfigModule,
    TenantTypeOrmModule.forFeature([PaymentTransaction, SalesOrder]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
