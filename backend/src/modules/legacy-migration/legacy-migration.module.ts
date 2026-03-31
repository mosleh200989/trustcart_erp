import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { LegacyMigrationService } from './legacy-migration.service';
import { LegacyMigrationController } from './legacy-migration.controller';
import { SalesOrder } from '../sales/sales-order.entity';
import { SalesOrderItem } from '../sales/sales-order-item.entity';
import { Customer } from '../customers/customer.entity';

@Module({
  imports: [
    TenantTypeOrmModule.forFeature([
      SalesOrder,
      SalesOrderItem,
      Customer,
    ]),
  ],
  controllers: [LegacyMigrationController],
  providers: [LegacyMigrationService],
  exports: [LegacyMigrationService],
})
export class LegacyMigrationModule {}
