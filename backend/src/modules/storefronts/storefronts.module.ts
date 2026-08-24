import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorefrontsController } from './storefronts.controller';
import { StorefrontsService } from './storefronts.service';
import { StorefrontDomainsController } from './storefront-domains.controller';
import { StorefrontDomainsService } from './storefront-domains.service';
import { Storefront } from './storefront.entity';
import { StorefrontCategory } from './storefront-category.entity';
import { StorefrontProduct } from './storefront-product.entity';
import { StorefrontDomain } from './storefront-domain.entity';
import { Product } from '../products/product.entity';
import { LandingPage } from '../landing-pages/landing-page.entity';
import { SalesOrder } from '../sales/sales-order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Storefront,
      StorefrontCategory,
      StorefrontProduct,
      StorefrontDomain,
      Product,
      LandingPage,
      SalesOrder,
    ]),
  ],
  controllers: [StorefrontsController, StorefrontDomainsController],
  providers: [StorefrontsService, StorefrontDomainsService],
  exports: [StorefrontsService, StorefrontDomainsService, TypeOrmModule],
})
export class StorefrontsModule {}
