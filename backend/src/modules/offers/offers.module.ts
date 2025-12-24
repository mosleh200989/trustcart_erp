import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { Offer } from './entities/offer.entity';
import { OfferCondition } from './entities/offer-condition.entity';
import { OfferReward } from './entities/offer-reward.entity';
import { OfferProduct } from './entities/offer-product.entity';
import { OfferCategory } from './entities/offer-category.entity';
import { OfferUsage } from './entities/offer-usage.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Offer,
      OfferCondition,
      OfferReward,
      OfferProduct,
      OfferCategory,
      OfferUsage,
    ]),
  ],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
