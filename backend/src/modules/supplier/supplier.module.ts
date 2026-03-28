import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { SupplierProduct } from './entities/supplier-product.entity';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { SupplierPortalController } from './supplier-portal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, SupplierProduct])],
  controllers: [SupplierController, SupplierPortalController],
  providers: [SupplierService],
  exports: [SupplierService],
})
export class SupplierModule {}
