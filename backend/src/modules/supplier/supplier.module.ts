import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { Supplier } from './entities/supplier.entity';
import { SupplierProduct } from './entities/supplier-product.entity';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { SupplierPortalController } from './supplier-portal.controller';

@Module({
  imports: [TenantTypeOrmModule.forFeature([Supplier, SupplierProduct])],
  controllers: [SupplierController, SupplierPortalController],
  providers: [SupplierService],
  exports: [SupplierService],
})
export class SupplierModule {}
