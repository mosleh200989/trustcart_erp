import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorefrontsController } from './storefronts.controller';
import { StorefrontsService } from './storefronts.service';
import { Storefront } from './storefront.entity';
import { StorefrontCategory } from './storefront-category.entity';
import { StorefrontProduct } from './storefront-product.entity';
import { Product } from '../products/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Storefront, StorefrontCategory, StorefrontProduct, Product]),
  ],
  controllers: [StorefrontsController],
  providers: [StorefrontsService],
  exports: [StorefrontsService, TypeOrmModule],
})
export class StorefrontsModule {}
